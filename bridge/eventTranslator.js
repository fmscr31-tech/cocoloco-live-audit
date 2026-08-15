/**
 * Event Translator: Translates raw TikTok events from tiktok-live-connector into standardized CocoLoco formats.
 */
export class EventTranslator {
  static translate(eventName, rawData) {
    if (!rawData) return null;

    switch (eventName) {
      case "chat":
      case "message":
        return {
          type: "CHAT",
          username: rawData.uniqueId || rawData.nickname || "Anonymous",
          message: rawData.comment || "",
          timestamp: Date.now()
        };

      case "member":
      case "join":
      case "roomUser":
        return {
          type: "JOIN",
          username: rawData.uniqueId || rawData.nickname || "Anonymous",
          timestamp: Date.now()
        };

      case "like":
        return {
          type: "LIKE",
          username: rawData.uniqueId || rawData.nickname || "Anonymous",
          count: Number(rawData.likeCount || 1),
          timestamp: Date.now()
        };

      case "social":
      case "follow":
        return {
          type: "FOLLOW",
          username: rawData.uniqueId || rawData.nickname || "Anonymous",
          timestamp: Date.now()
        };

      case "share":
        return {
          type: "SHARE",
          username: rawData.uniqueId || rawData.nickname || "Anonymous",
          timestamp: Date.now()
        };

      case "gift":
        return {
          type: "GIFT",
          username: rawData.uniqueId || rawData.nickname || "Anonymous",
          giftName: rawData.giftName || rawData.gift?.giftName || "Gift",
          diamondCount: Number(rawData.diamondCount || rawData.gift?.diamondCount || 1),
          repeatCount: Number(rawData.repeatCount || 1),
          timestamp: Date.now()
        };

      case "subscribe":
      case "social_subscribe":
        return {
          type: "SUBSCRIBE",
          username: rawData.uniqueId || rawData.nickname || "Anonymous",
          tier: rawData.tier || 1,
          timestamp: Date.now()
        };

      default:
        return null;
    }
  }
}
