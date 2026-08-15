import { GIFT_CONFIG } from "../config/gifts";
import { GIFT_RULES_BY_MODE } from "../data/giftRules";

const CONFIG_STORAGE_KEY = "cocoloco_system_config";

/**
 * Configuration Manager: Centralized configuration hub acting as the single source of truth 
 * for system settings (gifts, giftRules, teams, game rules, session parameters).
 */
class ConfigManager {
  constructor() {
    this.config = this.loadConfig() || {
      gifts: GIFT_CONFIG,
      giftRules: GIFT_RULES_BY_MODE,
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
   * Gets a configuration section or specific nested property using dot notation (e.g. "gifts.GIFTS").
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
      if (!current[part]) {
        current[part] = {};
      }
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
