import { eventBus } from "../eventBus";
import { configManager } from "../configManager";
import { players } from "../playerManager";
import { getTeams } from "../TeamManager";
import "../freezeAudioBridge";

class BattleEffectEngine {
  constructor() {
    this.activeEffect = null;
    this.redirectedPoints = 0;
    this.timerInterval = null;
    this.initListeners();
    this.ensureConfig();
  }

  ensureConfig() {
    let config = configManager.get("battleEffects");
    if (!config || !config.freeze) config = config || {};
    config.freeze = {
      enabled: config.freeze?.enabled !== false,
      scope: config.freeze?.scope || "TEAM",
      duration: Number(config.freeze?.duration) >= 5 ? Number(config.freeze.duration) : 300,
      rescueCount: Number(config.freeze?.rescueCount) >= 1 ? Number(config.freeze.rescueCount) : 2,
      activationGift: config.freeze?.activationGift || "Twinkling Star",
      counterGift: config.freeze?.counterGift || config.freeze?.activationGift || "Twinkling Star",
      // Existing project asset; do not invent a new path.
      sound: config.freeze?.sound || "/Sounds/Castigados.mp3"
    };
    configManager.set("battleEffects", config);
  }

  initListeners() {
    eventBus.subscribe("gift:received", gift => this.handleGiftReceived(gift));
    eventBus.subscribe("reward:processed", reward => this.handleRewardEffect(reward));
    eventBus.subscribe("game:score_redirected", payload => { this.redirectedPoints += (payload.points || 0); });
  }

