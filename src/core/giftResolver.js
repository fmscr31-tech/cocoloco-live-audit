import { MASTER_GIFTS } from "../data/gifts.js";
import { GIFT_RULES_BY_MODE } from "../data/giftRules.js";
import { configManager } from "./configManager.js";

/**
 * Gift Resolver v6 (Type-Safe Strict Explicit Rule Enforcement)
 * Resolves normalized TikTok gift events strictly against explicit active operator configuration.
 */
class GiftResolver {
  resolveGiftEvent(event, gameMode = "context") {
    if (!event || (!event.giftId && !event.giftName)) {
      console.warn("[GiftResolver] Invalid gift event received:", event);
      return null;
    }

    const searchKey = String(event.giftId || event.giftName || "").trim().toLowerCase();

    let rulesSource = GIFT_RULES_BY_MODE;
    try {
      const configuredRules = configManager.get("giftRules");
      if (configuredRules && typeof configuredRules === "object") rulesSource = configuredRules;
    } catch (e) {
      console.warn("[GiftResolver] Failed to load rules from configManager:", e);
    }

    let modeRules = rulesSource[gameMode] || rulesSource["context"] || rulesSource["INDIVIDUAL"] || rulesSource["TEAM"] || rulesSource["TEAMS"] || [];
    let rule = modeRules.find(r => r.giftId && String(r.giftId ?? "").trim().toLowerCase() === searchKey && r.active !== false);

    if (!rule) {
      for (const modeKey of Object.keys(rulesSource)) {
        const found = (rulesSource[modeKey] || []).find(r => r.giftId && String(r.giftId ?? "").trim().toLowerCase() === searchKey && r.active !== false);
        if (found) {
          rule = found;
          break;
        }
      }
    }

    if (!rule) {
      console.log(`[GiftResolver] Unconfigured gift received: "${searchKey}". No explicit active rule found. Returning null (+0 points).`);
      return null;
    }

    const quantity = Number(event.quantity || event.repeatCount || 1);
    const baseValue = Number(rule.value || 0);

    return {
      gift: {
        id: searchKey,
        name: rule.displayName || event.giftName || event.giftId || searchKey
      },
      username: event.username || event.displayName || "Viewer",
      action: rule.action || "Add points",
      value: baseValue * quantity,
      team: rule.team || "All Teams"
    };
  }
}

export const giftResolver = new GiftResolver();
