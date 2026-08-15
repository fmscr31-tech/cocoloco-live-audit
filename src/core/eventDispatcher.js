import { getPendingEvents, clearQueue } from "./eventBridge";
import { createEvent } from "./eventManager";
import { playerEngine } from "./engines/playerEngine";

const chatEngine = {
  handleEvent: (event) => { /* Infrastructure stub for chat command processing */ }
};

const followEngine = {
  handleEvent: (event) => { /* Infrastructure stub for follow actions */ }
};

const likeEngine = {
  handleEvent: (event) => { /* Infrastructure stub for like/tap aggregation */ }
};

/**
 * Event Dispatcher: Consumer of non-gift external events from eventBridge.
 * (Gifts are handled exclusively by giftEventBridge to prevent duplication).
 */
export function dispatchEvents() {
  const pendingEvents = getPendingEvents();
  if (pendingEvents.length === 0) return;

  clearQueue();

  pendingEvents.forEach(event => {
    const type = event.type;

    playerEngine.handleEvent(event);

    switch (type) {
      case "SHARE":
        break;
      case "CHAT":
        chatEngine.handleEvent(event);
        break;
      case "FOLLOW":
        followEngine.handleEvent(event);
        break;
      case "LIKE":
        likeEngine.handleEvent(event);
        break;
      case "JOIN":
      default:
        break;
    }

    if (type !== "GIFT") {
      createEvent(`EXTERNAL_${type}`, event);
    }
  });
}

let dispatcherInterval = null;

export function startDispatcher(intervalMs = 500) {
  if (dispatcherInterval) return;
  dispatcherInterval = setInterval(() => {
    dispatchEvents();
  }, intervalMs);
}

export function stopDispatcher() {
  if (dispatcherInterval) {
    clearInterval(dispatcherInterval);
    dispatcherInterval = null;
  }
}

startDispatcher();
