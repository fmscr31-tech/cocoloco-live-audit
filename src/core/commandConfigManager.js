import { eventBus } from "./eventBus";
import { getDefaultGenderTeams, isGenderTeamsMode } from "./genderTeamsMode";

const STORAGE_KEY_COMMAND_CONFIG = "cocoloco_command_config_v3";

class CommandConfigManager {
  constructor() {
    this.config = this.loadFromStorage() || {
      registrationMode: "MIXED",
      gameRegistrationMode: "INDIVIDUAL",
      individualCommand: "entrar",
      minPlayers: 1,
      maxPlayers: 100,
      winLimpia: { enabled: true, points: 1 },
      teams: [
        { id: "team1", name: "Espartanos", color: "#ff3366", commands: ["!esp"], minPlayers: 1, maxPlayers: 50, gifts: [] },
        { id: "team2", name: "Princesas", color: "#00bfff", commands: ["!prin"], minPlayers: 1, maxPlayers: 50, gifts: [] }
      ]
    };
    this._sanitizeWinConfig();
    this._ensureGenderTeamsConfig();
    eventBus.subscribe("config:command_updated", ({ config: incoming } = {}) => {
      if (!incoming || typeof incoming !== "object") return;
      this.config = JSON.parse(JSON.stringify(incoming));
      this._sanitizeWinConfig();
      this._ensureGenderTeamsConfig();
      this.saveToStorage();
    });
    if (typeof window !== "undefined") window.addEventListener("storage", event => {
      if (event.key !== STORAGE_KEY_COMMAND_CONFIG || !event.newValue) return;
      try {
        this.config = JSON.parse(event.newValue);
        this._sanitizeWinConfig(); this._ensureGenderTeamsConfig(); this.saveToStorage();
        eventBus.emit("config:command_updated", { config: this.getConfig(), timestamp: Date.now() });
      } catch (error) { console.warn("[CommandConfigManager] Failed to process storage update:", error); }
    });
  }

  _sanitizeWinConfig() {
    const current = this.config?.winLimpia || {};
    this.config.winLimpia = { enabled: current.enabled !== false, points: Number(current.points) || 1 };
    if (Object.prototype.hasOwnProperty.call(this.config.winLimpia, "correctAnswer")) delete this.config.winLimpia.correctAnswer;
    this.saveToStorage();
  }

