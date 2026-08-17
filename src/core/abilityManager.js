import { ABILITY_REGISTRY } from "../config/abilityRegistry";
import { configManager } from "./configManager";

class AbilityManager {
  constructor() { this.defaultRegistry = ABILITY_REGISTRY; }
  getRegistry() {
    const dynamic = configManager.get("abilities");
    return dynamic ? { ...this.defaultRegistry, ...dynamic } : this.defaultRegistry;
  }
  getAllAbilities() { return Object.values(this.getRegistry()); }
  getAbility(abilityId) { return abilityId ? (this.getRegistry()[abilityId] || null) : null; }
  isAbilityEnabled(abilityId) { const ability = this.getAbility(abilityId); return !!(ability && ability.enabled !== false); }
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
      queueDuration: ability.queueDuration || ability.visualDuration || Math.min(Number(ability.duration) || 10000, 5000),
      timestamp: Date.now(),
      ...context
    };
  }
}

export const abilityManager = new AbilityManager();
