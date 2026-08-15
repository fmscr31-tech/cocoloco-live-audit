/**
 * Core Event Bus: Centralized, decoupled pub/sub messaging system for inter-module communication.
 * Supports cross-window / cross-tab synchronization via BroadcastChannel.
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
    if (typeof window !== "undefined" && window.BroadcastChannel) {
      try {
        this.bc = new BroadcastChannel("cocoloco_live_bus_v2");
        this.bc.onmessage = (event) => {
          const { eventName, payload } = event.data || {};
          if (eventName) {
            this._emitLocal(eventName, payload, true);
          }
        };
      } catch (e) {
        console.warn("[EventBus] BroadcastChannel not available:", e);
      }
    }
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
    
    // Prevent duplicate exact callback registrations
    if (!subSet.has(callback)) {
      subSet.add(callback);
    }

    // Return unsubscribe function for convenience
    return () => this.unsubscribe(eventName, callback);
  }

  /**
   * Unsubscribes a callback function from a specific event name.
   */
  unsubscribe(eventName, callback) {
    if (!eventName || !this.listeners.has(eventName)) return;
    const subSet = this.listeners.get(eventName);
    subSet.delete(callback);
    if (subSet.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  /**
   * Emits an event with a payload locally and broadcasts across windows/tabs.
   */
  emit(eventName, payload, isRemote = false) {
    this._emitLocal(eventName, payload, isRemote);
    if (!isRemote && this.bc) {
      try {
        this.bc.postMessage({ eventName, payload });
      } catch (e) {
        // Handle serialization errors gracefully
      }
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

  /**
   * Publishes an event (alias to emit for compatibility).
   */
  publish(eventName, payload) {
    return this.emit(eventName, payload);
  }

  /**
   * Subscribes a callback to an event name for a single emission only.
   */
  once(eventName, callback) {
    const wrapper = (payload) => {
      this.unsubscribe(eventName, wrapper);
      callback(payload);
    };
    return this.subscribe(eventName, wrapper);
  }

  /**
   * Clears all listeners for a given event name, or all listeners if no name is provided.
   */
  clear(eventName) {
    if (eventName) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
    }
  }
}

export const eventBus = new EventBus();