  _ensureGenderTeamsConfig() {
    if (!Array.isArray(this.config.teams)) this.config.teams = [];
    if (isGenderTeamsMode(this.config.gameRegistrationMode) && this.config.teams.length < 2) this.config.teams = getDefaultGenderTeams();
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COMMAND_CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.individualCommand || parsed.individualCommand === "a") parsed.individualCommand = "entrar";
        return parsed;
      }
    } catch (e) { console.warn("[CommandConfigManager] Failed to load from storage:", e); }
    return null;
  }
  refreshFromStorage() { const persisted = this.loadFromStorage(); if (persisted) { this.config = JSON.parse(JSON.stringify(persisted)); this._sanitizeWinConfig(); this._ensureGenderTeamsConfig(); } return this.getConfig(); }
  saveToStorage() { try { localStorage.setItem(STORAGE_KEY_COMMAND_CONFIG, JSON.stringify(this.config)); } catch (e) {} }
  getConfig() { return JSON.parse(JSON.stringify(this.config)); }

  setRegistrationMode(mode) {
    if (!["CHAT", "GIFT", "MANUAL", "MIXED"].includes(mode)) return false;
    this.config.registrationMode = mode; this.saveToStorage(); this._publishUpdate(); return true;
  }

  updateFullConfig(newConfig) {
    const validation = this.validateConfig(newConfig);
    if (!validation.valid) return { success: false, errors: validation.errors };
    if (newConfig.registrationMode !== undefined) this.config.registrationMode = newConfig.registrationMode;
    if (newConfig.gameRegistrationMode !== undefined) this.config.gameRegistrationMode = newConfig.gameRegistrationMode;
    if (newConfig.individualCommand !== undefined) this.config.individualCommand = newConfig.individualCommand.trim().toLowerCase();
    if (newConfig.minPlayers !== undefined) this.config.minPlayers = Number(newConfig.minPlayers) || 1;
    if (newConfig.maxPlayers !== undefined) this.config.maxPlayers = Number(newConfig.maxPlayers) || 100;
    if (newConfig.winLimpia !== undefined) this.config.winLimpia = { enabled: newConfig.winLimpia.enabled !== false, points: Number(newConfig.winLimpia.points) || 1 };
    if (Array.isArray(newConfig.teams)) this.config.teams = newConfig.teams.map((t, idx) => ({ id: t.id || `team_${idx + 1}`, name: t.name || `Equipo ${idx + 1}`, color: t.color || (idx === 0 ? "#ff3366" : idx === 1 ? "#00bfff" : "#ffd700"), commands: Array.isArray(t.commands) ? t.commands.map(c => c.trim().toLowerCase()).filter(Boolean) : [`!t${idx + 1}`], minPlayers: Number(t.minPlayers) || 1, maxPlayers: Number(t.maxPlayers) || 50, gifts: t.gifts || [] }));
    this._ensureGenderTeamsConfig(); this._sanitizeWinConfig(); this.saveToStorage(); this._publishUpdate(); return { success: true };
  }

  validateConfig(cfg) {
    const errors = [];
    const mode = cfg.gameRegistrationMode || this.config.gameRegistrationMode;
    const indCmd = (cfg.individualCommand !== undefined ? cfg.individualCommand : this.config.individualCommand).trim().toLowerCase();
    const minP = Number(cfg.minPlayers !== undefined ? cfg.minPlayers : this.config.minPlayers);
    const maxP = Number(cfg.maxPlayers !== undefined ? cfg.maxPlayers : this.config.maxPlayers);
    if (mode === "INDIVIDUAL") {
      if (!indCmd) errors.push("El comando individual no puede estar vacío.");
      if (minP < 1) errors.push("El mínimo de jugadores debe ser al menos 1.");
      if (maxP < minP) errors.push("El máximo debe ser mayor o igual al mínimo.");
    } else if (mode === "TEAMS" || mode === "TEAM" || isGenderTeamsMode(mode)) {
      const teams = cfg.teams || (isGenderTeamsMode(mode) ? getDefaultGenderTeams() : this.config.teams);
      if (!Array.isArray(teams) || teams.length !== 2 && isGenderTeamsMode(mode)) errors.push("El modo Chicos vs Chicas requiere exactamente 2 equipos.");
      if (!Array.isArray(teams) || teams.length < 2) errors.push("Se requieren al menos 2 equipos.");
      const allCommands = new Set(), allNames = new Set();
      (teams || []).forEach((t, idx) => {
        const name = (t.name || "").trim(); const cmds = Array.isArray(t.commands) ? t.commands.map(c => c.trim().toLowerCase()).filter(Boolean) : [];
        const tMin = Number(t.minPlayers) || 1, tMax = Number(t.maxPlayers) || 50;
        if (!name) errors.push(`El equipo ${idx + 1} no tiene nombre.`);
        if (allNames.has(name.toLowerCase())) errors.push(`El nombre de equipo "${name}" está duplicado.`); allNames.add(name.toLowerCase());
        if (!cmds.length) errors.push(`El equipo ${name || idx + 1} no tiene comandos definidos.`);
        cmds.forEach(cmd => { if (allCommands.has(cmd)) errors.push(`El comando "${cmd}" está duplicado.`); allCommands.add(cmd); });
        if (tMin < 1) errors.push(`El equipo ${name} tiene un mínimo inválido.`);
        if (tMax < tMin) errors.push(`El equipo ${name} tiene un máximo menor que su mínimo.`);
      });
    }
    return { valid: errors.length === 0, errors };
  }
  _publishUpdate() { eventBus.publish("config:command_updated", { config: this.getConfig(), timestamp: Date.now() }); }
}
export const commandConfigManager = new CommandConfigManager();
