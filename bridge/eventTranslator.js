/**
 * Event Translator: Translates raw TikTok events from tiktok-live-connector into standardized CocoLoco formats.
 */
export class EventTranslator {
  static translate(eventName, rawData) {
    if (!rawData) return null;

    const playerId = rawData.userId || rawData.user?.userId || rawData.user?.id || rawData.uniqueId || rawData.nickname || "";
    const username = rawData.uniqueId || rawData.nickname || "Anonymous";
    const displayName = rawData.nickname || rawData.uniqueId || "Anonymous";
    const avatar = rawData.profilePictureUrl || rawData.profilePicture || rawData.user?.profilePictureUrl || "";

    switch (eventName) {
      case "chat":
      case "message":
        return {
          type: "CHAT",
          playerId,
          userId: rawData.userId || rawData.user?.userId || "",
          username,
          displayName,
          avatar,
          profilePictureUrl: avatar,
          message: rawData.comment || rawData.message || "",
          timestamp: Date.now()
        };

      case "member":
      case "join":
      case "roomUser":
        return {
          type: "JOIN",
          playerId,
          userId: rawData.userId || rawData.user?.userId || "",
          username,
          displayName,
          avatar,
          timestamp: Date.now()
        };

      case "like":
        return {
          type: "LIKE",
          playerId,
          userId: rawData.userId || rawData.user?.userId || "",
          username,
          displayName,
          count: Number(rawData.likeCount || 1),
          timestamp: Date.now()
        };

      case "social":
      case "follow":
        return {
          type: "FOLLOW",
          playerId,
          userId: rawData.userId || rawData.user?.userId || "",
          username,
          displayName,
          timestamp: Date.now()
        };

      case "share":
        return {
          type: "SHARE",
          playerId,
          userId: rawData.userId || rawData.user?.userId || "",
          username,
          displayName,
          timestamp: Date.now()
        };

      case "gift":
        return {
          type: "GIFT",
          playerId,
          userId: rawData.userId || rawData.user?.userId || "",
          username,
          displayName,
          giftName: rawData.giftName || rawData.gift?.giftName || "Gift",
          diamondCount: Number(rawData.diamondCount || rawData.gift?.diamondCount || 1),
          repeatCount: Number(rawData.repeatCount || 1),
          timestamp: Date.now()
        };

      case "subscribe":
      case "social_subscribe":
        return {
          type: "SUBSCRIBE",
          playerId,
          userId: rawData.userId || rawData.user?.userId || "",
          username,
          displayName,
          tier: rawData.tier || 1,
          timestamp: Date.now()
        };

      default:
        return null;
    }
  }
}
