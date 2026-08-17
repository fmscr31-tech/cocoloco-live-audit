import { GIFT_ABILITY_MAP } from "../config/giftAbilityMap";
import { abilityManager } from "./abilityManager";
import { configManager } from "./configManager";

class GiftAbilityResolver {
  constructor() { this.defaultMap = GIFT_ABILITY_MAP; }

  getMap() {
    const dynamic = configManager.get("abilityGiftMap");
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
        return (runtimeId && defaultId === runtimeId) || (runtimeName && defaultName === runtimeName) || (runtimeAbility && defaultAbility === runtimeAbility);
      });
      if (existingIndex >= 0) merged[existingIndex] = { ...merged[existingIndex], ...runtimeMapping, aliases: Array.from(new Set([...(merged[existingIndex].aliases || []), ...(runtimeMapping.aliases || [])])) };
      else merged.push(runtimeMapping);
    });
    return merged;
  }

  resolveGiftToAbility(event) {
    try {
      if (!event || (!event.giftId && !event.giftName && !event.canonicalGiftId)) return null;
      const canonicalId = String(event.canonicalGiftId ?? "").trim().toLowerCase();
      const giftId = String(event.giftId ?? "").trim().toLowerCase();
      const giftName = String(event.giftName ?? "").trim().toLowerCase();
      const mapping = this.getMap().find(m => {
        const mId = String(m.giftId ?? "").trim().toLowerCase();
        const mName = String(m.giftName ?? "").trim().toLowerCase();
        return mId === canonicalId || mId === giftId || mId === giftName || mName === canonicalId || mName === giftId || mName === giftName || (m.aliases && m.aliases.some(a => [canonicalId, giftId, giftName].includes(String(a ?? "").trim().toLowerCase())));
      });

      const abilityId = mapping?.abilityId || "generic_gift";
      const abilityDefinition = abilityManager.getAbility(abilityId);
      if (!abilityDefinition) {
        console.error("[Ability Resolve Failed] Missing ability definition:", { abilityId, canonicalGiftId: event.canonicalGiftId, giftId: event.giftId, giftName: event.giftName });
        return null;
      }

      const sender = event.displayName || event.username || "Viewer";
      const quantity = Math.max(1, Number(event.quantity || event.repeatCount || 1));
      const teamId = event.teamId || null;
      const sourceGift = mapping?.giftName || event.giftName || event.canonicalGiftId || event.giftId || "Gift";

      console.log(mapping ? "[ABILITY RESOLVED SUCCESS]" : "[GENERIC GIFT RESOLVED]", {
        canonicalGiftId: event.canonicalGiftId,
        giftId: event.giftId,
        giftName: event.giftName,
        abilityId,
        playerId: event.playerId,
        userId: event.userId,
        displayName: sender,
        quantity
      });

      const ability = abilityManager.prepareAbilityPayload(abilityId, {
        abilityId,
        sourceGift,
        canonicalGiftId: event.canonicalGiftId,
        giftId: event.giftId,
        giftName: event.giftName || sourceGift,
        playerId: event.playerId || event.userId || "",
        userId: event.userId || event.playerId || "",
        teamId,
        sender,
        displayName: sender,
        avatar: event.avatar || "",
        triggeredByGift: sourceGift,
        username: event.username || sender,
        quantity,
        repeatCount: quantity,
        duration: abilityDefinition.duration || 10000,
        genericGift: !mapping
      });
      if (ability && event.duration) ability.duration = event.duration;
      return ability;
    } catch (e) {
      console.error("[GiftAbilityResolver] Exception caught in resolveGiftToAbility:", e);
      return null;
    }
  }
}

export const giftAbilityResolver = new GiftAbilityResolver();
