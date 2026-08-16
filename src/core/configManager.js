import { GIFT_CONFIG } from "../config/gifts";
import { GIFT_RULES_BY_MODE } from "../data/giftRules";
import { ABILITY_REGISTRY } from "../config/abilityRegistry";
import { GIFT_ABILITY_MAP } from "../config/giftAbilityMap";

const CONFIG_STORAGE_KEY = "cocoloco_system_config";
const ABILITY_SOUND_MIGRATION_VERSION = 2;

const DEFAULT_GIFT_SOUNDS = [
  { giftName: "Heart Me", giftId: "heart_me", sound: "/Sounds/mudo.mp3", enabled: true },
  { giftName: "Ice Cream Cone", giftId: "ice_cream_cone", sound: "/Sounds/coconut-sfx.mp3", enabled: true }
];

const DEFAULT_FREEZE_CONFIG = {
  duration: 300,
  scope: "TEAM",
  activationGift: "Twinkling Star",
  activationGiftId: "twinkling_star",
  sound: "/Sounds/5-4-3-2-1-are-you-ready.mp3",
  rescueCount: 2
};

/**
 * Configuration Manager: centralized configuration hub and persistent single
 * source of truth for runtime settings.
 *
 * IMPORTANT:
 * - Existing user configuration is preserved.
 * - One-time migrations only repair known legacy/default values.
 * - After migration, user-selected ability sounds remain authoritative.
 */
class ConfigManager {
  constructor() {
    const stored = this.loadConfig();
    this.config = stored || this.createDefaultConfig();
    this.migrateConfiguration();
  }

  createDefaultConfig() {
    return {
      gifts: GIFT_CONFIG,
      giftRules: GIFT_RULES_BY_MODE,
      abilities: ABILITY_REGISTRY,
      abilityGiftMap: GIFT_ABILITY_MAP,
      giftSounds: DEFAULT_GIFT_SOUNDS,
      battleEffects: {
        freeze: DEFAULT_FREEZE_CONFIG
      },
      teams: {
        maxTeams: 4,
        defaultIcon: "🌴"
      },
      game: {
        defaultTimerMinutes: 20,
        autoStartBattles: false
      },
      session: {
        autoSaveIntervalMs: 5000
      }
    };
  }

  loadConfig() {
    try {
      const data = localStorage.getItem(CONFIG_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  saveConfig() {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      // fallback storage error suppression
    }
  }

  /**
   * Repairs known legacy ability sound defaults exactly once.
   * This does NOT overwrite future user selections.
   */
  migrateConfiguration() {
    let changed = false;

    if (!this.config.abilities || typeof this.config.abilities !== "object") {
      this.config.abilities = { ...ABILITY_REGISTRY };
      changed = true;
    } else if ((this.config.abilitySoundMigrationVersion || 0) < ABILITY_SOUND_MIGRATION_VERSION) {
      const legacySounds = new Set([
        "/5-4-3-2-1-are-you-ready.mp3",
        "/Sounds/5-4-3-2-1-are-you-ready.mp3"
      ]);

      for (const [abilityId, canonicalAbility] of Object.entries(ABILITY_REGISTRY)) {
        const storedAbility = this.config.abilities[abilityId];
        if (!storedAbility) {
          this.config.abilities[abilityId] = { ...canonicalAbility };
          changed = true;
          continue;
        }

        if (legacySounds.has(storedAbility.sound)) {
          this.config.abilities[abilityId] = {
            ...storedAbility,
            sound: canonicalAbility.sound
          };
          changed = true;
        }
      }

      this.config.abilitySoundMigrationVersion = ABILITY_SOUND_MIGRATION_VERSION;
      changed = true;
    }

    if (!Array.isArray(this.config.abilityGiftMap)) {
      this.config.abilityGiftMap = GIFT_ABILITY_MAP;
      changed = true;
    }

    if (!Array.isArray(this.config.giftSounds)) {
      this.config.giftSounds = DEFAULT_GIFT_SOUNDS;
      changed = true;
    }

    if (!this.config.battleEffects || typeof this.config.battleEffects !== "object") {
      this.config.battleEffects = {};
      changed = true;
    }

    if (!this.config.battleEffects.freeze || typeof this.config.battleEffects.freeze !== "object") {
      this.config.battleEffects.freeze = { ...DEFAULT_FREEZE_CONFIG };
      changed = true;
    } else {
      const freeze = this.config.battleEffects.freeze;
      if (!freeze.activationGift || freeze.activationGift === "STAR") {
        freeze.activationGift = DEFAULT_FREEZE_CONFIG.activationGift;
        changed = true;
      }
      if (!freeze.activationGiftId || freeze.activationGiftId === "star") {
        freeze.activationGiftId = DEFAULT_FREEZE_CONFIG.activationGiftId;
        changed = true;
      }
      if (freeze.sound === undefined) {
        freeze.sound = DEFAULT_FREEZE_CONFIG.sound;
        changed = true;
      }
      if (freeze.duration === undefined || freeze.duration === 30 || freeze.duration < 5) {
        freeze.duration = DEFAULT_FREEZE_CONFIG.duration;
        changed = true;
      }
      if (!freeze.scope) {
        freeze.scope = DEFAULT_FREEZE_CONFIG.scope;
        changed = true;
      }
      if (freeze.rescueCount === undefined) {
        freeze.rescueCount = DEFAULT_FREEZE_CONFIG.rescueCount;
        changed = true;
      }
    }

    if (changed) this.persist();
  }

  /**
   * Gets a configuration section or specific nested property using dot notation.
   */
  get(path) {
    if (!path) return this.config;
    const parts = path.split(".");
    let current = this.config;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Updates a configuration section or property and persists the changes.
   */
  set(path, value) {
    if (!path) return;
    const parts = path.split(".");
    let current = this.config;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) current[part] = {};
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
    this.persist();
  }

  persist() {
    this.saveConfig();
  }
}

export const configManager = new ConfigManager();
