import { eventBus } from "./eventBus";
import { giftResolver } from "./giftResolver";
import { giftActionDispatcher } from "./giftActionDispatcher";
import { giftAbilityResolver } from "./giftAbilityResolver";
import { abilityEventQueue } from "./abilityEventQueue";
import { resolveCanonicalGiftId } from "../config/canonicalGifts";

/**
 * Gift Event Bridge v5
 * Authoritative event-driven pipeline:
 * TikFinity notification -> canonical gift -> ability/action -> score/effect -> overlay.
 *
 * Streak rule: TikTok can emit several events while a streak is in progress.
 * Intermediate streak events must never execute an ability, sound, animation or
 * score. Only the final repeatEnd event is authoritative for a streakable gift.
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

  _isStreakIntermediate(rawPayload, data, giftObj) {
    const repeatEnd =
      rawPayload.repeatEnd ?? rawPayload.repeat_end ??
      data.repeatEnd ?? data.repeat_end ??
      giftObj.repeatEnd ?? giftObj.repeat_end;

    const streaking =
      rawPayload.streaking ?? rawPayload.isRepeating ?? rawPayload.is_repeating ??
      data.streaking ?? data.isRepeating ?? data.is_repeating ??
      giftObj.streaking ?? giftObj.isRepeating ?? giftObj.is_repeating;

    const giftType = Number(
      rawPayload.giftType ?? rawPayload.gift_type ??
      data.giftType ?? data.gift_type ??
      giftObj.type ?? giftObj.giftType ?? giftObj.gift_type
    );

    // Explicit streaking=true is authoritative.
    if (streaking === true || streaking === 1 || streaking === "1") return true;

    // TikTok's streakable gifts are type 1. When repeatEnd is explicitly false,
    // the event is an intermediate streak update and must not execute yet.
    if (giftType === 1 && (repeatEnd === false || repeatEnd === 0 || repeatEnd === "0")) {
      return true;
    }

    return false;
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

    // IMPORTANT: do this before canonical resolution. A streak-in-progress
    // notification is a real TikTok event, but it is not yet a game trigger.
    if (!this._isStreakIntermediate(rawPayload, data, giftObj)) {
      // no-op; continue to authoritative processing below
    } else {
      const progressQuantity = Math.max(1, Number(
        rawPayload.quantity || data.repeatCount || data.count || data.quantity || giftObj.repeatCount || 1
      ));
      eventBus.emit("gift:streak_progress", {
        type: "GIFT_STREAK_PROGRESS",
        giftId: rawPayload.giftId || rawPayload.gift_id || data.giftId || data.gift_id || giftObj.id || null,
        giftName: rawPayload.giftName || rawPayload.gift_name || data.giftName || data.gift_name || giftObj.name || null,
        quantity: progressQuantity,
        username: rawPayload.username || rawPayload.uniqueId || data.uniqueId || data.username || "Viewer",
        source,
        timestamp: Date.now()
      });
      console.log("[GiftEventBridge] Streak in progress; visual/action execution deferred until repeatEnd.");
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
