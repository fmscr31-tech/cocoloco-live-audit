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

  getPlayerTeam(identity) {
    if (!identity) return null;

    const identityText = String(identity).toLowerCase();
    const player = players.find(p =>
      p.id === identity ||
      p.tiktokId === identity ||
      p.playerId === identity ||
      String(p.name || "").toLowerCase() === identityText ||
      String(p.username || "").toLowerCase() === identityText
    );

    const requestedTeamId = player?.teamId || (typeof identity === "object" ? identity.teamId : null);
    if (!requestedTeamId) return null;

    const teams = getTeams();
    return teams.find(t =>
      String(t.id) === String(requestedTeamId) ||
      String(t.name || "").toLowerCase() === String(requestedTeamId).toLowerCase()
    ) || null;
  }

  evaluateRewardScoring(reward = {}) {
    const customMultiplier = configManager.get("game.globalMultiplier") || this.rules.globalMultiplier;
    const adjustedPoints = Math.round((reward.points || 1) * customMultiplier);

    // Prefer the explicit team identity supplied by the connector/event pipeline.
    // Fall back to the canonical player registry only when teamId is absent.
    const team = this.getPlayerTeam(reward.teamId || reward.userId || reward.username);
    const userId = reward.userId || reward.username;

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
      return;
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

  checkObjectives(pointsEarned) {
    const target = configManager.get("game.targetPointsToWin") || this.rules.targetPointsToWin;
    if (pointsEarned >= target && !this.battleStatus.objectivesCompleted.includes("TARGET_REACHED")) {
      this.battleStatus.objectivesCompleted.push("TARGET_REACHED");
      eventBus.emit("game:objective_completed", { objective: "TARGET_REACHED", threshold: target });
    }
  }

  evaluateVictoryConditions(player) {
    const team = this.getPlayerTeam(player.id || player.tiktokId || player.playerId || player.name);
    const userId = player.id || player.name;
    if (battleEffectEngine.isUserFrozen(userId, team ? team.id : null, player.name)) return;

    const winningThreshold = configManager.get("game.winningThreshold") || 1000;
    if ((player.points || 0) >= winningThreshold && !this.battleStatus.winner) {
      this.battleStatus.winner = { id: player.id || player.userId, name: player.username || player.name, points: player.points };
      eventBus.emit("game:winner_detected", this.battleStatus.winner);
    }
  }

  getRulesState() {
    return {
      rules: { ...this.rules },
      battleStatus: { ...this.battleStatus }
    };
  }
}

export const gameRulesEngine = new GameRulesEngine();
