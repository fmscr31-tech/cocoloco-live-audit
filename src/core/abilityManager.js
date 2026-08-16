import { ABILITY_REGISTRY } from "../config/abilityRegistry";
import { configManager } from "./configManager";

/**
 * Ability Manager Service v1
 * Manages loading, validation, and payload preparation for configurable game abilities.
 */
class AbilityManager {
  constructor() {
    this.defaultRegistry = ABILITY_REGISTRY;
  }

  getRegistry() {
    const dynamic = configManager.get("abilities");
    if (dynamic) {
      return { ...this.defaultRegistry, ...dynamic };
    }
    return this.defaultRegistry;
  }

  getAllAbilities() {
    return Object.values(this.getRegistry());
  }

  getAbility(abilityId) {
    if (!abilityId) return null;
    const reg = this.getRegistry();
    return reg[abilityId] || null;
  }

  isAbilityEnabled(abilityId) {
    const ability = this.getAbility(abilityId);
    return !!(ability && ability.enabled !== false);
  }

  prepareAbilityPayload(abilityId, context = {}) {
    const ability = this.getAbility(abilityId);
    if (!ability || !this.isAbilityEnabled(abilityId)) {
      console.warn(`[AbilityManager] Ability not found or disabled: ${abilityId}`);
      return null;
    }

    return {
      abilityId: ability.abilityId,
      display: { ...ability.display },
      gameAction: { ...ability.gameAction },
      scoreAction: { ...ability.scoreAction },
      sound: ability.sound || null,
      duration: ability.duration || 10000,
      timestamp: Date.now(),
      ...context
    };
  }
}

export const abilityManager = new AbilityManager();
