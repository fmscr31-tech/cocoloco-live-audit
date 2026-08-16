import { eventBus } from "./eventBus";
import { giftResolver } from "./giftResolver";
import { giftActionDispatcher } from "./giftActionDispatcher";
import { giftAbilityResolver } from "./giftAbilityResolver";
import { abilityEventQueue } from "./abilityEventQueue";
import { resolveCanonicalGiftId } from "../config/canonicalGifts";

/**
 * Gift Event Bridge v4
 * Authoritative event-driven pipeline:
 * TikFinity notification -> canonical gift -> ability/action -> score/effect -> overlay.
 * The incoming gift notification is the trigger; no answer comparison or other
 * unrelated game condition is allowed to block a valid mapped gift.
 */
class GiftEventBridge {
  constructor() {
    this.liveInputEnabled = true;
    this.processedEvents = new Map();
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

  isLiveInputEnabled() { return this.liveInputEnabled; }

  _cleanCache() {
    if (this.processedEvents.size <= this.maxCacheSize) return;
    const keys = Array.from(this.processedEvents.keys());
    for (let i = 0; i < 200; i++) this.processedEvents.delete(keys[i]);
  }

  initPipelineListener() {
    eventBus.subscribe("normalized:gift", (normalizedEvent) => {
      console.log("[GiftEventBridge DEBUG] RECEIVED", normalizedEvent);

      const canonicalId = normalizedEvent.canonicalGiftId || normalizedEvent.giftId;
      const abilityPayload = giftAbilityResolver.resolveGiftToAbility({
        giftId: normalizedEvent.giftId,
        giftName: normalizedEvent.giftName || canonicalId,
        canonicalGiftId: canonicalId,
        playerId: normalizedEvent.playerId,
        userId: normalizedEvent.userId,
        username: normalizedEvent.username,
        displayName: normalizedEvent.displayName,
        avatar: normalizedEvent.avatar,
        teamId: normalizedEvent.teamId,
        duration: normalizedEvent.duration,
        quantity: normalizedEvent.quantity || 1,
        repeatCount: normalizedEvent.quantity || 1
      });

      if (abilityPayload) {
        console.log("[GiftEventBridge DEBUG] RESOLVED", abilityPayload);
        abilityEventQueue.enqueue({
          ...abilityPayload,
          canonicalGiftId: canonicalId,
          giftId: normalizedEvent.giftId,
          giftName: normalizedEvent.giftName,
          playerId: normalizedEvent.playerId,
          userId: normalizedEvent.userId,
          displayName: normalizedEvent.displayName,
          avatar: normalizedEvent.avatar
        });

        eventBus.emit("gift:action_dispatched", {
          type: "GIFT",
          source: normalizedEvent,
          result: abilityPayload,
          canonicalGiftId: canonicalId,
          timestamp: Date.now()
        });

        eventBus.emit("gift:processed", {
          type: "GIFT",
          source: normalizedEvent,
          result: abilityPayload,
          timestamp: Date.now()
        });
        console.log("[GiftEventBridge DEBUG] ACTION QUEUED", abilityPayload);
      } else {
        console.log("[GiftEventBridge] Ability resolution failed. Falling back to legacy giftResolver with canonicalId:", canonicalId);
        const resolved = giftResolver.resolveGiftEvent({
          giftId: canonicalId,
          giftName: normalizedEvent.giftName,
          username: normalizedEvent.username,
          quantity: normalizedEvent.quantity || 1
        }, "context");

        if (resolved) {
          console.log("[GiftEventBridge DEBUG] RESOLVED LEGACY", resolved);
          const result = giftActionDispatcher.dispatch(resolved);
          eventBus.emit("gift:processed", {
            type: "GIFT",
            source: normalizedEvent,
            result: resolved,
            dispatchResult: result,
            timestamp: Date.now()
          });
          console.log("[GiftEventBridge DEBUG] LEGACY ACTION DISPATCHED", resolved);
        } else {
          console.warn("[GiftEventBridge] Gift received but no configured action exists:", normalizedEvent);
        }
      }
    });
  }

  processExternalGift(rawPayload = {}) {
    const data = rawPayload.data || rawPayload;
    const giftObj = data.gift || {};

    const source = rawPayload.source || data.source || "EXTERNAL_CONNECTOR";
    const isSimulator = String(source).toLowerCase().includes("simulator");

    if (!isSimulator && !this.liveInputEnabled) {
      console.warn("[GiftEventBridge] Live input is DISABLED (Kill Switch active). Dropping external payload:", rawPayload);
      return null;
    }

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

    if (giftName && /^\d+$/.test(String(giftName).trim())) giftName = null;

    const canonical = resolveCanonicalGiftId({ giftId, giftName, rawInput: rawPayload.rawInput || data.rawInput });
    const canonicalGiftId = canonical
      ? canonical.canonicalId
      : (giftName ? String(giftName).trim().toLowerCase() : (giftId ? String(giftId).trim().toLowerCase() : ""));

    if (!canonicalGiftId) {
      console.warn("[GiftEventBridge] Gift notification contained no usable gift identity:", rawPayload);
      return null;
    }

    const actualGiftName = canonical ? canonical.display.name : (giftName || giftId || "Unknown Gift");
    const quantity = Math.max(1, Number(rawPayload.quantity || data.repeatCount || data.count || data.quantity || giftObj.repeatCount || 1));
    const playerId = rawPayload.playerId || rawPayload.userId || data.playerId || data.userId || data.uniqueId || rawPayload.uniqueId || rawPayload.username || "";
    const username = rawPayload.username || rawPayload.uniqueId || data.uniqueId || data.username || data.tikfinityUsername || "Viewer";
    const displayName = rawPayload.displayName || data.displayName || data.nickname || username;
    const userId = rawPayload.userId || data.userId || playerId;
    const avatar = rawPayload.avatar || rawPayload.profilePictureUrl || data.avatar || data.profilePictureUrl || "";

    const normalized = {
      type: "GIFT",
      giftId: giftId || canonicalGiftId,
      giftName: actualGiftName,
      canonicalGiftId,
      rawInput: giftName || giftId || canonicalGiftId,
      playerId,
      userId,
      username,
      displayName,
      avatar,
      quantity,
      diamondValue: Number(rawPayload.diamondValue || data.diamondCount || data.diamonds || data.coins || giftObj.diamondCount || 1),
      teamId: rawPayload.teamId || data.teamId || null,
      duration: rawPayload.duration || data.duration,
      eventId: nativeId || null,
      timestamp: Date.now(),
      source
    };

    console.log("[Canonical Gift Normalized]", normalized);

    // This is the authoritative live trigger. The overlay does not need to
    // inspect raw TikFinity data; it receives the resolved ability/effect events.
    eventBus.emit("gift:received", normalized);
    eventBus.publish("normalized:gift", normalized);

    return normalized;
  }
}

export const giftEventBridge = new GiftEventBridge();

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
