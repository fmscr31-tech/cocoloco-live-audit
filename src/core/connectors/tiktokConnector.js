import { BaseConnector } from "./baseConnector";
import { receiveEvent } from "../eventBridge";
import { tikTokAdapter } from "./tiktokAdapter";
import { tikfinityAdapter } from "./tikfinityAdapter";
import { TIKTOK_CONFIG } from "../../config/tiktok";
import { eventBus } from "../eventBus";

/**
 * TikTok Connector: Implements BaseConnector for TikTok LIVE streaming platform integration.
 * Supports REAL_TIKTOK (via WebSocket bridge) and MOCK_TIKTOK mode with automatic reconnection,
 * heartbeat, protocol handling, and direct eventBridge.receiveEvent() and eventBus publishing routing.
 */
export class TikTokConnector extends BaseConnector {
  constructor() {
    super("TikTokConnector");
    this.connectionConfig = null;
    this.mockInterval = null;
    this.wsClient = null;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.status = "DISCONNECTED";
  }

  async connect(config = {}) {
    this.connectionConfig = { ...TIKTOK_CONFIG, ...config };
    const mode = this.connectionConfig.mode || "MOCK_TIKTOK";

    if (mode === "MOCK_TIKTOK") {
      this.status = "CONNECTING";
      return new Promise((resolve) => {
        setTimeout(() => {
          this.status = "CONNECTED";
          this.startMockMode();
          resolve(true);
        }, 300);
      });
    }

    return this._connectWebSocket();
  }

