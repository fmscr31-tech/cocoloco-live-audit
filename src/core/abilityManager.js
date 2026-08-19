import { ABILITY_REGISTRY } from "../config/abilityRegistry";
import { configManager } from "./configManager";

/**
 * Authoritative ability runtime bridge.
 *
 * The registry is the immutable safety net for LIVE. Runtime configuration may
 * override individual properties, but it must never disconnect the canonical
 * sound or animation from an ability when a persisted config is incomplete.
 */
class AbilityManager {
  constructor() {
    this.defaultRegistry = ABILITY_REGISTRY;
  }

  getRegistry() {
    const dynamic = configManager.get("abilities");
    if (!dynamic || typeof dynamic !== "object") return this.defaultRegistry;

    const merged = { ...this.defaultRegistry };

    Object.entries(dynamic).forEach(([abilityId, runtime]) => {
      if (!runtime || typeof runtime !== "object") return;
      const base = this.defaultRegistry[abilityId] || {};

      merged[abilityId] = {
        ...base,
        ...runtime,
        display: {
          ...(base.display || {}),
          ...(runtime.display || {})
        },
        gameAction: {
          ...(base.gameAction || {}),
          ...(runtime.gameAction || {})
        },
        scoreAction: {
          ...(base.scoreAction || {}),
          ...(runtime.scoreAction || {})
        },
        // Never allow an incomplete persisted config to sever the canonical
        // media connection.
        sound: runtime.sound || base.sound || null,
        animation:
          runtime.animation ||
          runtime.display?.animation ||
          base.animation ||
          base.display?.animation ||
          ""
      };
    });

    // Normalize every canonical ability, including abilities that were never
    // present in persisted runtime configuration.
    Object.entries(merged).forEach(([abilityId, ability]) => {
      if (!ability || typeof ability !== "object") return;
      merged[abilityId] = {
        ...ability,
        sound: ability.sound || this.defaultRegistry[abilityId]?.sound || null,
        animation:
          ability.animation ||
          ability.display?.animation ||
          this.defaultRegistry[abilityId]?.animation ||
          this.defaultRegistry[abilityId]?.display?.animation ||
          ""
      };
    });

    return merged;
  }

  getAllAbilities() {
    return Object.values(this.getRegistry());
  }

  getAbility(abilityId) {
    return abilityId ? (this.getRegistry()[abilityId] || null) : null;
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

    const animation =
      ability.animation ||
      ability.display?.animation ||
      this.defaultRegistry[abilityId]?.animation ||
      this.defaultRegistry[abilityId]?.display?.animation ||
      "";

    const sound =
      ability.sound ||
      this.defaultRegistry[abilityId]?.sound ||
      null;

    return {
      abilityId: ability.abilityId || abilityId,
      display: { ...(ability.display || {}), animation },
      gameAction: { ...(ability.gameAction || {}) },
      scoreAction: { ...(ability.scoreAction || {}) },
      sound,
      animation,
      duration: ability.duration || 10000,
      queueDuration:
        ability.queueDuration ||
        ability.visualDuration ||
        Math.min(Number(ability.duration) || 10000, 5000),
      timestamp: Date.now(),
      ...context,
      // Context must not overwrite canonical media with an empty value.
      sound: context.sound || sound,
      animation: context.animation || animation
    };
  }
}

export const abilityManager = new AbilityManager();
