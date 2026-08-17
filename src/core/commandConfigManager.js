import { eventBus } from "./eventBus";
import { getDefaultGenderTeams, isGenderTeamsMode } from "./genderTeamsMode";

const STORAGE_KEY_COMMAND_CONFIG = "cocoloco_command_config_v3";

class CommandConfigManager {
  constructor() {
    this.config = this.loadFromStorage() || {
      registrationMode: "MIXED",
      gameRegistrationMode: "INDIVIDUAL",
      individualCommand: "entrar",
      individualRegistrationMethod: "command",
      individualRegistrationGift: "",
      individualRegistrationGiftAsset: "",
      individualRegistrationGiftImage: "",
      minPlayers: 1,
      maxPlayers: 100,
      winLimpia: { enabled: true, points: 1 },
      teams: [
        { id: "team1", name: "Espartanos", color: "#ff3366", commands: ["!esp"], minPlayers: 1, maxPlayers: 50, gifts: [] },
        { id: "team2", name: "Princesas", color: "#00bfff", commands: ["!prin"], minPlayers: 1, maxPlayers: 50, gifts: [] }
      ]
    };

    this._sanitizeWinConfig();
    this._sanitizeIndividualRegistrationConfig();
    this._ensureGenderTeamsConfig();
    this._installGenderModeOption();

    eventBus.subscribe("config:command_updated", (payload = {}) => {
      const incoming = payload?.config;
      if (!incoming || typeof incoming !== "object") return;
      this.config = JSON.parse(JSON.stringify(incoming));
      this._sanitizeWinConfig();
      this._sanitizeIndividualRegistrationConfig();
      this._ensureGenderTeamsConfig();
      this.saveToStorage();
      this._installGenderModeOption();
      console.log("[CommandConfigManager] Remote configuration synchronized.");
    });

    if (typeof window !== "undefined") {
      window.addEventListener("storage", (event) => {
        if (event.key !== STORAGE_KEY_COMMAND_CONFIG || !event.newValue) return;
        try {
          const parsed = JSON.parse(event.newValue);
          if (!parsed || typeof parsed !== "object") return;
          this.config = JSON.parse(JSON.stringify(parsed));
          this._sanitizeWinConfig();
          this._sanitizeIndividualRegistrationConfig();
          this._ensureGenderTeamsConfig();
          this.saveToStorage();
          eventBus.emit("config:command_updated", { config: this.getConfig(), timestamp: Date.now() });
        } catch (error) {
          console.warn("[CommandConfigManager] Failed to process storage update:", error);
        }
      });
    }
  }

