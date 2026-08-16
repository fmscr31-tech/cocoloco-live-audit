import { eventBus } from "./eventBus";
import { addPoints, getPlayer, getPlayers } from "./playerManager";
import { addPointsToTeam, getTeam } from "./TeamManager";

/**
 * Ability Action Dispatcher v1.1
 * Executes scoreAction exactly once when an Ability reaches ability:started.
 * Gifts resolved through the Ability system do not enter the legacy score path.
 */
class AbilityActionDispatcher {
  constructor() {
    this.processed = new Set();
    eventBus.subscribe("ability:started", (ability) => this.dispatch(ability));
  }

  dispatch(ability) {
    if (!ability?.abilityId) return { success: false, reason: "INVALID_ABILITY" };

    const executionId = ability.executionId || `${ability.abilityId}:${ability.timestamp || Date.now()}:${ability.sender || ability.username || "unknown"}`;
    if (this.processed.has(executionId)) {
      console.warn("[AbilityActionDispatcher] Duplicate execution ignored:", executionId);
      return { success: false, reason: "DUPLICATE" };
    }
    this.processed.add(executionId);

    if (this.processed.size > 2000) {
      const first = this.processed.values().next().value;
      if (first) this.processed.delete(first);
    }

    const action = ability.scoreAction || {};
    const type = String(action.type || "NONE").trim().toUpperCase();
    const baseValue = Number(action.value ?? 0);
    const quantity = Math.max(1, Number(ability.quantity || ability.repeatCount || 1));
    const username = ability.username || ability.sender || "";

    switch (type) {
      case "ADD_POINTS": {
        if (!username || !Number.isFinite(baseValue) || baseValue === 0) {
          return { success: false, reason: "INVALID_ADD_POINTS_TARGET" };
        }

        const player = getPlayer(username) || getPlayerByNameSafe(username);
        if (!player) {
          console.warn("[AbilityActionDispatcher] ADD_POINTS target not found:", username);
          return { success: false, reason: "PLAYER_NOT_FOUND", username };
        }

        const points = baseValue * quantity;
        const updated = addPoints(player.id, points);
        if (!updated) return { success: false, reason: "SCORE_UPDATE_FAILED" };

        // Team mode keeps a separate persisted team scoreboard.
        if (updated.teamId) {
          addPointsToTeam(updated.teamId, points);
        }

        const result = {
          success: true,
          type,
          points,
          quantity,
          playerId: updated.id,
          username: updated.name,
          teamId: updated.teamId || null,
          newTotal: updated.points,
          abilityId: ability.abilityId,
          source: "ABILITY"
        };

        eventBus.publish("ability:score_executed", result);
        return result;
      }

      case "RESET_SCORE": {
        // Money Gun targets the configured team (currently team2 from the
        // Ability resolver). Never reset the entire game when no team exists.
        const teamId = ability.teamId;
        if (!teamId) {
          return { success: false, reason: "TEAM_TARGET_REQUIRED" };
        }

        const team = getTeam(teamId);
        if (!team) {
          console.warn("[AbilityActionDispatcher] RESET_SCORE team not found:", teamId);
          return { success: false, reason: "TEAM_NOT_FOUND", teamId };
        }

        const affected = getPlayers()
          .filter(player => player.teamId === teamId && Number(player.points) > 0)
          .map(player => addPoints(player.id, -Number(player.points)))
          .filter(Boolean)
          .map(player => player.id);

        const previousTeamPoints = Number(team.points) || 0;
        if (previousTeamPoints !== 0) {
          addPointsToTeam(teamId, -previousTeamPoints);
        }

        const result = {
          success: true,
          type,
          teamId,
          playersReset: affected.length,
          previousTeamPoints,
          abilityId: ability.abilityId,
          source: "ABILITY"
        };

        eventBus.publish("ability:score_executed", result);
        return result;
      }

      case "ADD_ROUND": {
        // This is deliberately not converted into player points. It is a
        // round-level action and is exposed for the round/game subsystem.
        const result = {
          success: true,
          type,
          value: Number.isFinite(baseValue) ? baseValue : 0,
          teamId: ability.teamId || null,
          abilityId: ability.abilityId,
          source: "ABILITY"
        };
        eventBus.publish("ability:round_executed", result);
        return result;
      }

      case "NONE":
      default: {
        const result = {
          success: true,
          type,
          abilityId: ability.abilityId,
          source: "ABILITY"
        };
        eventBus.publish("ability:score_executed", result);
        return result;
      }
    }
  }
}

function getPlayerByNameSafe(username) {
  const target = String(username).trim().toLowerCase();
  return getPlayers().find(player =>
    String(player.name || "").trim().toLowerCase() === target ||
    String(player.username || "").trim().toLowerCase() === target ||
    String(player.displayName || "").trim().toLowerCase() === target
  ) || null;
}

export const abilityActionDispatcher = new AbilityActionDispatcher();
