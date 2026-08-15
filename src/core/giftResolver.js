import { MASTER_GIFTS } from "../data/gifts";
import { GIFT_RULES_BY_MODE } from "../data/giftRules";
import { configManager } from "./configManager";

/**
 * Gift Resolver v6 (Type-Safe Strict Explicit Rule Enforcement)
 * Resolves normalized TikTok gift events strictly against explicit active operator configuration.
 */
class GiftResolver {
  /**
   * Resolves a normalized gift event into a game action.
   * @param {Object} event - { giftId, username, quantity }
   * @param {string} gameMode - e.g. "context", "vs_battle", "tournament", "INDIVIDUAL", "TEAM", "TEAMS"
   * @returns {Object|null} Resolved action object or null if unconfigured/unknown
   */
  resolveGiftEvent(event, gameMode = "context") {
    if (!event || (!event.giftId && !event.giftName)) {
      console.warn("[GiftResolver] Invalid gift event received:", event);
      return null;
    }

    const searchKey = String(event.giftId || event.giftName || "").trim().toLowerCase();

    // 1. Load rules from configManager with static fail-safe fallback
    let rulesSource = GIFT_RULES_BY_MODE;
    try {
      const configuredRules = configManager.get("giftRules");
      if (configuredRules && typeof configuredRules === "object") {
        rulesSource = configuredRules;
      }
    } catch (e) {
      console.warn("[GiftResolver] Failed to load rules from configManager:", e);
    }

    // 2. Search strictly for an explicit active rule in active gameMode (or fallback mode)
    let modeRules = rulesSource[gameMode] || rulesSource["context"] || rulesSource["INDIVIDUAL"] || rulesSource["TEAM"] || rulesSource["TEAMS"] || [];
    let rule = modeRules.find(r => r.giftId && String(r.giftId ?? "").trim().toLowerCase() === searchKey && r.active !== false);

    if (!rule) {
      // Search across all modes in rulesSource
      for (const modeKey of Object.keys(rulesSource)) {
        const found = (rulesSource[modeKey] || []).find(r => r.giftId && String(r.giftId ?? "").trim().toLowerCase() === searchKey && r.active !== false);
        if (found) {
          rule = found;
          break;
        }
      }
    }

    // STRICT BUSINESS RULE: If no explicit rule is configured, return null (+0 points).
    if (!rule) {
      console.log(`[GiftResolver] Unconfigured gift received: "${searchKey}". No explicit active rule found. Returning null (+0 points).`);
      return null;
    }

    const quantity = Number(event.quantity || event.repeatCount || 1);
    const baseValue = Number(rule.value || 0);

    // 3. Return resolved action object with configured value * quantity
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
