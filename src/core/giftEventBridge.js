import { eventBus } from "./eventBus";
import { giftResolver } from "./giftResolver";
import { giftActionDispatcher } from "./giftActionDispatcher";
import { giftAbilityResolver } from "./giftAbilityResolver";
import { abilityEventQueue } from "./abilityEventQueue";
import { resolveCanonicalGiftId } from "../config/canonicalGifts";

/**
 * Gift Event Bridge v3
 * Centralized bridge between incoming external platform gift events (Tikfinity / Simulator)
 * and CocoLoco Live Manager game mechanics / ability queues / fallback resolvers.
 */
class GiftEventBridge {
  constructor() {
    this.liveInputEnabled = true; // True by default for live stream operation
    this.processedEvents = new Map(); // Deduplication cache
    this.maxCacheSize = 1000;
    this.initPipelineListener();
  }

  enableLiveInput() {
    this.liveInputEnabled = true;
    console.log("[GiftEventBridge] Live input ENABLED.");
  }

  disableLiveInput() {
    this.liveInputEnabled = false;
    console.log("[GiftEventBridge] Live input DISABLED (Kill Switch active).");
  }

  isLiveInputEnabled() {
    return this.liveInputEnabled;
  }

  _cleanCache() {
    if (this.processedEvents.size > this.maxCacheSize) {
      const keys = Array.from(this.processedEvents.keys());
      for (let i = 0; i < 200; i++) {
        this.processedEvents.delete(keys[i]);
      }
    }
  }

  initPipelineListener() {
    // Automatically bridge normalized:gift events into ability resolution queue or legacy fallback
    eventBus.subscribe("normalized:gift", (normalizedEvent) => {
      console.log("[GiftEventBridge DEBUG] RECEIVED", normalizedEvent);

      const canonicalId = normalizedEvent.canonicalGiftId || normalizedEvent.giftId;

      // 1. Try resolving via giftAbilityResolver with canonicalId / giftName / giftId
      const abilityPayload = giftAbilityResolver.resolveGiftToAbility({
        giftId: normalizedEvent.giftId,
        giftName: normalizedEvent.giftName || canonicalId,
        canonicalGiftId: canonicalId,
        username: normalizedEvent.username,
        displayName: normalizedEvent.displayName,
        teamId: normalizedEvent.teamId,
        duration: normalizedEvent.duration,
        quantity: normalizedEvent.quantity || 1,
        repeatCount: normalizedEvent.quantity || 1
      });

      if (abilityPayload) {
        console.log("[GiftEventBridge DEBUG] RESOLVED", abilityPayload);
        abilityEventQueue.enqueue(abilityPayload);
        eventBus.emit("gift:processed", {
          type: "GIFT",
          source: normalizedEvent,
          result: abilityPayload,
          timestamp: Date.now()
        });
        console.log("[GiftEventBridge DEBUG] ACTION DISPATCHED", abilityPayload);
      } else {
        // 2. Fallback to legacy giftResolver behavior using canonicalId / giftName
        console.log("[GiftEventBridge] Ability resolution failed. Falling back to legacy giftResolver with canonicalId:", canonicalId);
        const resolved = giftResolver.resolveGiftEvent({
          giftId: canonicalId,
          giftName: normalizedEvent.giftName,
          username: normalizedEvent.username,
          quantity: normalizedEvent.quantity || 1
        }, "context");

        if (resolved) {
          console.log("[GiftEventBridge DEBUG] RESOLVED", resolved);
          giftActionDispatcher.dispatch(resolved);
          eventBus.emit("gift:processed", {
            type: "GIFT",
            source: normalizedEvent,
            result: resolved,
            timestamp: Date.now()
          });
          console.log("[GiftEventBridge DEBUG] ACTION DISPATCHED", resolved);
        }
      }
    });
  }

