import { eventBus } from "../eventBus";

/**
 * Event Monitor: Diagnostics system that tracks external event ingestion, counts by type,
 * timestamps, source, validation errors, and recent event history via eventBus.
 */
class EventMonitor {
  constructor() {
    this.stats = {
      totalReceived: 0,
      validationErrors: 0,
      ingestionCounts: {
        normalizedGift: 0,
        other: 0
      },
      processingCounts: {
        giftProcessed: 0
      },
      counts: {
        JOIN: 0,
        CHAT: 0,
        GIFT: 0,
        LIKE: 0,
        FOLLOW: 0,
        SHARE: 0,
        UNKNOWN: 0
      },
      lastEvent: null
    };
    this.recentEvents = [];
    this.maxHistory = 50;
    this.initListeners();
  }

  initListeners() {
    // 1. EVENT INGESTION: Track raw incoming normalized gifts without duplicate history recording
    eventBus.subscribe("normalized:gift", (event) => {
      this.stats.ingestionCounts.normalizedGift += 1;
    });

    // 2. EVENT PROCESSING: Track successful internal processing actions resulting in single logical transaction history record
    eventBus.subscribe("gift:processed", (event) => {
      this.stats.processingCounts.giftProcessed += 1;
      this.recordEvent(event, "GIFT");
    });

    // Listen to standard non-gift external events
    eventBus.subscribe("EXTERNAL_JOIN", (e) => this.recordEvent(e, "EXTERNAL_JOIN"));
    eventBus.subscribe("EXTERNAL_CHAT", (e) => this.recordEvent(e, "EXTERNAL_CHAT"));
    eventBus.subscribe("EXTERNAL_LIKE", (e) => this.recordEvent(e, "EXTERNAL_LIKE"));
    eventBus.subscribe("EXTERNAL_FOLLOW", (e) => this.recordEvent(e, "EXTERNAL_FOLLOW"));
    eventBus.subscribe("EXTERNAL_SHARE", (e) => this.recordEvent(e, "EXTERNAL_SHARE"));
  }

  recordEvent(event, sourceType = "EXTERNAL") {
    if (!event) return;

    this.stats.totalReceived += 1;
    const type = (event.type || event.data?.type || sourceType).toUpperCase();
    
    if (this.stats.counts[type] !== undefined) {
      this.stats.counts[type] += 1;
    } else {
      this.stats.counts.UNKNOWN = (this.stats.counts.UNKNOWN || 0) + 1;
    }

    const record = {
      ...event,
      source: sourceType,
      loggedAt: Date.now()
    };

    this.stats.lastEvent = record;
    this.recentEvents.unshift(record);
    if (this.recentEvents.length > this.maxHistory) {
      this.recentEvents.pop();
    }

    eventBus.emit("monitor:event_logged", record);
  }

  recordValidationError(errorPayload) {
    this.stats.validationErrors += 1;
    eventBus.emit("monitor:validation_error", errorPayload);
  }

  getStats() {
    return { ...this.stats };
  }

  getRecentEvents(limit = 10) {
    return this.recentEvents.slice(0, limit);
  }

  clearHistory() {
    this.stats.totalReceived = 0;
    this.stats.validationErrors = 0;
    this.stats.ingestionCounts = { normalizedGift: 0, other: 0 };
    this.stats.processingCounts = { giftProcessed: 0 };
    Object.keys(this.stats.counts).forEach(k => this.stats.counts[k] = 0);
    this.stats.lastEvent = null;
    this.recentEvents = [];
    eventBus.emit("monitor:cleared", {});
  }
}

export const eventMonitor = new EventMonitor();
