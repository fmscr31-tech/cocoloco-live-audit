import { eventBus } from "../eventBus";
import { configManager } from "../configManager";
import { battleEffectEngine } from "./battleEffectEngine";
import { players } from "../playerManager";
import { getTeams } from "../TeamManager";

/**
 * Game Rules Engine: Centralized module responsible for controlling competitive live rules,
 * scoring calculations, victory conditions, and battle objectives.
 * Communicates exclusively through eventBus and configManager, without visual logic.
 */
class GameRulesEngine {
  constructor() {
    this.rules = {
      targetPointsToWin: 500,
      globalMultiplier: 1.0,
      bonusPerGift: 10
    };
    this.battleStatus = {
      winner: null,
      objectivesCompleted: []
    };
    this.initListeners();
  }

  initListeners() {
    eventBus.subscribe("reward:processed", (reward) => {
      this.evaluateRewardScoring(reward);
    });

    eventBus.subscribe("player:updated", (player) => {
      this.evaluateVictoryConditions(player);
    });
  }

  getPlayerTeam(usernameOrId) {
    const player = players.find(p => p.id === usernameOrId || p.name.toLowerCase() === (usernameOrId || "").toLowerCase());
    if (!player || !player.teamId) return null;
    const teams = getTeams();
    return teams.find(t => t.id === player.teamId || t.name.toLowerCase() === String(player.teamId).toLowerCase()) || null;
  }

  /**
   * Evaluates reward events using configManager rules, checks user/team freeze status, and emits score updates or redirections.
   */
  evaluateRewardScoring(reward) {
    const customMultiplier = configManager.get("game.globalMultiplier") || this.rules.globalMultiplier;
    const adjustedPoints = Math.round((reward.points || 1) * customMultiplier);

    const team = this.getPlayerTeam(reward.username);
    const userId = reward.userId || reward.username;

    // Check if user/team is frozen: intercept points and redirect
    if (battleEffectEngine.isUserFrozen(userId, team ? team.id : null, reward.username)) {
      const teams = getTeams();
      const opposingTeam = team ? teams.find(t => t.id !== team.id) : null;

      eventBus.emit("game:score_redirected", {
        originalTeam: team ? team.id : null,
        redirectedTeam: opposingTeam ? opposingTeam.id : null,
        player: reward.username,
        points: adjustedPoints,
        reason: "FREEZE"
      });
      return; // Points blocked from frozen participant
    }

    const scoreUpdatePayload = {
      userId: reward.userId,
      username: reward.username,
      pointsAdded: adjustedPoints,
      giftName: reward.giftName,
      timestamp: Date.now()
    };

    eventBus.emit("game:score_updated", scoreUpdatePayload);
    this.checkObjectives(adjustedPoints);
  }

  /**
   * Checks if point thresholds or battle objectives have been achieved.
   */
  checkObjectives(pointsEarned) {
    const target = configManager.get("game.targetPointsToWin") || this.rules.targetPointsToWin;
    if (pointsEarned >= target && !this.battleStatus.objectivesCompleted.includes("TARGET_REACHED")) {
      this.battleStatus.objectivesCompleted.push("TARGET_REACHED");
      eventBus.emit("game:objective_completed", { objective: "TARGET_REACHED", threshold: target });
    }
  }

  /**
   * Evaluates player updates against victory conditions, blocking wins if the user/team is frozen.
   */
  evaluateVictoryConditions(player) {
    const team = this.getPlayerTeam(player.name);
    const userId = player.id || player.name;
    // Block victory if participant is currently frozen
    if (battleEffectEngine.isUserFrozen(userId, team ? team.id : null, player.name)) {
      return;
    }

    const winningThreshold = configManager.get("game.winningThreshold") || 1000;
    if ((player.points || 0) >= winningThreshold && !this.battleStatus.winner) {
      this.battleStatus.winner = { id: player.id || player.userId, name: player.username || player.name, points: player.points };
      eventBus.emit("game:winner_detected", this.battleStatus.winner);
    }
  }

  /**
   * Public method to get current game rules state for dashboardAPI integration.
   */
  getRulesState() {
    return {
      rules: { ...this.rules },
      battleStatus: { ...this.battleStatus }
    };
  }
}

export const gameRulesEngine = new GameRulesEngine();