  _installGenderModeOption() {
    if (typeof document === "undefined") return;
    const install = () => {
      document.querySelectorAll("select").forEach((select) => {
        const options = Array.from(select.options);
        const isModeSelector = options.some(o => o.value === "INDIVIDUAL") && options.some(o => o.value === "TEAMS");
        if (!isModeSelector || options.some(o => o.value === "GENDER_TEAMS")) return;
        const option = document.createElement("option");
        option.value = "GENDER_TEAMS";
        option.textContent = "CHICOS VS CHICAS";
        select.appendChild(option);
      });
    };
    install();
    if (typeof MutationObserver !== "undefined" && !this._genderModeObserver) {
      this._genderModeObserver = new MutationObserver(install);
      this._genderModeObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  _sanitizeIndividualRegistrationConfig() {
    const validMethods = ["command", "gift"];
    if (!validMethods.includes(String(this.config.individualRegistrationMethod || "").toLowerCase())) this.config.individualRegistrationMethod = "command";
    this.config.individualCommand = String(this.config.individualCommand || "entrar").trim().toLowerCase() || "entrar";
    this.config.individualRegistrationGift = String(this.config.individualRegistrationGift || "").trim();
    this.config.individualRegistrationGiftAsset = String(this.config.individualRegistrationGiftAsset || "").trim();
    this.config.individualRegistrationGiftImage = String(this.config.individualRegistrationGiftImage || "").trim();
  }

  _ensureGenderTeamsConfig() {
    if (!Array.isArray(this.config.teams)) this.config.teams = [];
    if (isGenderTeamsMode(this.config.gameRegistrationMode) && this.config.teams.length < 2) {
      this.config.teams = getDefaultGenderTeams();
    }
  }

  _sanitizeWinConfig() {
    const current = this.config?.winLimpia || {};
    this.config.winLimpia = { enabled: current.enabled !== false, points: Number(current.points) || 1 };
    if (Object.prototype.hasOwnProperty.call(this.config.winLimpia, "correctAnswer")) delete this.config.winLimpia.correctAnswer;
    this.saveToStorage();
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COMMAND_CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.individualCommand || parsed.individualCommand === "a") parsed.individualCommand = "entrar";
        return parsed;
      }
    } catch (e) {
      console.warn("[CommandConfigManager] Failed to load from storage:", e);
    }
    return null;
  }

  refreshFromStorage() {
    const persisted = this.loadFromStorage();
    if (persisted && typeof persisted === "object") {
      this.config = JSON.parse(JSON.stringify(persisted));
      this._sanitizeWinConfig();
      this._sanitizeIndividualRegistrationConfig();
      this._ensureGenderTeamsConfig();
    }
    return this.getConfig();
  }

  saveToStorage() {
    try { localStorage.setItem(STORAGE_KEY_COMMAND_CONFIG, JSON.stringify(this.config)); }
    catch (e) { console.warn("[CommandConfigManager] Failed to save to storage:", e); }
  }

  getConfig() { return JSON.parse(JSON.stringify(this.config)); }

  setIndividualRegistration(options = {}) {
    const method = String(options.method || "command").toLowerCase() === "gift" ? "gift" : "command";
    this.config.individualRegistrationMethod = method;
    if (options.command !== undefined) this.config.individualCommand = String(options.command).trim().toLowerCase();
    if (options.giftName !== undefined) this.config.individualRegistrationGift = String(options.giftName).trim();
    if (options.giftAsset !== undefined) this.config.individualRegistrationGiftAsset = String(options.giftAsset).trim();
    if (options.giftImage !== undefined) this.config.individualRegistrationGiftImage = String(options.giftImage).trim();
    this._sanitizeIndividualRegistrationConfig();
    this.saveToStorage();
    this._publishUpdate();
    return this.getConfig();
  }

  setRegistrationMode(mode) {
    const validModes = ["CHAT", "GIFT", "MANUAL", "MIXED"];
    if (!validModes.includes(mode)) return false;
    this.config.registrationMode = mode;
    this.saveToStorage();
    this._publishUpdate();
    return true;
  }

  updateFullConfig(newConfig) {
    const validation = this.validateConfig(newConfig);
    if (!validation.valid) return { success: false, errors: validation.errors };

    if (newConfig.registrationMode !== undefined) this.config.registrationMode = newConfig.registrationMode;
    if (newConfig.gameRegistrationMode !== undefined) this.config.gameRegistrationMode = newConfig.gameRegistrationMode;
    if (newConfig.individualCommand !== undefined) this.config.individualCommand = newConfig.individualCommand.trim().toLowerCase();
    if (newConfig.individualRegistrationMethod !== undefined) this.config.individualRegistrationMethod = newConfig.individualRegistrationMethod;
    if (newConfig.individualRegistrationGift !== undefined) this.config.individualRegistrationGift = newConfig.individualRegistrationGift;
    if (newConfig.individualRegistrationGiftAsset !== undefined) this.config.individualRegistrationGiftAsset = newConfig.individualRegistrationGiftAsset;
    if (newConfig.individualRegistrationGiftImage !== undefined) this.config.individualRegistrationGiftImage = newConfig.individualRegistrationGiftImage;
    if (newConfig.minPlayers !== undefined) this.config.minPlayers = Number(newConfig.minPlayers) || 1;
    if (newConfig.maxPlayers !== undefined) this.config.maxPlayers = Number(newConfig.maxPlayers) || 100;

    if (newConfig.winLimpia !== undefined) {
      this.config.winLimpia = {
        enabled: newConfig.winLimpia.enabled !== false,
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

    this._ensureGenderTeamsConfig();
    this._sanitizeWinConfig();
    this._sanitizeIndividualRegistrationConfig();
    this.saveToStorage();
    this._installGenderModeOption();
    this._publishUpdate();
    return { success: true };
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
      if (maxP < minP) errors.push("El máximo de jugadores debe ser mayor o igual al mínimo.");
      const method = String(cfg.individualRegistrationMethod !== undefined ? cfg.individualRegistrationMethod : this.config.individualRegistrationMethod).toLowerCase();
      const giftName = String(cfg.individualRegistrationGift !== undefined ? cfg.individualRegistrationGift : this.config.individualRegistrationGift).trim();
      if (!["command", "gift"].includes(method)) errors.push("El método de inscripción individual debe ser comando o regalo.");
      if (method === "gift" && !giftName) errors.push("Selecciona un regalo para la inscripción individual.");
    } else if (mode === "TEAMS" || mode === "TEAM" || isGenderTeamsMode(mode)) {
      const teams = cfg.teams || (isGenderTeamsMode(mode) ? getDefaultGenderTeams() : this.config.teams);
      if (!Array.isArray(teams) || teams.length < 2) errors.push("Se requieren al menos 2 equipos para esta modalidad.");
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
        });
        if (tMin < 1) errors.push(`El equipo ${name} tiene un mínimo inválido (debe ser >= 1).`);
        if (tMax < tMin) errors.push(`El equipo ${name} tiene un máximo menor que su mínimo.`);
      });
    }

    return { valid: errors.length === 0, errors };
  }

  _publishUpdate() { eventBus.publish("config:command_updated", { config: this.getConfig(), timestamp: Date.now() }); }
}

export const commandConfigManager = new CommandConfigManager();
