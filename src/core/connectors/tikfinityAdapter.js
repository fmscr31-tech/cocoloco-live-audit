import { giftEventBridge } from "../giftEventBridge";

/**
 * Tikfinity Connector Foundation v4.
 * Converts TikFinity gift notifications into authoritative normalized gift events.
 * Preserves TikTok streak metadata so the bridge can distinguish intermediate
 * repeat updates from the authoritative repeatEnd event.
 */
class TikfinityAdapter {
  handleTikfinityPayload(rawPayload) {
    if (!rawPayload) {
      console.warn("[TikfinityAdapter] Received empty payload.");
      return null;
    }

    console.log("[Gift Received]", rawPayload);
    console.log("[TikfinityAdapter] Inspecting incoming raw payload:", rawPayload);

    const data = rawPayload.data || rawPayload;
    const giftObj = data.gift || {};

    const isGiftEvent =
      rawPayload.event === "gift" ||
      rawPayload.type === "gift" ||
      String(rawPayload.eventType || "").toLowerCase().includes("gift") ||
      rawPayload.giftName ||
      rawPayload.giftId ||
      data.giftName ||
      data.giftId ||
      data.gift ||
      giftObj.name ||
      giftObj.id;

    if (!isGiftEvent) {
      console.log("[TikfinityAdapter] Payload is not a gift event. Ignoring.");
      return null;
    }

    const playerId =
      rawPayload.playerId ||
      rawPayload.userId ||
      data.playerId ||
      data.userId ||
      data.uniqueId ||
      rawPayload.uniqueId ||
      rawPayload.username ||
      "";

    const username =
      rawPayload.username ||
      rawPayload.uniqueId ||
      data.uniqueId ||
      data.username ||
      data.tikfinityUsername ||
      "Viewer";

    const displayName =
      rawPayload.displayName ||
      data.displayName ||
      data.nickname ||
      username;

    const giftId =
      data.giftId ||
      data.gift_id ||
      giftObj.id ||
      giftObj.gift_id ||
      rawPayload.giftId ||
      rawPayload.gift_id ||
      null;

    let giftName =
      data.giftName ||
      data.gift_name ||
      data.name ||
      data.giftDisplayName ||
      data.title ||
      giftObj.name ||
      giftObj.giftName ||
      giftObj.gift_name ||
      giftObj.title ||
      rawPayload.giftName ||
      rawPayload.gift_name ||
      rawPayload.name ||
      null;

    if (giftName && /^\d+$/.test(String(giftName).trim())) giftName = null;

    if (!giftId && !giftName) {
      console.warn("[TikfinityAdapter] Unresolved gift identifier in TikFinity payload. Ignoring gift event.", rawPayload);
      return null;
    }

    const quantity = Number(
      data.repeatCount ||
      data.repeat_count ||
      data.quantity ||
      data.count ||
      giftObj.repeatCount ||
      giftObj.repeat_count ||
      rawPayload.repeatCount ||
      rawPayload.repeat_count ||
      1
    );

    const diamondValue = Number(
      data.diamondCount ||
      data.diamondValue ||
      data.diamonds ||
      data.coins ||
      giftObj.diamondCount ||
      giftObj.diamonds ||
      giftObj.coins ||
      rawPayload.diamondCount ||
      rawPayload.diamondValue ||
      1
    );

    const eventId =
      rawPayload.eventId || rawPayload.eventID ||
      data.eventId || data.eventID ||
      rawPayload.msgId || rawPayload.messageID ||
      data.msgId || data.messageID ||
      rawPayload.transactionId || rawPayload.transactionID ||
      data.transactionId || data.transactionID ||
      data.id || null;

    // Preserve the exact TikTok/TikFinity streak lifecycle fields.
    const repeatEnd =
      rawPayload.repeatEnd ?? rawPayload.repeat_end ??
      data.repeatEnd ?? data.repeat_end ??
      giftObj.repeatEnd ?? giftObj.repeat_end;

    const streaking =
      rawPayload.streaking ?? rawPayload.isRepeating ?? rawPayload.is_repeating ??
      data.streaking ?? data.isRepeating ?? data.is_repeating ??
      giftObj.streaking ?? giftObj.isRepeating ?? giftObj.is_repeating;

    const giftType =
      rawPayload.giftType ?? rawPayload.gift_type ??
      data.giftType ?? data.gift_type ??
      giftObj.type ?? giftObj.giftType ?? giftObj.gift_type;

    console.log("[TikFinity GIFT AUTHORITATIVE]", {
      playerId,
      userId: data.userId || rawPayload.userId || playerId,
      username,
      displayName,
      giftId,
      giftName,
      quantity,
      diamondValue,
      eventId,
      repeatEnd,
      streaking,
      giftType
    });

    const normalized = giftEventBridge.processExternalGift({
      source: "tikfinity",
      playerId,
      userId: data.userId || rawPayload.userId || playerId,
      username,
      displayName,
      giftId,
      giftName,
      quantity,
      diamondValue,
      eventId,
      repeatEnd,
      streaking,
      giftType,
      rawInput: rawPayload.rawInput || data.rawInput || giftName || giftId
    });

    console.log("[TikFinity DEBUG] NORMALIZED GIFT", normalized);
    return normalized;
  }
}

export const tikfinityAdapter = new TikfinityAdapter();

if (typeof window !== "undefined") {
  window.__cocoTikfinityTest = (payload) => tikfinityAdapter.handleTikfinityPayload(payload);
}
