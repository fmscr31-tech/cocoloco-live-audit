/**
 * Core Event Bus: centralized pub/sub messaging with reliable cross-window sync.
 * Browser-source overlays run in a different window from the Admin panel.
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
    this.seenMessages = new Set();
    this.storageKey = "cocoloco_live_bus_v2_message";
    if (typeof window !== "undefined") {
      if (window.BroadcastChannel) {
        try { this.bc = new BroadcastChannel("cocoloco_live_bus_v2"); this.bc.onmessage = (event) => this._receiveRemote(event.data || {}); }
        catch (e) { console.warn("[EventBus] BroadcastChannel not available:", e); }
      }
      try { window.addEventListener("storage", (event) => { if (event.key !== this.storageKey || !event.newValue) return; try { this._receiveRemote(JSON.parse(event.newValue)); } catch (e) {} }); } catch (e) {}
    }
  }
  isCrossWindowEvent(eventName) {
    return new Set(["dashboard:snapshot","game:score_updated","game:winner_detected","game:objective_completed","win:detected","win:correct","overlay:win","ability:started","ability:finished","gift:action_dispatched","effect:activated","effect:updated","effect:removed","effect:expired","powerup:activated","powerup:expired","powerup:removed","player:highlight","player:created","player:updated","PLAYER_CREATED","players:reset","team:updated","teams:updated","team:created","team:removed","mvp:contribution_pending","mvp:gift_contribution","mvp:recipient_selected","registration:state_synced","registration:updated","registration:opened","registration:closed","registration:locked","registration:cleared","registration:player_registered","registration:player_removed","round:started","ROUND_STARTED","round:finished","round:winner_popup","round:answer_snapshot","timer:started","timer:tick","timer:paused","timer:resumed","timer:stopped","timer:reset","GAME_MODE_CHANGED","SESSION_STATUS_CHANGED","live:phase_changed","session:started","session:updated","session:ended","reward:processed","config:command_updated","cocazo:trigger"]).has(eventName);
  }
  createMessageId(eventName) { return `${eventName}_${Date.now()}_${Math.random().toString(36).slice(2)}`; }
  _receiveRemote(message) {
    const { eventName, payload, messageId } = message || {}; if (!eventName) return;
    if (messageId) { if (this.seenMessages.has(messageId)) return; this.seenMessages.add(messageId); if (this.seenMessages.size > 500) this.seenMessages.delete(this.seenMessages.values().next().value); }
    console.log("[EventBus REMOTE]", eventName, payload);
    this._emitLocal(eventName, payload, true);
  }
  subscribe(eventName, callback) { if (!eventName || typeof callback !== "function") return; if (!this.listeners.has(eventName)) this.listeners.set(eventName, new Set()); const set = this.listeners.get(eventName); set.add(callback); return () => this.unsubscribe(eventName, callback); }
  unsubscribe(eventName, callback) { const set = this.listeners.get(eventName); if (!set) return; set.delete(callback); if (!set.size) this.listeners.delete(eventName); }
  emit(eventName, payload, isRemote = false) {
    this._emitLocal(eventName, payload, isRemote); if (isRemote || typeof window === "undefined" || !this.isCrossWindowEvent(eventName)) return;
    const messageId = this.createMessageId(eventName); this.seenMessages.add(messageId); const message = { eventName, payload, messageId, timestamp: Date.now() };
    if (this.bc) { try { this.bc.postMessage(message); } catch (e) {} }
    try { window.localStorage.setItem(this.storageKey, JSON.stringify(message)); } catch (e) {}
  }
  _emitLocal(eventName, payload, isRemote) { const set = this.listeners.get(eventName); if (!set) return; set.forEach(callback => { try { callback(payload, isRemote); } catch (error) { console.error(`Error in event listener for [${eventName}]:`, error); } }); }
  publish(eventName, payload) { return this.emit(eventName, payload); }
  once(eventName, callback) { const wrapper = (payload, remote) => { this.unsubscribe(eventName, wrapper); callback(payload, remote); }; return this.subscribe(eventName, wrapper); }
  clear(eventName) { if (eventName) this.listeners.delete(eventName); else this.listeners.clear(); }
}
export const eventBus = new EventBus();
