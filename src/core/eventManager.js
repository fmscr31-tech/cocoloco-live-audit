const EVENT_KEY = "cocoloco_events";
const LAST_EVENT_KEY = "cocoloco_last_event";

const listeners = {};
const runtimeStartedAt = Date.now();
let lastConsumedEventId = null;

function saveEvents(events) {
  localStorage.setItem(EVENT_KEY, JSON.stringify(events));
}

function loadEvents() {
  const data = localStorage.getItem(EVENT_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function createEvent(type, data = {}) {
  const events = loadEvents();
  const event = {
    id: crypto.randomUUID(),
    type,
    data,
    createdAt: Date.now()
  };
  events.push(event);
  saveEvents(events);
  localStorage.setItem(LAST_EVENT_KEY, event.id);
  lastConsumedEventId = event.id;
  emit(type, event);
  emit("*", event);
  return event;
}

export function getEvents() {
  return loadEvents();
}

export function getLastEvent() {
  const events = loadEvents();
  return events.length ? events[events.length - 1] : null;
}

/**
 * Returns an event only when it was created during the current page lifetime.
 * Historical localStorage events must NEVER become a visual action again after
 * an overlay refresh. State is restored from dashboard snapshots; actions are
 * delivered live only.
 */
export function getNewEvent() {
  const lastEvent = getLastEvent();
  if (!lastEvent) return null;

  const eventId = String(lastEvent.id || "");
  if (!eventId) return null;
  if (eventId === lastConsumedEventId) return null;

  // A refresh starts a new runtime. Anything that predates this runtime is
  // historical state and must not trigger a popup/animation.
  if (Number(lastEvent.createdAt) < runtimeStartedAt) {
    lastConsumedEventId = eventId;
    localStorage.setItem(LAST_EVENT_KEY, eventId);
    return null;
  }

  lastConsumedEventId = eventId;
  localStorage.setItem(LAST_EVENT_KEY, eventId);
  return lastEvent;
}

export function clearEvents() {
  localStorage.removeItem(EVENT_KEY);
  localStorage.removeItem(LAST_EVENT_KEY);
  lastConsumedEventId = null;
}

export function on(type, callback) {
  if (!listeners[type]) listeners[type] = [];
  listeners[type].push(callback);
}

export function off(type, callback) {
  if (!listeners[type]) return;
  listeners[type] = listeners[type].filter(fn => fn !== callback);
}

export function emit(type, payload) {
  if (!listeners[type]) return;
  listeners[type].forEach(callback => callback(payload));
}
