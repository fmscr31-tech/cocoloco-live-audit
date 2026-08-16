import { eventBus } from "./eventBus";

const STORAGE_KEY_COMMAND_CONFIG = "cocoloco_command_config_v3";

/**
 * Command Configuration Manager v3
 * Stores configuration used by chat and gift parsers for player registration, team assignment,
 * and Win Limpia correct answer detection during active rounds.
 */
class CommandConfigManager {
  constructor() {
    this.config = this.loadFromStorage() || {
      registrationMode: "MIXED", // CHAT, GIFT, MANUAL, MIXED
      gameRegistrationMode: "INDIVIDUAL", // "INDIVIDUAL" or "TEAMS"
      individualCommand: "entrar",
      minPlayers: 1,
      maxPlayers: 100,
      winLimpia: {
        enabled: true,
        correctAnswer: "clase",
        points: 1
      },
      teams: [
        {
          id: "team1",
          name: "Espartanos",
          color: "#ff3366",
          commands: ["!esp"],
          minPlayers: 1,
          maxPlayers: 50,
          gifts: []
        },
        {
          id: "team2",
          name: "Princesas",
          color: "#00bfff",
          commands: ["!prin"],
          minPlayers: 1,
          maxPlayers: 50,
          gifts: []
        }
      ]
    };

    // IMPORTANT: the Admin panel and the LIVE connector/overlay can run in
    // different browser contexts. localStorage is persistent but does not
    // update an already-instantiated module in another tab/window. The
    // BroadcastChannel-backed EventBus therefore has to update this manager's
    // in-memory config when the operator changes Win Limpia from another
    // context. Without this listener, the LIVE parser can keep using an old
    // answer such as "clase" even after the Admin panel saves "programa".
    eventBus.subscribe("config:command_updated", (payload = {}) => {
      const incoming = payload?.config;
      if (!incoming || typeof incoming !== "object") return;

      this.config = JSON.parse(JSON.stringify(incoming));
      this.saveToStorage();

      console.log("[CommandConfigManager] Remote configuration synchronized.", {
        winLimpia: this.config.winLimpia,
        source: "BROADCAST_CHANNEL"
      });
    });
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COMMAND_CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.individualCommand || parsed.individualCommand === "a") {
          parsed.individualCommand = "entrar";
        }
        return parsed;
      }
    } catch (e) {
      console.warn("[CommandConfigManager] Failed to load from storage:", e);
    }
    return null;
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_COMMAND_CONFIG, JSON.stringify(this.config));
    } catch (e) {
      console.warn("[CommandConfigManager] Failed to save to storage:", e);
    }
  }

  /**
   * Returns current configuration snapshot.
   */
  getConfig() {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Updates registration mode (CHAT, GIFT, MANUAL, MIXED).
   */
  setRegistrationMode(mode) {
    const validModes = ["CHAT", "GIFT", "MANUAL", "MIXED"];
    if (!validModes.includes(mode)) {
      console.warn(`[CommandConfigManager] Invalid registration mode: ${mode}`);
      return false;
    }

    this.config.registrationMode = mode;
    this.saveToStorage();
    console.log(`[CommandConfigManager] Registration mode set to: ${mode}`);
    this._publishUpdate();
    return true;
  }

  /**
   * Updates full configuration with validation.
   */
  updateFullConfig(newConfig) {
    const validation = this.validateConfig(newConfig);
    if (!validation.valid) {
      console.warn(`[CommandConfigManager] Configuration validation failed:`, validation.errors);
      return { success: false, errors: validation.errors };
    }

    if (newConfig.registrationMode !== undefined) this.config.registrationMode = newConfig.registrationMode;
    if (newConfig.gameRegistrationMode !== undefined) this.config.gameRegistrationMode = newConfig.gameRegistrationMode;
    if (newConfig.individualCommand !== undefined) this.config.individualCommand = newConfig.individualCommand.trim().toLowerCase();
    if (newConfig.minPlayers !== undefined) this.config.minPlayers = Number(newConfig.minPlayers) || 1;
    if (newConfig.maxPlayers !== undefined) this.config.maxPlayers = Number(newConfig.maxPlayers) || 100;
    if (newConfig.winLimpia !== undefined) {
      this.config.winLimpia = {
        enabled: newConfig.winLimpia.enabled !== false,
        correctAnswer: (newConfig.winLimpia.correctAnswer || "clase").trim().toLowerCase(),
        points: Number(newConfig.winLimpia.points) || 1
      };
    }
    if (Array.isArray(newConfig.teams)) {
      this.config.teams = newConfig.teams.map((t, idx) => ({
        id: t.id || `team_${idx + 1}`,
        name: t.name || `Equipo ${idx + 1}`,
        color: t.color || (idx === 0 ? "#ff3366" : idx === 1 ? "#00bfff" : "#ffd700"),
        commands: Array.isArray(t.commands) ? t.commands.map(c => c.trim().toLowerCase()) : [`!t${idx + 1}`],
        minPlayers: Number(t.minPlayers) || 1,
        maxPlayers: Number(t.maxPlayers) || 50,
        gifts: t.gifts || []
      }));
    }

    this.saveToStorage();
    console.log("[CommandConfigManager] Full configuration updated successfully.", this.config);
    this._publishUpdate();
    return { success: true };
  }

  /**
   * Validates configuration rules: unique commands, valid numbers, non-empty names.
   */
  validateConfig(cfg) {
    const errors = [];
    const mode = cfg.gameRegistrationMode || this.config.gameRegistrationMode;
    const indCmd = (cfg.individualCommand !== undefined ? cfg.individualCommand : this.config.individualCommand).trim().toLowerCase();
    const minP = Number(cfg.minPlayers !== undefined ? cfg.minPlayers : this.config.minPlayers);
    const maxP = Number(cfg.maxPlayers !== undefined ? cfg.maxPlayers : this.config.maxPlayers);

    if (mode === "INDIVIDUAL") {
      if (!indCmd) errors.push("El comando individual no puede estar vacío.");
      if (minP < 1) errors.push("El mínimo de jugadores debe ser al menos 1.");
      if (maxP < minP) errors.push("El máximo de jugadores debe ser mayor o igual al mínimo.");
    } else if (mode === "TEAMS" || mode === "TEAM") {
      const teams = cfg.teams || this.config.teams;
      if (!Array.isArray(teams) || teams.length < 2) {
        errors.push("Se requieren al menos 2 equipos para el modo equipos.");
      }

      const allCommands = new Set();
      const allNames = new Set();

      teams.forEach((t, idx) => {
        const name = (t.name || "").trim();
        const cmds = Array.isArray(t.commands) ? t.commands.map(c => c.trim().toLowerCase()) : [];
        const tMin = Number(t.minPlayers) || 1;
        const tMax = Number(t.maxPlayers) || 50;

        if (!name) errors.push(`El equipo ${idx + 1} no tiene nombre.`);
        if (allNames.has(name.toLowerCase())) errors.push(`El nombre de equipo "${name}" está duplicado.`);
        allNames.add(name.toLowerCase());

        if (cmds.length === 0) errors.push(`El equipo ${name || idx + 1} no tiene comandos definidos.`);
        cmds.forEach(cmd => {
          if (allCommands.has(cmd)) errors.push(`El comando "${cmd}" está duplicado.`);
          allCommands.add(cmd);
          if (mode === "INDIVIDUAL" && cmd === indCmd) {
            errors.push(`El comando "${cmd}" entra en conflicto con el comando individual.`);
          }
        });

        if (tMin < 1) errors.push(`El equipo ${name} tiene un mínimo inválido (debe ser >= 1).`);
        if (tMax < tMin) errors.push(`El equipo ${name} tiene un máximo menor que su mínimo.`);
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  _publishUpdate() {
    eventBus.publish("config:command_updated", { config: this.getConfig(), timestamp: Date.now() });
  }
}

export const commandConfigManager = new CommandConfigManager();