  _connectWebSocket() {
    this.status = this.status === "RECONNECTING" ? "RECONNECTING" : "CONNECTING";

    return new Promise((resolve, reject) => {
      try {
        const proxyUrl = this.connectionConfig?.proxyUrl || "ws://localhost:8080";
        console.log("[WS] Creating connection:", proxyUrl);
        this.wsClient = new WebSocket(proxyUrl);

        this.wsClient.onopen = () => {
          this.status = "CONNECTED";
          console.log("[WS] Connected");
          console.log("[Tikfinity Connector] Connected");
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          try {
            this.wsClient.send(JSON.stringify({ action: "setUniqueId", uniqueId: this.connectionConfig?.username || "cocolococr" }));
          } catch (e) {}

          this.startHeartbeat();
          resolve(true);
        };

        this.wsClient.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            this.handleMessage(data);
          } catch (e) {
            console.warn("[Tikfinity Connector] Ignoring invalid WebSocket JSON");
          }
        };

        this.wsClient.onerror = (err) => {
          this.status = "ERROR";
          console.log("[WS] Error", err);
          console.error("TikTok WebSocket error:", err);
        };

        this.wsClient.onclose = (e) => {
          console.log("[WS] Closed", e);
          this.stopHeartbeat();
          this.status = "RECONNECTING";
          this.scheduleReconnect();
        };
      } catch (error) {
        this.status = "ERROR";
        reject(error);
      }
    });
  }

  handleMessage(data) {
    console.log("[WS RAW RECEIVED]", data);
    if (!data || typeof data !== "object") return;

    if (data.type === "ping") {
      try {
        this.wsClient.send(JSON.stringify({ type: "pong" }));
      } catch (e) {}
      return;
    }

    if (data.type === "pong" || data.type === "status") return;

    const rawPayload = data.payload || data;
    const eventType = data.event || data.eventType || rawPayload?.event || rawPayload?.type || rawPayload?.eventType || "unknown";
    const innerData = rawPayload?.data || rawPayload;

    console.log(`[Tikfinity Connector] Event received: ${eventType}`);
    console.log("[TikFinity DEBUG] RAW EVENT", data);
    console.log("[TikFinity DEBUG] EVENT TYPE", eventType);

    // WIN LIMPIA is an authoritative external result. It must never be derived
    // by comparing the chat text with a locally stored answer. Contexto/TikFinity
    // can send an explicit winner event or annotate the originating chat event.
    const winSignal = this._extractWinSignal(data, rawPayload, innerData, eventType);
    if (winSignal) {
      const winner = this._buildIdentityPayload(rawPayload, innerData, winSignal);
      console.log("[WIN LIMPIA EXTERNAL SIGNAL]", winner);
      eventBus.publish("win:detected", winner);

      // If this message is also a normal chat event, keep forwarding the chat
      // for mirror-chat/registration purposes, but do not make chat text the
      // source of truth for scoring.
      if (String(eventType).toLowerCase() === "win" || String(eventType).toLowerCase().includes("win")) {
        return;
      }
    }

    const isGiftEvent =
      (eventType && (eventType.toLowerCase().includes("gift") || eventType.toLowerCase() === "sendgift")) ||
      innerData?.giftName ||
      innerData?.giftId ||
      innerData?.gift ||
      rawPayload?.giftName ||
      rawPayload?.giftId ||
      rawPayload?.gift ||
      data?.giftName ||
      data?.giftId ||
      data?.gift ||
      data?.type === "gift" ||
      rawPayload?.type === "gift";

    if (isGiftEvent) {
      console.log("[TikFinity DEBUG] GIFT PAYLOAD", JSON.stringify(rawPayload, null, 2));
      tikfinityAdapter.handleTikfinityPayload(rawPayload);
      return;
    }

    let adapted = null;
    const adaptedBase = tikTokAdapter.adaptEvent(innerData);
    if (adaptedBase) {
      adapted = {
        ...adaptedBase,
        type: this._standardizeEventType(eventType),
        username: innerData.username || innerData.uniqueId || innerData.nickname || innerData.tikfinityUsername || rawPayload?.username || rawPayload?.uniqueId || adaptedBase.username,
        userId: innerData.userId || innerData.uniqueId || innerData.secUid || rawPayload?.playerId || rawPayload?.userId || rawPayload?.uniqueId || adaptedBase.userId,
        payload: rawPayload,
        playerId: rawPayload?.playerId || innerData?.playerId || innerData?.userId || innerData?.uniqueId || adaptedBase.userId,
        displayName: rawPayload?.displayName || innerData?.displayName || innerData?.nickname || rawPayload?.username || adaptedBase.username
      };
    }

    if (adapted && adapted.type !== "UNKNOWN") {
      console.log("[EVENT TO MONITOR]", adapted);

      // WIN_LIMPIA is intentionally outside the normal CHAT command path.
      // The external winner signal already tells us who won.
      if (adapted.type === "WIN_LIMPIA") {
        const winner = this._buildIdentityPayload(rawPayload, innerData, true);
        eventBus.publish("win:detected", winner);
        return;
      }

      receiveEvent(adapted);
      this._dispatchToEventBus(adapted);
      console.log("[EVENT DEBUG BEFORE MONITOR]", JSON.stringify({
        eventType,
        type: adapted.type,
        payload: rawPayload,
        normalized: adapted
      }, null, 2));
      console.log("[Tikfinity Connector] Event forwarded to eventMonitor");
    }
  }

  _extractWinSignal(data, rawPayload, innerData, eventType) {
    const normalizedType = String(eventType || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
    const typeIsWin = ["win", "winner", "win_limpia", "winlimpia", "correct_answer", "correctanswer", "answer_correct", "context_win"].includes(normalizedType) || normalizedType.includes("win_limpia");

    const candidates = [
      data?.winLimpia,
      data?.isWinLimpia,
      data?.winner,
      data?.winnerDetected,
      data?.correctAnswerDetected,
      rawPayload?.winLimpia,
      rawPayload?.isWinLimpia,
      rawPayload?.winner,
      rawPayload?.winnerDetected,
      rawPayload?.correctAnswerDetected,
      innerData?.winLimpia,
      innerData?.isWinLimpia,
      innerData?.winner,
      innerData?.winnerDetected,
      innerData?.correctAnswerDetected
    ];

    return typeIsWin || candidates.some(value => value === true || String(value || "").toLowerCase() === "win_limpia");
  }

  _buildIdentityPayload(rawPayload, innerData, winSignal = false) {
    const userId =
      rawPayload?.playerId ||
      rawPayload?.userId ||
      innerData?.playerId ||
      innerData?.userId ||
      innerData?.uniqueId ||
      rawPayload?.uniqueId ||
      rawPayload?.username ||
      "";

    const username =
      rawPayload?.username ||
      rawPayload?.uniqueId ||
      innerData?.uniqueId ||
      innerData?.username ||
      innerData?.tikfinityUsername ||
      "";

    const displayName =
      rawPayload?.displayName ||
      innerData?.displayName ||
      innerData?.nickname ||
      username ||
      "Jugador";

    return {
      type: "WIN_LIMPIA",
      winLimpia: true,
      playerId: userId,
      userId,
      username,
      displayName,
      avatar: rawPayload?.avatar || rawPayload?.profilePictureUrl || innerData?.avatar || innerData?.profilePictureUrl || "",
      comment: rawPayload?.comment || innerData?.comment || rawPayload?.message || innerData?.message || "",
      source: "EXTERNAL_WIN_SIGNAL",
      originalEventType: rawPayload?.event || rawPayload?.eventType || data?.event || data?.eventType || "WIN_LIMPIA",
      timestamp: Date.now()
    };
  }

  _standardizeEventType(rawType) {
    const t = (rawType || "").toUpperCase();
    switch (t) {
      case "MEMBER":
      case "JOIN":
      case "ROOMUSER":
        return "JOIN";
      case "CHAT":
      case "MESSAGE":
        return "CHAT";
      case "GIFT":
      case "SENDGIFT":
      case "GIFTMESSAGE":
      case "WEBCASTGIFTISTMESSAGE":
      case "WEBCASTGIFT":
        return "GIFT";
      case "WIN":
      case "WINNER":
      case "WIN_LIMPIA":
      case "WINLIMPIA":
      case "CORRECT_ANSWER":
      case "CORRECTANSWER":
      case "ANSWER_CORRECT":
      case "CONTEXT_WIN":
        return "WIN_LIMPIA";
      case "LIKE":
        return "LIKE";
      case "SOCIAL":
      case "FOLLOW":
        return "FOLLOW";
      case "SHARE":
        return "SHARE";
      default:
        return t || "UNKNOWN";
    }
  }

  _dispatchToEventBus(adapted) {
    if (!adapted) return;

    const payload = adapted.payload || {};
    const nested = payload?.data || {};

    const playerId =
      payload.playerId ||
      payload.userId ||
      payload.uniqueId ||
      nested.playerId ||
      nested.userId ||
      nested.uniqueId ||
      adapted.playerId ||
      adapted.userId ||
      adapted.username;

    const username =
      payload.username ||
      payload.uniqueId ||
      nested.username ||
      nested.uniqueId ||
      adapted.username;

    const displayName =
      payload.displayName ||
      payload.nickname ||
      nested.displayName ||
      nested.nickname ||
      username;

    const message =
      payload.message ||
      payload.comment ||
      payload.chat ||
      nested.message ||
      nested.comment ||
      nested.chat ||
      "";

    if (adapted.type === "CHAT") {
      const normalizedChat = {
        type: "CHAT",
        playerId,
        userId: payload.userId || nested.userId || playerId,
        displayName,
        username,
        nickname: displayName,
        avatar:
          payload.avatar ||
          payload.profilePictureUrl ||
          nested.avatar ||
          nested.profilePictureUrl ||
          "",
        message,
        comment: message,
        timestamp: adapted.timestamp || Date.now()
      };

      console.log("[WIN LIMPIA CHAT DISPATCH]", normalizedChat);
      eventBus.publish("normalized:chat", normalizedChat);
    } else if (adapted.type === "JOIN") {
      eventBus.publish("normalized:join", {
        type: "JOIN",
        playerId,
        displayName,
        username,
        timestamp: adapted.timestamp
      });
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
        try {
          this.wsClient.send(JSON.stringify({ type: "ping" }));
        } catch (e) {}
      }
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.status === "RECONNECTING" && this.connectionConfig?.mode === "REAL_TIKTOK") {
        this._connectWebSocket().catch(() => {});
      }
    }, 5000);
  }

  async disconnect() {
    this.stopMockMode();
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.wsClient) {
      try { this.wsClient.close(); } catch (e) {}
      this.wsClient = null;
    }
    this.status = "DISCONNECTED";
    this.connectionConfig = null;
    return true;
  }

  sendRawEvent(rawEvent) {
    if (this.status !== "CONNECTED") {
      console.warn("TikTokConnector is not connected. Ignoring raw event:", rawEvent);
      return null;
    }
    const adapted = tikTokAdapter.adaptEvent(rawEvent);
    if (adapted) {
      receiveEvent(adapted);
      this._dispatchToEventBus(adapted);
      return adapted;
    }
    return null;
  }

  sendEvent(event) {
    return this.sendRawEvent(event);
  }

  startMockMode() {
    if (this.mockInterval) return;
    const mockUsers = ["TikTokFan_99", "LiveGamer", "CocoChamp", "ViewerX", "Pablo", "Ana"];
    const mockGifts = ["Rose", "Ice Cream", "Donut", "STAR", "Galaxy"];

    this.mockInterval = setInterval(() => {
      if (this.status !== "CONNECTED") return;
      const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
      const rand = Math.random();

      if (rand < 0.35) {
        this.sendRawEvent({ event: "CHAT", uniqueId: user, comment: "¡Excelente batalla!" });
      } else if (rand < 0.7) {
        const gift = mockGifts[Math.floor(Math.random() * mockGifts.length)];
        this.sendRawEvent({ event: "GIFT", uniqueId: user, giftName: gift, diamondCount: gift === "STAR" ? 1 : 10, repeatCount: 1 });
      } else if (rand < 0.85) {
        this.sendRawEvent({ event: "LIKE", uniqueId: user, likeCount: 10 });
      } else {
        this.sendRawEvent({ event: "JOIN", uniqueId: user });
      }
    }, 6000);
  }

  stopMockMode() {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  getStatus() {
    return {
      name: this.name,
      status: this.status
    };
  }
}

export const tikTokConnector = new TikTokConnector();
