/**
 * TikTok Adapter: Converts raw external TikTok event payloads into standard eventBridge format.
 * Standard types: JOIN, CHAT, GIFT, LIKE, FOLLOW, SHARE.
 */
class TikTokAdapter {
  constructor() {}

  adaptEvent(rawEvent) {
    if (!rawEvent || typeof rawEvent !== "object") return null;

    const rawType = (rawEvent.event || rawEvent.type || "").toUpperCase();
    let standardizedType = "UNKNOWN";

    switch (rawType) {
      case "MEMBER":
      case "JOIN":
      case "ROOMUSER":
        standardizedType = "JOIN";
        break;
      case "CHAT":
      case "MESSAGE":
        standardizedType = "CHAT";
        break;
      case "GIFT":
        standardizedType = "GIFT";
        break;
      case "LIKE":
        standardizedType = "LIKE";
        break;
      case "SOCIAL":
      case "FOLLOW":
        standardizedType = "FOLLOW";
        break;
      case "SHARE":
        standardizedType = "SHARE";
        break;
      default:
        standardizedType = rawType;
        break;
    }

    const resolvedUserId = 
      rawEvent.userId || 
      rawEvent.secUid || 
      rawEvent.uniqueId || 
      rawEvent.username || 
      rawEvent.data?.userId || 
      rawEvent.data?.secUid || 
      rawEvent.data?.uniqueId || 
      rawEvent.data?.username || 
      `tiktok_${Date.now()}`;

    return {
      type: standardizedType,
      username: rawEvent.uniqueId || rawEvent.username || rawEvent.nickname || rawEvent.data?.uniqueId || rawEvent.data?.username || rawEvent.data?.nickname || "Anonymous",
      userId: resolvedUserId,
      value: Number(rawEvent.diamondCount || rawEvent.value || rawEvent.likeCount || 1),
      timestamp: rawEvent.timestamp || Date.now(),
      payload: rawEvent
    };
  }
}

export const tikTokAdapter = new TikTokAdapter();
