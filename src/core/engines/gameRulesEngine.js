import { eventBus } from "../eventBus";
import { configManager } from "../configManager";
import { battleEffectEngine } from "./battleEffectEngine";
import { players } from "../playerManager";
import { getTeams } from "../TeamManager";

/**
 * Game Rules Engine: Centralized module responsible for controlling competitive live rules,
 * scoring calculations, victory conditions, and battle objectives.
 */
class GameRulesEngine {
  constructor() {
    this.rules = {
      targetPointsToWin: 500,
      globalMultiplier: 1.0,
      bonusPerGift: 10
    };
    this.battleStatus = { winner: null, objectivesCompleted: [] };
    this.initListeners();
  }

  initListeners() {
    eventBus.subscribe("reward:processed", reward => this.evaluateRewardScoring(reward));
    eventBus.subscribe("player:updated", player => this.evaluateVictoryConditions(player));
  }

  getPlayerTeam(identity) {
    if (!identity) return null;
    const teams = getTeams();

    // Explicit team identity is authoritative. This is important for connector events
    // where a player registry entry may not yet exist in the receiving window/test.
    const explicitTeamId = typeof identity === "object" ? identity.teamId : identity;
    if (explicitTeamId) {
      const direct = teams.find(team =>
        String(team.id) === String(explicitTeamId) ||
        String(team.name || "").trim().toLowerCase() === String(explicitTeamId).trim().toLowerCase()
      );
      if (direct) return direct;
    }

    const identityText = String(
      typeof identity === "object"
        ? (identity.displayName || identity.username || identity.sender || identity.id || "")
        : identity
    ).toLowerCase();

    const player = players.find(p =>
      p.id === identity ||
      p.tiktokId === identity ||
      p.playerId === identity ||
      String(p.name || "").toLowerCase() === identityText ||
      String(p.username || "").toLowerCase() === identityText
    );

    if (!player?.teamId) return null;
    return teams.find(team => String(team.id) === String(player.teamId)) || null;
  }

  evaluateRewardScoring(reward = {}) {
    const customMultiplier = configManager.get("game.globalMultiplier") || this.rules.globalMultiplier;
    const adjustedPoints = Math.round((reward.points || 1) * customMultiplier);
    const team = this.getPlayerTeam(reward.teamId || reward.userId || reward.username);
    const userId = reward.userId || reward.username;

    if (battleEffectEngine.isUserFrozen(userId, team ? team.id : null, reward.username)) {
      const teams = getTeams();
      const opposingTeam = team ? teams.find(t => String(t.id) !== String(team.id)) : null;
      eventBus.emit("game:score_redirected", {
        originalTeam: team ? team.id : null,
        redirectedTeam: opposingTeam ? opposingTeam.id : null,
        player: reward.username,
        points: adjustedPoints,
        reason: "FREEZE"
      });
      return;
    }

    eventBus.emit("game:score_updated", {
      userId: reward.userId,
      username: reward.username,
      pointsAdded: adjustedPoints,
      giftName: reward.giftName,
      timestamp: Date.now()
    });
    this.checkObjectives(adjustedPoints);
  }

  checkObjectives(pointsEarned) {
    const target = configManager.get("game.targetPointsToWin") || this.rules.targetPointsToWin;
    if (pointsEarned >= target && !this.battleStatus.objectivesCompleted.includes("TARGET_REACHED")) {
      this.battleStatus.objectivesCompleted.push("TARGET_REACHED");
      eventBus.emit("game:objective_completed", { objective: "TARGET_REACHED", threshold: target });
    }
  }

  evaluateVictoryConditions(player) {
    const team = this.getPlayerTeam(player);
    const userId = player.id || player.name;
    if (battleEffectEngine.isUserFrozen(userId, team ? team.id : null, player.name)) return;

    const winningThreshold = configManager.get("game.winningThreshold") || 1000;
    if ((player.points || 0) >= winningThreshold && !this.battleStatus.winner) {
      this.battleStatus.winner = { id: player.id || player.userId, name: player.username || player.name, points: player.points };
      eventBus.emit("game:winner_detected", this.battleStatus.winner);
    }
  }

  getRulesState() {
    return { rules: { ...this.rules }, battleStatus: { ...this.battleStatus } };
  }
}

export const gameRulesEngine = new GameRulesEngine();
