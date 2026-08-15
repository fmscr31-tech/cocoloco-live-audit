const EVENT_KEY = "cocoloco_events";
const LAST_EVENT_KEY = "cocoloco_last_event";

const listeners = {};

function saveEvents(events) {

  localStorage.setItem(
    EVENT_KEY,
    JSON.stringify(events)
  );

}

function loadEvents() {

  const data = localStorage.getItem(
    EVENT_KEY
  );

  if (!data) {
    return [];
  }

  return JSON.parse(data);

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

  emit(type, event);

  emit("*", event);

  return event;

}

export function getEvents() {

  return loadEvents();

}

export function getLastEvent() {

  const events = loadEvents();

  if (events.length === 0) {
    return null;
  }

  return events[events.length - 1];

}

export function getNewEvent() {

  const lastEvent = getLastEvent();

  if (!lastEvent) {
    return null;
  }

  const seenEvent = localStorage.getItem(
    LAST_EVENT_KEY
  );

  if (seenEvent === lastEvent.id) {
    return null;
  }

  localStorage.setItem(
    LAST_EVENT_KEY,
    lastEvent.id
  );

  return lastEvent;

}

export function clearEvents() {

  localStorage.removeItem(
    EVENT_KEY
  );

  localStorage.removeItem(
    LAST_EVENT_KEY
  );

}

export function on(type, callback) {

  if (!listeners[type]) {
    listeners[type] = [];
  }

  listeners[type].push(callback);

}

export function off(type, callback) {

  if (!listeners[type]) return;

  listeners[type] = listeners[type].filter(

    fn => fn !== callback

  );

}

export function emit(type, payload) {

  if (!listeners[type]) return;

  listeners[type].forEach(

    callback => callback(payload)

  );

}