  normalize(value) { return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " "); }

  getPlayerTeam(identity) {
    const key = this.normalize(identity);
    const player = players.find(p => [p.displayName, p.name, p.username].some(v => this.normalize(v) === key));
    if (!player || !player.teamId) return null;
    const teams = getTeams();
    return teams.find(t => t.id === player.teamId || this.normalize(t.name) === this.normalize(player.teamId)) || null;
  }

  isActivationGift(reward, configuredGift) {
    const target = this.normalize(configuredGift);
    const candidates = [reward?.canonicalGiftId, reward?.giftId, reward?.giftName, reward?.gift?.id, reward?.gift?.name].map(v => this.normalize(v));
    if (candidates.some(candidate => candidate && candidate === target)) return true;
    const aliases = new Set(["twinkling star", "twinkling_star", "star", "estrella", "coconut", "coco"]);
    return aliases.has(target) && candidates.some(candidate => aliases.has(candidate));
  }

  handleGiftReceived(gift) {
    const config = configManager.get("battleEffects.freeze") || {};
    if (config.enabled === false) return;
    const activationGift = config.activationGift || "Twinkling Star";
    const canonical = this.normalize(gift?.canonicalGiftId);
    const name = this.normalize(gift?.giftName);
    const official = ["twinkling_star", "twinkling star", "star", "estrella", "coconut", "coco"].includes(canonical) || ["twinkling star", "coconut", "coco"].includes(name);
    if (!official || !this.isActivationGift(gift, activationGift)) return;
    this.handleFreezeActivation(gift);
  }

  handleRewardEffect(reward) {
    const config = configManager.get("battleEffects.freeze") || {};
    if (config.enabled === false) return;
    if (this.isActivationGift(reward, config.activationGift || "Twinkling Star")) this.handleFreezeActivation(reward);
  }

  handleFreezeActivation(reward) {
    const config = configManager.get("battleEffects.freeze") || {};
    const requiredCount = Number(config.rescueCount || 2);
    const senderDisplay = reward?.displayName || reward?.username || reward?.sender || "Viewer";
    const senderTeam = this.getPlayerTeam(senderDisplay);
    const scope = config.scope || "TEAM";
    const count = Math.max(1, Number(reward?.quantity || reward?.repeatCount || reward?.diamondCount || 1));

    if (scope === "TEAM") {
      if (!senderTeam) {
        console.warn("[BattleEffectEngine] Freeze gift sender is not assigned to a team:", senderDisplay);
        return;
      }
      const teams = getTeams();
      const affectedTeam = teams.find(t => t.id !== senderTeam.id);
      if (!affectedTeam) return;

      if (this.activeEffect && this.activeEffect.affectedTeamId === senderTeam.id) {
        this.removeEffect();
        if (count >= requiredCount) this.activateEffect("FREEZE", scope, affectedTeam.id, affectedTeam.name, [], senderDisplay);
        return;
      }
      if (!this.activeEffect) {
        this.activateEffect("FREEZE", scope, affectedTeam.id, affectedTeam.name, [], senderDisplay);
      } else if (count >= requiredCount && this.activeEffect.affectedTeamId === affectedTeam.id) {
        this.removeEffect();
        this.activateEffect("FREEZE", scope, affectedTeam.id, affectedTeam.name, [], senderDisplay);
      }
    } else if (scope === "GLOBAL") {
      if (!this.activeEffect) this.activateEffect("FREEZE", scope, null, "TODOS", [], senderDisplay);
      else this.removeEffect();
    }
  }

  activateEffect(type, scope, teamId, teamName, affectedPlayers, activatedBy) {
    const freezeConfig = configManager.get("battleEffects.freeze") || {};
    const durationSec = Number(freezeConfig.duration || 300);
    this.activeEffect = {
      type, scope: freezeConfig.scope || scope || "TEAM", affectedTeamId: teamId, affectedTeamName: teamName,
      affectedPlayers, activatedBy, activationGift: freezeConfig.activationGift || "Twinkling Star",
      sound: freezeConfig.sound || "/Sounds/Castigados.mp3", createdAt: Date.now(), expiresAt: Date.now() + durationSec * 1000, totalDuration: durationSec
    };
    eventBus.emit("effect:activated", this.activeEffect);
    this.startTimer();
  }

  removeEffect() {
    if (!this.activeEffect) return;
    const old = this.activeEffect;
    this.activeEffect = null;
    this.stopTimer();
    eventBus.emit("effect:removed", old);
  }

  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (!this.activeEffect) return this.stopTimer();
      const remaining = Math.max(0, Math.floor((this.activeEffect.expiresAt - Date.now()) / 1000));
      if (remaining <= 0) {
        const expired = this.activeEffect;
        this.activeEffect = null;
        this.stopTimer();
        eventBus.emit("effect:expired", expired);
      } else eventBus.emit("effect:updated", { ...this.activeEffect, remainingTime: remaining });
    }, 1000);
  }

  stopTimer() { if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; } }
  getActiveEffects() { return this.activeEffect ? [this.activeEffect] : []; }
  isTeamFrozen(teamId) { return !!(this.activeEffect && this.activeEffect.scope === "TEAM" && teamId && teamId === this.activeEffect.affectedTeamId); }
  isUserFrozen(userId, teamId, username) {
    if (!this.activeEffect) return false;
    if (this.activeEffect.scope === "TEAM") return !!(teamId && teamId === this.activeEffect.affectedTeamId);
    if (this.activeEffect.scope === "GLOBAL") return this.normalize(username) !== this.normalize(this.activeEffect.activatedBy);
    if (this.activeEffect.scope === "PLAYER") return (this.activeEffect.affectedPlayers || []).includes(userId);
    return false;
  }
  getRemainingTime() { return this.activeEffect ? Math.max(0, Math.floor((this.activeEffect.expiresAt - Date.now()) / 1000)) : 0; }
  getEffectState() {
    return {
      frozenTeams: this.activeEffect?.affectedTeamId ? [this.activeEffect.affectedTeamId] : [], redirectedPoints: this.redirectedPoints,
      activeEffects: this.getActiveEffects(), active: !!this.activeEffect, type: this.activeEffect?.type || null,
      scope: this.activeEffect?.scope || "TEAM", affectedTeam: this.activeEffect?.affectedTeamName || null,
      activatedBy: this.activeEffect?.activatedBy || null, activationGift: this.activeEffect?.activationGift || null,
      sound: this.activeEffect?.sound || null, remainingTime: this.getRemainingTime()
    };
  }
}

export const battleEffectEngine = new BattleEffectEngine();
