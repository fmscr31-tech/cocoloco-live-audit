import { eventMonitor } from "./connectors/eventMonitor";
import { eventBus } from "./eventBus";

const VALID_EVENT_TYPES = [
  "JOIN",
  "CHAT",
  "GIFT",
  "LIKE",
  "FOLLOW",
  "SHARE"
];

let eventQueue = [];
let recentProcessedEvents = [];

console.log("[EVENT BRIDGE CREATED]");

export function validateEvent(event) {
  if (!event || typeof event !== "object") return false;
  if (!event.type || !VALID_EVENT_TYPES.includes(event.type.toUpperCase())) return false;
  if (!event.username && !event.userId) return false;
  return true;
}

export function normalizeEvent(event) {
  return {
    type: event.type ? event.type.toUpperCase() : "UNKNOWN",
    username: event.username || event.uniqueId || "Anonymous",
    userId: event.userId || event.secUid || `user_${Date.now()}`,
    value: Number(event.value !== undefined ? event.value : (event.giftValue || event.diamondCount || 1)),
    timestamp: event.timestamp || Date.now(),
    payload: event.payload || event
  };
}

export function queueEvent(event) {
  if (validateEvent(event)) {
    const normalized = normalizeEvent(event);

    // Deduplication guard for non-gift events
    const now = Date.now();
    recentProcessedEvents = recentProcessedEvents.filter(item => now - item.timestamp < 1500);
    const isDuplicate = recentProcessedEvents.some(item => 
      item.type === normalized.type &&
      item.username === normalized.username &&
      JSON.stringify(item.payload) === JSON.stringify(normalized.payload)
    );

    if (isDuplicate) {
      return null;
    }

    recentProcessedEvents.push({
      type: normalized.type,
      username: normalized.username,
      timestamp: now
    });

    eventQueue.push(normalized);
    eventMonitor.recordEvent(normalized, `EXTERNAL_${normalized.type}`);

    return normalized;
  }
  return null;
}

export function receiveEvent(event) {
  return queueEvent(event);
}

export function getPendingEvents() {
  return [...eventQueue];
}

export function clearQueue() {
  eventQueue = [];
}
