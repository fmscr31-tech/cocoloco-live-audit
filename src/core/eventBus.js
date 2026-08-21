/**
 * CocoLoco V2 Event Bus.
 *
 * The game logic and UI contract are unchanged. Only the cross-window transport
 * is replaced: V2 uses a server-backed SSE channel instead of BroadcastChannel
 * as the primary transport. This allows the same overlay URL to run inside
 * TikTok LIVE Studio's Link/Web source without depending on browser-window
 * coordination.
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
    this.seenMessages = new Set();
    this.startedAt = Date.now();
    this.transientEvents = new Set([
      "win:detected","win:correct","overlay:win","game:winner_detected","game:objective_completed",
      "round:winner_popup","round:finished","overlay:round_completed","ability:started","ability:finished","ability:score_executed",
      "gift:action_dispatched","gift:points_awarded","gift:round_awarded",
      "effect:activated","effect:updated","effect:removed","effect:expired",
      "powerup:activated","powerup:expired","powerup:removed","player:highlight","cocazo:trigger"
    ]);
    this.crossWindowEvents = new Set([
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
    ]);
    this.transportSource = null;

    if (typeof window !== "undefined") this._connectSseTransport();
  }

  _connectSseTransport() {
    if (typeof window.EventSource === "undefined") {
      console.error("[EventBus V2] EventSource is unavailable; cross-window transport cannot start.");
      return;
    }

    const endpoint = "/api/live/events";
    const source = new EventSource(endpoint);
    this.transportSource = source;

    source.addEventListener("cocoloco", (event) => {
      try {
        const message = JSON.parse(event.data || "{}");
        if (message.kind === "eventBus") {
          this._receiveRemote(message);
          return;
        }
        // Raw TikTok/TikFinity packets continue through the existing connector
        // contract. This keeps the game behavior identical while changing only
        // the browser-to-server transport.
        if (message.type === "event") {
          this._emitLocal("transport:event", message, true);
        }
      } catch (error) {
        console.warn("[EventBus V2] Invalid SSE message", error);
      }
    });

    source.onopen = () => {
      console.log("[EventBus V2] SSE transport connected", endpoint);
    };
    source.onerror = () => {
      console.warn("[EventBus V2] SSE transport reconnecting...");
    };
  }

  isCrossWindowEvent(eventName) {
    return this.crossWindowEvents.has(eventName);
  }

  createMessageId(eventName) {
    return `${eventName}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  _receiveRemote(message) {
    const { eventName, payload, messageId, timestamp } = message || {};
    if (!eventName) return;
    if (messageId) {
      if (this.seenMessages.has(messageId)) return;
      this.seenMessages.add(messageId);
      if (this.seenMessages.size > 1000) this.seenMessages.delete(this.seenMessages.values().next().value);
    }
    if (this.transientEvents.has(eventName) && Number.isFinite(Number(timestamp)) && Number(timestamp) < this.startedAt) {
      console.log("[EventBus V2] Ignored stale transient event after overlay reload:", eventName, timestamp, this.startedAt);
      return;
    }
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

    // The V2 transport is intentionally HTTP-based. The overlay receives the
    // resulting event through SSE, so no BroadcastChannel or localhost WebSocket
    // is required between the admin window and TikTok LIVE Studio.
    fetch("/api/live/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
      keepalive: true
    }).catch((error) => {
      console.warn("[EventBus V2] Failed to publish event to SSE gateway", error);
    });
  }

  _emitLocal(eventName, payload, isRemote) {
    const set = this.listeners.get(eventName);
    if (!set) return;
    set.forEach((callback) => {
      try { callback(payload, isRemote); }
      catch (error) { console.error(`Error in event listener for [${eventName}]:`, error); }
    });
  }

  publish(eventName, payload) { return this.emit(eventName, payload); }

  once(eventName, callback) {
    const wrapper = (payload, remote) => {
      this.unsubscribe(eventName, wrapper);
      callback(payload, remote);
    };
    return this.subscribe(eventName, wrapper);
  }

  clear(eventName) {
    if (eventName) this.listeners.delete(eventName);
    else this.listeners.clear();
  }
}

export const eventBus = new EventBus();