  /**
   * Accepts external raw gift payloads from any connector, normalizes them,
   * resolves them against the Canonical Gift Registry, and applies transaction deduplication.
   * Respects the Live Input Kill Switch (dropping real external inputs when disabled while keeping simulator active).
   * @param {Object} rawPayload - External platform payload
   * @returns {Object|null} Normalized event object or null if duplicate/disabled
   */
  processExternalGift(rawPayload = {}) {
    const data = rawPayload.data || rawPayload;
    const giftObj = data.gift || {};

    const source = rawPayload.source || data.source || "EXTERNAL_CONNECTOR";
    const isSimulator = String(source).toLowerCase().includes("simulator");

    // Live Input Kill Switch check for real external connector inputs
    if (!isSimulator && !this.liveInputEnabled) {
      console.warn("[GiftEventBridge] Live input is DISABLED (Kill Switch active). Dropping external payload:", rawPayload);
      return null;
    }

    // 1. Check for native unique transaction / event ID
    const nativeId = 
      rawPayload.eventId || rawPayload.eventID || 
      rawPayload.msgId || rawPayload.messageID || 
      rawPayload.transactionId || rawPayload.transactionID || 
      data.eventId || data.eventID || 
      data.msgId || data.messageID || 
      data.transactionId || data.transactionID || 
      data.id;

    if (nativeId) {
      const dedupKey = `${source}_${nativeId}`;
      const now = Date.now();
      
      this._cleanCache();

      if (this.processedEvents.has(dedupKey)) {
        console.warn(`[GiftEventBridge] Duplicate gift event ignored (Native ID: ${nativeId}, Source: ${source})`);
        return null;
      }

      this.processedEvents.set(dedupKey, now);
    }

    const giftId = rawPayload.giftId || rawPayload.gift_id || data.giftId || data.gift_id || giftObj.id || giftObj.gift_id || null;
    let giftName = rawPayload.giftName || rawPayload.gift_name || rawPayload.name || data.giftName || data.gift_name || data.name || data.giftDisplayName || data.title || giftObj.name || giftObj.giftName || giftObj.gift_name || giftObj.title || null;

    if (giftName && /^\d+$/.test(String(giftName).trim())) {
      giftName = null;
    }

    // Resolve via Canonical Gift Registry
    const canonical = resolveCanonicalGiftId({ giftId, giftName, rawInput: rawPayload.rawInput || data.rawInput });
    const canonicalGiftId = canonical ? canonical.canonicalId : (giftName ? String(giftName).trim().toLowerCase() : (giftId ? String(giftId).trim().toLowerCase() : "rose"));
    const actualGiftName = canonical ? canonical.display.name : (giftName || giftId || "Rose");

    const quantity = Number(rawPayload.quantity || data.repeatCount || data.count || data.quantity || giftObj.repeatCount || 1);

    const normalized = {
      type: "GIFT",
      giftId: giftId || canonicalGiftId,
      giftName: actualGiftName,
      canonicalGiftId: canonicalGiftId,
      rawInput: giftName || giftId || "rose",
      username: rawPayload.username || rawPayload.displayName || data.nickname || data.uniqueId || data.username || data.user || "Viewer",
      quantity: quantity,
      diamondValue: Number(rawPayload.diamondValue || data.diamondCount || data.diamonds || data.coins || giftObj.diamondCount || 1),
      teamId: rawPayload.teamId || data.teamId,
      duration: rawPayload.duration || data.duration,
      timestamp: Date.now(),
      source: source
    };

    console.log("[Canonical Gift Normalized]", normalized);
    eventBus.publish("normalized:gift", normalized);

    return normalized;
  }
}

export const giftEventBridge = new GiftEventBridge();

// Attach helper to window for easy testing in browser development
if (typeof window !== "undefined") {
  window.__cocoGiftBridge = (giftId, username, quantity, source, eventId) => {
    return giftEventBridge.processExternalGift({ giftId, username, quantity, source, eventId });
  };
  window.__cocoLiveInput = {
    enable: () => giftEventBridge.enableLiveInput(),
    disable: () => giftEventBridge.disableLiveInput(),
    status: () => giftEventBridge.isLiveInputEnabled()
  };
}
