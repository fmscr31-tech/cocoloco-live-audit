import { eventBus } from "../eventBus.js";
import { configManager } from "../configManager.js";
import { players } from "../playerManager.js";
import { getTeams } from "../TeamManager.js";

/**
 * Battle Effect Engine v3
 * Twinkling Star and Coconut are TEAM freeze triggers. A second freeze gift
 * counters the active freeze. Both routes share the same authoritative effect.
 */
class BattleEffectEngine {
  constructor() {
    this.activeEffect = null;
    this.redirectedPoints = 0;
    this.timerInterval = null;
    this.processedActivations = new Map();
    this.initListeners();
    this.ensureConfig();
  }

  ensureConfig() {
    let config = configManager.get("battleEffects");
    if (!config || !config.freeze) config = config || {};
    config.freeze = {
      enabled: config.freeze?.enabled !== false,
      scope: "TEAM",
      duration: 300,
      activationGift: "Twinkling Star / Coconut",
      counterGift: "Twinkling Star / Coconut",
      sound: config.freeze?.sound || "/Sounds/Castigados.mp3"
    };
    configManager.set("battleEffects", config);
  }

  initListeners() {
    eventBus.subscribe("gift:received", gift => this.handleGiftReceived(gift));
    eventBus.subscribe("reward:processed", reward => this.handleRewardEffect(reward));
    eventBus.subscribe("game:score_redirected", payload => {
      this.redirectedPoints += Number(payload?.points) || 0;
    });
  }

  normalize(value) {
    return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  _cleanActivationCache() {
    const now = Date.now();
    for (const [key, timestamp] of this.processedActivations.entries()) {
      if (now - timestamp > 10000) this.processedActivations.delete(key);
    }
  }

  _getActivationEventId(reward) {
    return reward?.eventId || reward?.transactionId || reward?.msgId || null;
  }

  getPlayerTeam(identity) {
    if (identity?.teamId) {
      const direct = getTeams().find(team => String(team.id) === String(identity.teamId));
      if (direct) return direct;
    }

    const key = this.normalize(identity?.displayName || identity?.username || identity?.sender || identity);
    if (!key) return null;

    const player = players.find(p => [p.displayName, p.name, p.username].some(v => this.normalize(v) === key));
    if (!player?.teamId) return null;
    return getTeams().find(team => String(team.id) === String(player.teamId)) || null;
  }

  isFreezeGift(reward) {
    const values = [reward?.canonicalGiftId, reward?.giftId, reward?.giftName, reward?.gift?.id, reward?.gift?.name]
      .map(value => this.normalize(value));
    return values.some(value => ["twinkling_star", "twinkling star", "star", "estrella", "coconut", "coco"].includes(value));
  }

  handleGiftReceived(gift) {
    if (!this.isFreezeGift(gift)) return;
    this.handleFreezeActivation(gift);
  }

  handleRewardEffect(reward) {
    if (!this.isFreezeGift(reward)) return;
    this.handleFreezeActivation(reward);
  }

  handleFreezeActivation(reward) {
    const config = configManager.get("battleEffects.freeze") || {};
    if (config.enabled === false) return;

    this._cleanActivationCache();
    const eventId = this._getActivationEventId(reward);
    const sender = reward?.displayName || reward?.username || reward?.sender || "Viewer";
    const giftKey = reward?.canonicalGiftId || reward?.giftId || reward?.giftName || "freeze";
    const dedupKey = eventId ? String(eventId) : `${this.normalize(sender)}:${this.normalize(giftKey)}:${Number(reward?.quantity || reward?.repeatCount || 1)}`;
    if (this.processedActivations.has(dedupKey)) return;
    this.processedActivations.set(dedupKey, Date.now());

    const senderTeam = this.getPlayerTeam(reward);
    if (!senderTeam) {
      console.warn("[BattleEffectEngine] Freeze gift sender is not assigned to a team:", sender);
      return;
    }

    if (this.activeEffect) {
      this.removeEffect("COUNTER_GIFT");
      console.log("[BattleEffectEngine] Freeze countered the active FREEZE.", { sender, senderTeamId: senderTeam.id });
      return;
    }

    const affectedTeam = getTeams().find(team => String(team.id) !== String(senderTeam.id));
    if (!affectedTeam) {
      console.warn("[BattleEffectEngine] Cannot activate FREEZE: opposing team not found.");
      return;
    }

    this.activateEffect("FREEZE", "TEAM", affectedTeam.id, affectedTeam.name, [], sender);
  }

  activateEffect(type, scope, teamId, teamName, affectedPlayers, activatedBy) {
    const freezeConfig = configManager.get("battleEffects.freeze") || {};
    const durationSec = Number(freezeConfig.duration) || 300;
    this.activeEffect = {
      type,
      scope: "TEAM",
      affectedTeamId: teamId,
      affectedTeamName: teamName,
      affectedPlayers,
      activatedBy,
      activationGift: "Twinkling Star / Coconut",
      sound: freezeConfig.sound || "/Sounds/Castigados.mp3",
      createdAt: Date.now(),
      expiresAt: Date.now() + durationSec * 1000,
      totalDuration: durationSec
    };
    eventBus.emit("effect:activated", this.activeEffect);
    this.startTimer();
  }

  removeEffect(reason = "MANUAL") {
    if (!this.activeEffect) return;
    const old = { ...this.activeEffect, removalReason: reason };
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
        const expired = { ...this.activeEffect };
        this.activeEffect = null;
        this.stopTimer();
        eventBus.emit("effect:expired", expired);
      } else {
        eventBus.emit("effect:updated", { ...this.activeEffect, remainingTime: remaining });
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getActiveEffects() { return this.activeEffect ? [this.activeEffect] : []; }

  isTeamFrozen(teamId) {
    return !!(this.activeEffect && this.activeEffect.scope === "TEAM" && teamId && String(teamId) === String(this.activeEffect.affectedTeamId));
  }

  isUserFrozen(userId, teamId, username) {
    if (!this.activeEffect) return false;
    if (this.activeEffect.scope === "TEAM") return this.isTeamFrozen(teamId);
    if (this.activeEffect.scope === "GLOBAL") return this.normalize(username) !== this.normalize(this.activeEffect.activatedBy);
    if (this.activeEffect.scope === "PLAYER") return (this.activeEffect.affectedPlayers || []).includes(userId);
    return false;
  }

  getRemainingTime() {
    return this.activeEffect ? Math.max(0, Math.floor((this.activeEffect.expiresAt - Date.now()) / 1000)) : 0;
  }

  getEffectState() {
    return {
      frozenTeams: this.activeEffect?.affectedTeamId ? [this.activeEffect.affectedTeamId] : [],
      redirectedPoints: this.redirectedPoints,
      activeEffects: this.getActiveEffects(),
      active: !!this.activeEffect,
      type: this.activeEffect?.type || null,
      scope: "TEAM",
      affectedTeam: this.activeEffect?.affectedTeamName || null,
      affectedTeamId: this.activeEffect?.affectedTeamId || null,
      activatedBy: this.activeEffect?.activatedBy || null,
      activationGift: this.activeEffect?.activationGift || null,
      sound: this.activeEffect?.sound || null,
      remainingTime: this.getRemainingTime()
    };
  }
}

export const battleEffectEngine = new BattleEffectEngine();
