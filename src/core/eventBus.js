/**
 * Core Event Bus: Centralized, decoupled pub/sub messaging system for inter-module communication.
 * Supports cross-window / cross-tab synchronization via BroadcastChannel with a
 * localStorage fallback for browser-source overlays.
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
    this.seenMessages = new Set();
    this.storageKey = "cocoloco_live_bus_v2_message";

    if (typeof window !== "undefined") {
      if (window.BroadcastChannel) {
        try {
          this.bc = new BroadcastChannel("cocoloco_live_bus_v2");
          this.bc.onmessage = (event) => {
            const message = event.data || {};
            this._receiveRemote(message);
          };
        } catch (e) {
          console.warn("[EventBus] BroadcastChannel not available:", e);
        }
      }

      // Browser-source overlays can run in a separate window/context where the
      // BroadcastChannel path is unavailable or unreliable. The storage event
      // is a second transport and fires only in OTHER same-origin windows.
      try {
        window.addEventListener("storage", (event) => {
          if (event.key !== this.storageKey || !event.newValue) return;
          try {
            this._receiveRemote(JSON.parse(event.newValue));
          } catch (error) {
            console.warn("[EventBus] Invalid storage message:", error);
          }
        });
      } catch (e) {
        console.warn("[EventBus] Storage event fallback unavailable:", e);
      }
    }
  }

  isCrossWindowEvent(eventName) {
    // These events are part of the live overlay's authoritative state path.
    // Registration, round lifecycle and timer events MUST cross the browser
    // boundary just like score/gift/effect events. Without this, the admin can
    // update in real time while a separate OBS/browser-source overlay remains
    // stale until F5.
    return (
      eventName === "game:score_updated" ||
      eventName === "win:correct" ||
      eventName === "overlay:win" ||
      eventName === "ability:started" ||
      eventName === "ability:finished" ||
      eventName === "gift:action_dispatched" ||
      eventName === "effect:activated" ||
      eventName === "effect:updated" ||
      eventName === "effect:removed" ||
      eventName === "effect:expired" ||
      eventName === "player:highlight" ||
      eventName === "player:created" ||
      eventName === "player:updated" ||
      eventName === "PLAYER_CREATED" ||
      eventName === "registration:state_synced" ||
      eventName === "registration:updated" ||
      eventName === "registration:opened" ||
      eventName === "registration:closed" ||
      eventName === "registration:locked" ||
      eventName === "registration:cleared" ||
      eventName === "registration:player_registered" ||
      eventName === "registration:player_removed" ||
      eventName === "players:reset" ||
      eventName === "round:started" ||
      eventName === "ROUND_STARTED" ||
      eventName === "round:finished" ||
      eventName === "round:answer_snapshot" ||
      eventName === "timer:started" ||
      eventName === "timer:tick" ||
      eventName === "timer:paused" ||
      eventName === "timer:resumed" ||
      eventName === "timer:stopped" ||
      eventName === "timer:reset" ||
      eventName === "GAME_MODE_CHANGED" ||
      eventName === "SESSION_STATUS_CHANGED"
    );
  }

  createMessageId(eventName) {
    return `${eventName}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  _receiveRemote(message) {
    const { eventName, payload, messageId } = message || {};
    if (!eventName) return;

    // BroadcastChannel and storage fallback can deliver the same event. Ignore
    // the duplicate while still allowing genuinely separate events immediately.
    if (messageId) {
      if (this.seenMessages.has(messageId)) return;
      this.seenMessages.add(messageId);
      if (this.seenMessages.size > 500) {
        const oldest = this.seenMessages.values().next().value;
        this.seenMessages.delete(oldest);
      }
    }

    console.log("[EventBus REMOTE]", eventName, payload);
    this._emitLocal(eventName, payload, true);
  }

  /**
   * Subscribes a callback function to a specific event name with duplicate subscription protection.
   */
  subscribe(eventName, callback) {
    if (!eventName || typeof callback !== "function") return;
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    const subSet = this.listeners.get(eventName);

    if (!subSet.has(callback)) {
      subSet.add(callback);
    }

    return () => this.unsubscribe(eventName, callback);
  }

  unsubscribe(eventName, callback) {
    if (!eventName || !this.listeners.has(eventName)) return;
    const subSet = this.listeners.get(eventName);
    subSet.delete(callback);
    if (subSet.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  /**
   * Emits an event locally and, for overlay-critical events, across browser
   * windows/tabs through both BroadcastChannel and a storage fallback.
   */
  emit(eventName, payload, isRemote = false) {
    this._emitLocal(eventName, payload, isRemote);

    if (isRemote || typeof window === "undefined" || !this.isCrossWindowEvent(eventName)) {
      return;
    }

    const messageId = this.createMessageId(eventName);
    this.seenMessages.add(messageId);
    const message = { eventName, payload, messageId, timestamp: Date.now() };

    if (this.bc) {
      try {
        this.bc.postMessage(message);
      } catch (e) {
        console.warn("[EventBus] BroadcastChannel send failed:", e);
      }
    }

    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(message));
    } catch (e) {
      console.warn("[EventBus] Storage fallback send failed:", e);
    }
  }

  _emitLocal(eventName, payload, isRemote) {
    if (!eventName || !this.listeners.has(eventName)) return;
    const subSet = this.listeners.get(eventName);
    subSet.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error(`Error in event listener for [${eventName}]:`, error);
      }
    });
  }

  publish(eventName, payload) {
    return this.emit(eventName, payload);
  }

  once(eventName, callback) {
    const wrapper = (payload) => {
      this.unsubscribe(eventName, wrapper);
      callback(payload);
    };
    return this.subscribe(eventName, wrapper);
  }

  clear(eventName) {
    if (eventName) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
    }
  }
}

export const eventBus = new EventBus();
