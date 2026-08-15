import { giftEventBridge } from "../giftEventBridge";

/**
 * Tikfinity Connector Foundation v2 (`tikfinityAdapter.js`)
 * Converts Tikfinity payloads into CocoLoco normalized gift events.
 * P0 FIX: Removed automatic "rose" fallback. Unknown gifts return null and are ignored.
 */
class TikfinityAdapter {
  /**
   * Handles incoming raw payloads from Tikfinity.
   * @param {Object} rawPayload - Raw payload received from Tikfinity webhook/trigger
   * @returns {Object|null} Normalized event or null if invalid/non-gift/unresolved giftId
   */
  handleTikfinityPayload(rawPayload) {
    if (!rawPayload) {
      console.warn("[TikfinityAdapter] Received empty payload.");
      return null;
    }

    console.log("[Gift Received]", rawPayload);
    console.log("[TikfinityAdapter] Inspecting incoming raw payload:", rawPayload);

    const data = rawPayload.data || rawPayload;
    const giftObj = data.gift || {};

    // 1. Detect gift events (support standard Tikfinity event wrappers or direct gift payloads)
    const isGiftEvent = 
      rawPayload.event === "gift" || 
      rawPayload.type === "gift" || 
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

    // 2. Extract fields robustly supporting all Tikfinity field variations
    const username = data.nickname || data.uniqueId || data.username || data.displayName || data.user || "Viewer";
    
    const giftId = data.giftId || data.gift_id || giftObj.id || giftObj.gift_id || rawPayload.giftId || rawPayload.gift_id || null;
    let giftName = data.giftName || data.gift_name || data.name || data.giftDisplayName || data.title || giftObj.name || giftObj.giftName || giftObj.gift_name || giftObj.title || rawPayload.giftName || rawPayload.gift_name || rawPayload.name || null;

    if (giftName && /^\d+$/.test(String(giftName).trim())) {
      giftName = null;
    }

    if (!giftId && !giftName) {
      console.warn("[TikfinityAdapter] Unresolved gift identifier in Tikfinity payload. Ignoring gift event.", rawPayload);
      return null;
    }

    const quantity = Number(data.repeatCount || data.quantity || data.count || giftObj.repeatCount || 1);
    const diamondValue = Number(data.diamondCount || data.diamondValue || data.diamonds || data.coins || giftObj.diamondCount || giftObj.coins || 1);

    console.log(`[TikfinityAdapter] Validated gift from [${username}]: GiftId (${giftId}), GiftName (${giftName}), Qty (${quantity}), Diamonds (${diamondValue})`);

    // 3. Send normalized data through giftEventBridge
    const normalized = giftEventBridge.processExternalGift({
      source: "tikfinity",
      giftId: giftId,
      giftName: giftName,
      username,
      quantity,
      diamondValue,
      eventId: rawPayload.eventId || data.eventId || rawPayload.msgId || data.msgId || rawPayload.transactionId || data.transactionId
    });

    console.log("[TikFinity DEBUG] NORMALIZED GIFT", normalized);

    return normalized;
  }
}

export const tikfinityAdapter = new TikfinityAdapter();

// Attach helper to window for easy browser console testing
if (typeof window !== "undefined") {
  window.__cocoTikfinityTest = (payload) => {
    return tikfinityAdapter.handleTikfinityPayload(payload);
  };
}
