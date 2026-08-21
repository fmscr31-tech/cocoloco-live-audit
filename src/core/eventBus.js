/**
 * Core Event Bus: centralized pub/sub messaging with reliable cross-window sync.
 * Browser-source overlays run in a different window from the Admin panel.
 *
 * IMPORTANT: BroadcastChannel and localStorage events are origin-scoped. The
 * TikTok Live Studio overlay is loaded from 127.0.0.1.nip.io while the Admin
 * normally runs on localhost, so those browser primitives cannot cross that
 * boundary. The local Bridge WebSocket is therefore used as a same-machine
 * transport in addition to the existing browser transports.
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
    this.seenMessages = new Set();
    this.storageKey = "cocoloco_live_bus_v2_message";
    this.websocketUrl = null;
    this.ws = null;
    this.wsReconnectTimer = null;
    this.wsReconnectAttempts = 0;
    this.startedAt = Date.now();
    this.transientEvents = new Set([
      "win:detected","win:correct","overlay:win","game:winner_detected","game:objective_completed",
      "round:winner_popup","round:finished","overlay:round_completed","ability:started","ability:finished","ability:score_executed",
      "gift:action_dispatched","gift:points_awarded","gift:round_awarded",
      "effect:activated","effect:updated","effect:removed","effect:expired",
      "powerup:activated","powerup:expired","powerup:removed","player:highlight","cocazo:trigger"
    ]);

    if (typeof window !== "undefined") {
      if (window.BroadcastChannel) {
        try {
          this.bc = new BroadcastChannel("cocoloco_live_bus_v2");
          this.bc.onmessage = (event) => this._receiveRemote(event.data || {});
        } catch (e) {
          console.warn("[EventBus] BroadcastChannel not available:", e);
        }
      }

      try {
        window.addEventListener("storage", (event) => {
          if (event.key !== this.storageKey || !event.newValue) return;
          try { this._receiveRemote(JSON.parse(event.newValue)); } catch (e) {}
        });
      } catch (e) {}

      this._connectBridgeWebSocket();
    }
  }

  isCrossWindowEvent(eventName) {
    return new Set([
      "dashboard:snapshot","game:score_updated","game:winner_detected","game:objective_completed",
      "win:detected","win:correct","overlay:win","ability:started","ability:finished","ability:score_executed",
      "gift:action_dispatched","gift:points_awarded","gift:round_awarded",
      "effect:activated","effect:updated","effect:removed","effect:expired",
      "powerup:activated","powerup:expired","powerup:removed","player:highlight",
      "player:created","player:updated","PLAYER_CREATED","players:reset","team:updated","teams:updated",
      "team:created","team:removed","mvp:contribution_pending","mvp:gift_contribution","mvp:recipient_selected",
      "registration:state_synced","registration:updated","registration:opened","registration:closed","registration:locked",
      "registration:cleared","registration:player_registered","registration:player_removed","round:started","ROUND_STARTED",
      "round:finished","round:winner_popup","round:answer_snapshot","overlay:round_completed","timer:started","timer:tick",
      "timer:paused","timer:resumed","timer:stopped","timer:reset","GAME_MODE_CHANGED","SESSION_STATUS_CHANGED",
      "live:phase_changed","session:started","session:updated","session:ended","reward:processed","config:command_updated",
      "cocazo:trigger"
    ]).has(eventName);
  }

  createMessageId(eventName) {
    return `${eventName}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  _getBridgeWebSocketUrl() {
    if (typeof window === "undefined" || !window.location) return null;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const hostname = window.location.hostname || "localhost";
    return `${protocol}//${hostname}:8080`;
  }

  _connectBridgeWebSocket() {
    if (typeof window === "undefined" || typeof window.WebSocket === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    this.websocketUrl = this._getBridgeWebSocketUrl();
    if (!this.websocketUrl) return;

    try {
      const ws = new WebSocket(this.websocketUrl);
      this.ws = ws;

      ws.onopen = () => {
        this.wsReconnectAttempts = 0;
        console.log(`[EventBus] Bridge WebSocket connected: ${this.websocketUrl}`);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data || "{}");
          if (message?.type === "event") this._receiveRemote(message.message || message);
        } catch (error) {
          console.warn("[EventBus] Invalid Bridge WebSocket message:", error);
        }
      };

      ws.onerror = () => {
        // The browser transports remain active; WebSocket is the cross-origin
        // transport required by the localhost <-> nip.io overlay pair.
      };

      ws.onclose = () => {
        if (this.ws === ws) this.ws = null;
        const delay = Math.min(5000, 500 * Math.max(1, 2 ** this.wsReconnectAttempts));
        this.wsReconnectAttempts = Math.min(this.wsReconnectAttempts + 1, 4);
        clearTimeout(this.wsReconnectTimer);
        this.wsReconnectTimer = setTimeout(() => this._connectBridgeWebSocket(), delay);
      };
    } catch (error) {
      console.warn("[EventBus] Bridge WebSocket connection failed:", error);
    }
  }

  _sendThroughBridge(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this._connectBridgeWebSocket();
      return false;
    }
    try {
      this.ws.send(JSON.stringify({ action: "eventBus", message }));
      return true;
    } catch (error) {
      console.warn("[EventBus] Failed to relay event through Bridge WebSocket:", error);
      return false;
    }
  }

  _receiveRemote(message) {
    const { eventName, payload, messageId, timestamp } = message || {};
    if (!eventName) return;
    if (messageId) {
      if (this.seenMessages.has(messageId)) return;
      this.seenMessages.add(messageId);
      if (this.seenMessages.size > 500) this.seenMessages.delete(this.seenMessages.values().next().value);
    }
    if (this.transientEvents.has(eventName) && Number.isFinite(Number(timestamp)) && Number(timestamp) < this.startedAt) {
      console.log("[EventBus] Ignored stale transient event after overlay reload:", eventName, timestamp, this.startedAt);
      return;
    }
    console.log("[EventBus REMOTE]", eventName, payload);
    this._emitLocal(eventName, payload, true);
  }

  subscribe(eventName, callback) {
    if (!eventName || typeof callback !== "function") return;
    if (!this.listeners.has(eventName)) this.listeners.set(eventName, new Set());
    const set = this.listeners.get(eventName);
    set.add(callback);
    return () => this.unsubscribe(eventName, callback);
  }

  unsubscribe(eventName, callback) {
    const set = this.listeners.get(eventName);
    if (!set) return;
    set.delete(callback);
    if (!set.size) this.listeners.delete(eventName);
  }

  emit(eventName, payload, isRemote = false) {
    this._emitLocal(eventName, payload, isRemote);
    if (isRemote || typeof window === "undefined" || !this.isCrossWindowEvent(eventName)) return;

    const messageId = this.createMessageId(eventName);
    this.seenMessages.add(messageId);
    const message = { eventName, payload, messageId, timestamp: Date.now() };

    // Keep the existing same-origin transports for normal browser windows.
    if (this.bc) {
      try { this.bc.postMessage(message); } catch (e) {}
    }
    try { window.localStorage.setItem(this.storageKey, JSON.stringify(message)); } catch (e) {}

    // Also relay through the local Bridge so localhost and nip.io are treated
    // as one application even though they are different browser origins.
    this._sendThroughBridge(message);
  }

  _emitLocal(eventName, payload, isRemote) {
    const set = this.listeners.get(eventName);
    if (!set) return;
    set.forEach(callback => {
      try { callback(payload, isRemote); }
      catch (error) { console.error(`Error in event listener for [${eventName}]:`, error); }
    });
  }

  publish(eventName, payload) { return this.emit(eventName, payload); }

  once(eventName, callback) {
    const wrapper = (payload, remote) => { this.unsubscribe(eventName, wrapper); callback(payload, remote); };
    return this.subscribe(eventName, wrapper);
  }

  clear(eventName) {
    if (eventName) this.listeners.delete(eventName);
    else this.listeners.clear();
  }
}

export const eventBus = new EventBus();
