import { eventBus } from "../eventBus";
import { configManager } from "../configManager";
import { players } from "../playerManager";
import { getTeams } from "../TeamManager";

/**
 * Battle Effect Engine: Manages temporary competitive battle effects (e.g. FREEZE) 
 * with extensible scope support (TEAM, PLAYER, GLOBAL).
 */
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
    if (!config || !config.freeze) {
      config = config || {};
      config.freeze = {
        enabled: true,
        scope: "TEAM", // "TEAM" | "GLOBAL" | "PLAYER"
        duration: 300, // 300 seconds = 5 minutes = 300000 ms
        rescueCount: 2,
        activationGift: "STAR",
        counterGift: "STAR"
      };
      configManager.set("battleEffects", config);
    } else {
      // Safe migration: if legacy default duration was 30 or missing, upgrade to 300 seconds (5 minutes)
      if (config.freeze.duration === undefined || config.freeze.duration === 30 || config.freeze.duration < 5) {
        config.freeze.duration = 300;
        configManager.set("battleEffects", config);
      }
    }
  }

  initListeners() {
    eventBus.subscribe("reward:processed", (reward) => {
      this.handleRewardEffect(reward);
    });

    eventBus.subscribe("game:score_redirected", (payload) => {
      this.redirectedPoints += (payload.points || 0);
    });
  }

  getPlayerTeam(username) {
    const player = players.find(p => p.name.toLowerCase() === (username || "").toLowerCase());
    if (!player || !player.teamId) return null;
    const teams = getTeams();
    return teams.find(t => t.id === player.teamId || t.name.toLowerCase() === String(player.teamId).toLowerCase()) || null;
  }

  handleRewardEffect(reward) {
    const config = configManager.get("battleEffects.freeze") || { enabled: true, scope: "TEAM", duration: 300, rescueCount: 2, activationGift: "STAR" };
    if (!config || !config.enabled) return;

    const giftName = (reward.giftName || "").toUpperCase();
    const targetGift = (config.activationGift || "STAR").toUpperCase();
    const requiredCount = Number(config.rescueCount !== undefined ? config.rescueCount : 2);

    if (giftName === targetGift) {
      const senderTeam = this.getPlayerTeam(reward.username);
      const scope = config.scope || "TEAM";
      const count = Number(reward.repeatCount || reward.diamondCount || 1);

      if (scope === "TEAM") {
        if (!senderTeam) return;
        const teams = getTeams();
        const affectedTeam = teams.find(t => t.id !== senderTeam.id);
        if (!affectedTeam) return;

        // Unlock / Counterattack logic
        if (this.activeEffect && this.activeEffect.affectedTeamId === senderTeam.id) {
          this.removeEffect();
          if (count >= requiredCount) {
            this.activateEffect("FREEZE", scope, affectedTeam.id, affectedTeam.name, [], reward.username);
          }
          return;
        }

        if (!this.activeEffect) {
          this.activateEffect("FREEZE", scope, affectedTeam.id, affectedTeam.name, [], reward.username);
        } else if (count >= requiredCount && this.activeEffect.affectedTeamId === affectedTeam.id) {
          this.removeEffect();
          this.activateEffect("FREEZE", scope, affectedTeam.id, affectedTeam.name, [], reward.username);
        }
      } else if (scope === "GLOBAL") {
        // Global scope: freezes everyone except attacker
        if (!this.activeEffect) {
          this.activateEffect("FREEZE", scope, null, "TODOS", [], reward.username);
        } else {
          this.removeEffect();
        }
      }
    }
  }

  activateEffect(type, scope, teamId, teamName, affectedPlayers, activatedBy) {
    const freezeConfig = configManager.get("battleEffects.freeze") || { duration: 300, scope: "TEAM", rescueCount: 2 };
    const durationSec = Number(freezeConfig.duration !== undefined ? freezeConfig.duration : 300);
    const durationMs = durationSec * 1000;
    const effectScope = freezeConfig.scope || scope || "TEAM";
    const now = Date.now();

    this.activeEffect = {
      type,
      scope: effectScope,
      affectedTeamId: teamId,
      affectedTeamName: teamName,
      affectedPlayers,
      activatedBy,
      createdAt: now,
      expiresAt: now + durationMs,
      totalDuration: durationSec
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
      if (!this.activeEffect) {
        this.stopTimer();
        return;
      }
      const remaining = Math.max(0, Math.floor((this.activeEffect.expiresAt - Date.now()) / 1000));
      if (remaining <= 0) {
        const expired = this.activeEffect;
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

  getActiveEffects() {
    return this.activeEffect ? [this.activeEffect] : [];
  }

  isTeamFrozen(teamId) {
    if (!this.activeEffect) return false;
    if (this.activeEffect.scope === "TEAM") {
      return teamId && teamId === this.activeEffect.affectedTeamId;
    }
    return false;
  }

  isUserFrozen(userId, teamId, username) {
    if (!this.activeEffect) return false;
    const scope = this.activeEffect.scope;

    if (scope === "TEAM") {
      return teamId && teamId === this.activeEffect.affectedTeamId;
    }
    if (scope === "GLOBAL") {
      return (username || "").toLowerCase() !== (this.activeEffect.activatedBy || "").toLowerCase();
    }
    if (scope === "PLAYER") {
      return (this.activeEffect.affectedPlayers || []).includes(userId);
    }
    return false;
  }

  getRemainingTime() {
    if (!this.activeEffect) return 0;
    return Math.max(0, Math.floor((this.activeEffect.expiresAt - Date.now()) / 1000));
  }

  getEffectState() {
    return {
      frozenTeams: this.activeEffect && this.activeEffect.affectedTeamId ? [this.activeEffect.affectedTeamId] : [],
      redirectedPoints: this.redirectedPoints,
      activeEffects: this.getActiveEffects(),
      active: !!this.activeEffect,
      type: this.activeEffect ? this.activeEffect.type : null,
      scope: this.activeEffect ? this.activeEffect.scope : "TEAM",
      affectedTeam: this.activeEffect ? this.activeEffect.affectedTeamName : null,
      activatedBy: this.activeEffect ? this.activeEffect.activatedBy : null,
      remainingTime: this.getRemainingTime()
    };
  }
}

export const battleEffectEngine = new BattleEffectEngine();
