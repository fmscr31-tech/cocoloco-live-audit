import { GIFT_ABILITY_MAP } from "../config/giftAbilityMap";
import { abilityManager } from "./abilityManager";
import { configManager } from "./configManager";

/**
 * Gift Ability Resolver v3 (Type-Safe & Robust)
 * Resolves normalized TikTok gift events into configured ability payloads.
 * Supports canonicalGiftId, giftId, giftName, and aliases safely.
 */
class GiftAbilityResolver {
  constructor() {
    this.defaultMap = GIFT_ABILITY_MAP;
  }

  getMap() {
    const dynamic = configManager.get("abilityGiftMap");

    // Runtime configuration is allowed to override a mapping, but it must not
    // delete canonical/default mappings that were added to the application
    // after an older localStorage config was created. This is especially
    // important for LIVE gifts such as Go Popular -> Cocazo.
    if (!Array.isArray(dynamic)) return this.defaultMap;

    const merged = [...this.defaultMap];
    dynamic.forEach(runtimeMapping => {
      if (!runtimeMapping) return;

      const runtimeId = String(runtimeMapping.giftId ?? "").trim().toLowerCase();
      const runtimeName = String(runtimeMapping.giftName ?? "").trim().toLowerCase();
      const runtimeAbility = String(runtimeMapping.abilityId ?? "").trim().toLowerCase();

      const existingIndex = merged.findIndex(defaultMapping => {
        const defaultId = String(defaultMapping?.giftId ?? "").trim().toLowerCase();
        const defaultName = String(defaultMapping?.giftName ?? "").trim().toLowerCase();
        const defaultAbility = String(defaultMapping?.abilityId ?? "").trim().toLowerCase();

        return (
          (runtimeId && defaultId === runtimeId) ||
          (runtimeName && defaultName === runtimeName) ||
          (runtimeAbility && defaultAbility === runtimeAbility)
        );
      });

      if (existingIndex >= 0) {
        merged[existingIndex] = {
          ...merged[existingIndex],
          ...runtimeMapping,
          aliases: Array.from(new Set([
            ...(merged[existingIndex].aliases || []),
            ...(runtimeMapping.aliases || [])
          ]))
        };
      } else {
        merged.push(runtimeMapping);
      }
    });

    return merged;
  }

  resolveGiftToAbility(event) {
    try {
      if (!event || (!event.giftId && !event.giftName && !event.canonicalGiftId)) {
        return null;
      }

      const canonicalId = String(event.canonicalGiftId ?? "").trim().toLowerCase();
      const giftId = String(event.giftId ?? "").trim().toLowerCase();
      const giftName = String(event.giftName ?? "").trim().toLowerCase();

      const map = this.getMap();

      const mapping = map.find(m => {
        const mId = String(m.giftId ?? "").trim().toLowerCase();
        const mName = String(m.giftName ?? "").trim().toLowerCase();
        return (
          mId === canonicalId ||
          mId === giftId ||
          mId === giftName ||
          mName === canonicalId ||
          mName === giftId ||
          mName === giftName ||
          (m.aliases && m.aliases.some(a => {
            const alias = String(a ?? "").trim().toLowerCase();
            return alias === canonicalId || alias === giftId || alias === giftName;
          }))
        );
      });

      if (!mapping) {
        console.log("[Ability Resolve Failed]", {
          canonicalGiftId: event.canonicalGiftId,
          giftId: event.giftId,
          giftName: event.giftName,
          availableMappings: map
        });
        return null;
      }

      console.log("[ABILITY RESOLVED SUCCESS]", {
        canonicalGiftId: event.canonicalGiftId,
        giftId: event.giftId,
        giftName: event.giftName,
        abilityId: mapping.abilityId
      });

      const sender = event.username || event.displayName || "Viewer";
      const defaultTeam = mapping.abilityId === "epic_impact" ? "team2" : "team1";
      const teamId = event.teamId || defaultTeam;
      const quantity = Number(event.quantity || event.repeatCount || 1);

      const ability = abilityManager.prepareAbilityPayload(mapping.abilityId, {
        abilityId: mapping.abilityId,
        sourceGift: mapping.giftName || mapping.giftId,
        teamId: teamId,
        sender: sender,
        triggeredByGift: mapping.giftName || mapping.giftId,
        username: sender,
        quantity: quantity,
        repeatCount: quantity,
        duration: abilityManager.getAbility(mapping.abilityId)?.duration || 10000
      });

      if (ability && event.duration) {
        ability.duration = event.duration;
      }

      return ability;
    } catch (e) {
      console.error("[GiftAbilityResolver] Exception caught in resolveGiftToAbility:", e);
      return null;
    }
  }
}

export const giftAbilityResolver = new GiftAbilityResolver();
