/**
 * TikTok Adapter: Converts raw external TikTok event payloads into standard eventBridge format.
 * Standard types: JOIN, CHAT, GIFT, LIKE, FOLLOW, SHARE, WIN_LIMPIA.
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
      case "SENDGIFT":
        standardizedType = "GIFT";
        break;
      case "WIN":
      case "WINNER":
      case "WIN_LIMPIA":
      case "WINLIMPIA":
      case "CORRECT_ANSWER":
      case "CORRECTANSWER":
      case "ANSWER_CORRECT":
      case "CONTEXT_WIN":
        standardizedType = "WIN_LIMPIA";
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
      rawEvent.playerId ||
      rawEvent.uniqueId ||
      rawEvent.username ||
      rawEvent.data?.userId ||
      rawEvent.data?.playerId ||
      rawEvent.data?.uniqueId ||
      rawEvent.data?.username ||
      `tiktok_${Date.now()}`;

    return {
      type: standardizedType,
      username: rawEvent.uniqueId || rawEvent.username || rawEvent.data?.uniqueId || rawEvent.data?.username || rawEvent.nickname || rawEvent.data?.nickname || "Anonymous",
      userId: resolvedUserId,
      playerId: rawEvent.playerId || rawEvent.userId || rawEvent.data?.playerId || rawEvent.data?.userId || rawEvent.uniqueId || rawEvent.data?.uniqueId || "",
      displayName: rawEvent.displayName || rawEvent.nickname || rawEvent.data?.displayName || rawEvent.data?.nickname || rawEvent.uniqueId || rawEvent.data?.uniqueId || "Anonymous",
      value: Number(rawEvent.diamondCount || rawEvent.value || rawEvent.likeCount || 1),
      timestamp: rawEvent.timestamp || Date.now(),
      payload: rawEvent
    };
  }
}

export const tikTokAdapter = new TikTokAdapter();
