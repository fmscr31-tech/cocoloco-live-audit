import { BaseConnector } from "./baseConnector";
import { receiveEvent } from "../eventBridge";
import { tikTokAdapter } from "./tiktokAdapter";
import { tikfinityAdapter } from "./tikfinityAdapter";
import { TIKTOK_CONFIG } from "../../config/tiktok";
import { eventBus } from "../eventBus";

/**
 * TikTok/TikFinity connector.
 *
 * WIN LIMPIA rule:
 * - Contexto/TikFinity is authoritative for deciding that a win happened.
 * - CocoLoco only receives the winner identity and applies the win.
 * - The chat text is NEVER compared with a configured answer.
 * - A normal CHAT event can never become a win by itself.
 *
 * Gift rule:
 * - A TikFinity gift notification is authoritative for the gift trigger.
 * - Gift identity is passed to the canonical gift/ability pipeline immediately.
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
            this.wsClient.send(JSON.stringify({
              action: "setUniqueId",
              uniqueId: this.connectionConfig?.username || "cocolococr"
            }));
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
    const eventType =
      data.event ||
      data.eventType ||
      rawPayload?.event ||
      rawPayload?.eventType ||
      rawPayload?.type ||
      "unknown";
    const innerData = rawPayload?.data || rawPayload;

    console.log(`[Tikfinity Connector] Event received: ${eventType}`);
    console.log("[TikFinity DEBUG] RAW EVENT", data);
    console.log("[TikFinity DEBUG] EVENT TYPE", eventType);

    // WIN LIMPIA: consume only an explicit external result signal.
    const winSignal = this._extractWinSignal(data, rawPayload, innerData, eventType);
    if (winSignal) {
      const winner = this._buildIdentityPayload(data, rawPayload, innerData, winSignal);
      console.log("[WIN LIMPIA EXTERNAL SIGNAL]", winner);
      eventBus.publish("win:detected", winner);

      // A dedicated WIN event is fully consumed here. If the external source
      // annotated a normal CHAT packet as a win, keep the chat visible but do
      // not let the chat parser reinterpret it.
      if (this._isDedicatedWinEvent(eventType, rawPayload, innerData)) return;
    }

    // GIFTS have their own authoritative pipeline and must be handled before
    // the generic TikTok adapter. No game-answer condition is involved.
    const isGiftEvent = this._isGiftEvent(data, rawPayload, innerData, eventType);
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
        username:
          innerData?.username ||
          innerData?.uniqueId ||
          innerData?.nickname ||
          innerData?.tikfinityUsername ||
          rawPayload?.username ||
          rawPayload?.uniqueId ||
          adaptedBase.username,
        userId:
          innerData?.userId ||
          innerData?.uniqueId ||
          innerData?.secUid ||
          rawPayload?.playerId ||
          rawPayload?.userId ||
          rawPayload?.uniqueId ||
          adaptedBase.userId,
        payload: rawPayload,
        playerId:
          rawPayload?.playerId ||
          innerData?.playerId ||
          innerData?.userId ||
          innerData?.uniqueId ||
          adaptedBase.userId,
        displayName:
          rawPayload?.displayName ||
          innerData?.displayName ||
          innerData?.nickname ||
          rawPayload?.username ||
          adaptedBase.username
      };
    }

    if (!adapted || adapted.type === "UNKNOWN") return;

    console.log("[EVENT TO MONITOR]", adapted);

    if (adapted.type === "WIN_LIMPIA") {
      const winner = this._buildIdentityPayload(data, rawPayload, innerData, true);
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

  _normalizeMarker(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  _isWinMarker(value) {
    if (value === true) return true;
    const marker = this._normalizeMarker(value);
    return [
      "win",
      "winner",
      "win_limpia",
      "winlimpia",
      "correct_answer",
      "correctanswer",
      "answer_correct",
      "context_win",
      "context_correct",
      "correct",
      "winner_detected",
      "win_detected"
    ].includes(marker) || marker.includes("win_limpia");
  }

  _isWinKey(key) {
    return /^(win|winner|winlimpia|win_limpia|iswin|is_win|winnerdetected|winner_detected|correctanswerdetected|correct_answer_detected|answercorrect|answer_correct|contextwin|context_win|contextcorrect|context_correct|iswinner|is_winner)$/i.test(String(key || ""));
  }

  _findExplicitWinMarker(value, depth = 0) {
    if (!value || depth > 5 || typeof value !== "object") return false;

    if (Array.isArray(value)) {
      return value.some(item => this._findExplicitWinMarker(item, depth + 1));
    }

    for (const [key, child] of Object.entries(value)) {
      if (this._isWinKey(key)) {
        if (child === true || this._isWinMarker(child)) return true;
        // A winner object is itself an authoritative result marker.
        if (child && typeof child === "object" && Object.keys(child).length > 0) return true;
      }

      // Action/event/trigger fields are common in custom TikFinity events.
      if (/^(event|eventtype|event_name|action|actionname|action_name|trigger|triggername|trigger_name|command)$/i.test(key)) {
        if (this._isWinMarker(child)) return true;
      }

      if (child && typeof child === "object" && this._findExplicitWinMarker(child, depth + 1)) {
        return true;
      }
    }

    return false;
  }

  _extractWinSignal(data, rawPayload, innerData, eventType) {
    const normalizedType = this._normalizeMarker(eventType);

    const typeIsWin =
      this._isWinMarker(normalizedType) ||
      normalizedType.includes("win_limpia") ||
      normalizedType.includes("context_win") ||
      normalizedType.includes("correct_answer") ||
      normalizedType.includes("answer_correct");

    if (typeIsWin) return true;

    // This is deliberately structural. It never examines the chat/comment text.
    // It only accepts an explicit win/result marker supplied by the external
    // source.
    return [data, rawPayload, innerData].some(payload => this._findExplicitWinMarker(payload));
  }

  _isDedicatedWinEvent(eventType, rawPayload, innerData) {
    const normalizedType = this._normalizeMarker(eventType);
    if (
      normalizedType.includes("win") ||
      normalizedType.includes("winner") ||
      normalizedType.includes("correct_answer") ||
      normalizedType.includes("answer_correct") ||
      normalizedType.includes("context_win")
    ) return true;

    const explicitEvent =
      rawPayload?.event ||
      rawPayload?.eventType ||
      rawPayload?.type ||
      innerData?.event ||
      innerData?.eventType ||
      innerData?.type;

    return this._normalizeMarker(explicitEvent).includes("win");
  }

  _getWinnerObject(data, rawPayload, innerData) {
    const candidates = [
      data?.winner,
      rawPayload?.winner,
      innerData?.winner,
      data?.winnerData,
      rawPayload?.winnerData,
      innerData?.winnerData,
      data?.winningPlayer,
      rawPayload?.winningPlayer,
      innerData?.winningPlayer
    ];

    return candidates.find(value => value && typeof value === "object") || {};
  }

  _buildIdentityPayload(data, rawPayload, innerData, winSignal = false) {
    const winner = this._getWinnerObject(data, rawPayload, innerData);

    const playerId =
      winner.playerId ||
      winner.userId ||
      winner.tiktokId ||
      winner.id ||
      rawPayload?.playerId ||
      rawPayload?.userId ||
      innerData?.playerId ||
      innerData?.userId ||
      innerData?.uniqueId ||
      rawPayload?.uniqueId ||
      data?.playerId ||
      data?.userId ||
      data?.uniqueId ||
      rawPayload?.username ||
      innerData?.username ||
      "";

    const username =
      winner.username ||
      winner.uniqueId ||
      winner.tikfinityUsername ||
      rawPayload?.username ||
      rawPayload?.uniqueId ||
      innerData?.uniqueId ||
      innerData?.username ||
      innerData?.tikfinityUsername ||
      data?.username ||
      data?.uniqueId ||
      "";

    const displayName =
      winner.displayName ||
      winner.nickname ||
      rawPayload?.displayName ||
      innerData?.displayName ||
      innerData?.nickname ||
      data?.displayName ||
      username ||
      "Jugador";

    return {
      type: "WIN_LIMPIA",
      winLimpia: true,
      playerId,
      userId: winner.userId || rawPayload?.userId || innerData?.userId || playerId,
      username,
      displayName,
      avatar:
        winner.avatar ||
        winner.profilePictureUrl ||
        rawPayload?.avatar ||
        rawPayload?.profilePictureUrl ||
        innerData?.avatar ||
        innerData?.profilePictureUrl ||
        "",
      comment: rawPayload?.comment || innerData?.comment || rawPayload?.message || innerData?.message || "",
      source: "EXTERNAL_WIN_SIGNAL",
      originalEventType:
        rawPayload?.event ||
        rawPayload?.eventType ||
        data?.event ||
        data?.eventType ||
        "WIN_LIMPIA",
      timestamp: Date.now()
    };
  }

  _isGiftEvent(data, rawPayload, innerData, eventType) {
    const type = String(eventType || "").toLowerCase();
    return (
      type.includes("gift") ||
      type === "sendgift" ||
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
      rawPayload?.type === "gift"
    );
  }

  _standardizeEventType(rawType) {
    const t = String(rawType || "").toUpperCase().replace(/[-\s]+/g, "_");

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
      case "CONTEXT_CORRECT":
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
        this.sendRawEvent({
          event: "GIFT",
          uniqueId: user,
          giftName: gift,
          diamondCount: gift === "STAR" ? 1 : 10,
          repeatCount: 1
        });
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

// Optional authoritative integration hook for the Interactive Context/TikFinity
// bridge. It accepts winner identity only; it has no answer field by design.
if (typeof window !== "undefined") {
  window.__cocoWinLimpia = (winner = {}) => {
    const payload = {
      type: "WIN_LIMPIA",
      winLimpia: true,
      playerId: winner.playerId || winner.userId || winner.tiktokId || winner.id || "",
      userId: winner.userId || winner.playerId || winner.tiktokId || winner.id || "",
      username: winner.username || winner.uniqueId || "",
      displayName: winner.displayName || winner.nickname || winner.username || winner.uniqueId || "Jugador",
      avatar: winner.avatar || winner.profilePictureUrl || "",
      source: "INTERACTIVE_CONTEXT",
      timestamp: Date.now()
    };

    console.log("[WIN LIMPIA CONTEXT HOOK]", payload);
    eventBus.publish("win:detected", payload);
    return payload;
  };
}
