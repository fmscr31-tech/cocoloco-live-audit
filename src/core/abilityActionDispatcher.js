import { eventBus } from "./eventBus";
import { addPoints, getPlayer, getPlayers } from "./playerManager";
import { addPointsToTeam, getTeam } from "./TeamManager";

/**
 * Ability Action Dispatcher v1
 *
 * Executes scoreAction exactly once when an Ability reaches ability:started.
 * This is intentionally separate from the legacy giftActionDispatcher so
 * gifts resolved through the Ability system do not get processed twice.
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

    // Keep the deduplication set bounded during long LIVE sessions.
    if (this.processed.size > 2000) {
      const first = this.processed.values().next().value;
      if (first) this.processed.delete(first);
    }

    const action = ability.scoreAction || {};
    const type = String(action.type || "NONE").trim().toUpperCase();
    const value = Number(action.value ?? 0);
    const username = ability.username || ability.sender || "";

    switch (type) {
      case "ADD_POINTS": {
        if (!username || !Number.isFinite(value) || value === 0) {
          return { success: false, reason: "INVALID_ADD_POINTS_TARGET" };
        }

        const player = getPlayer(username) || getPlayerByNameSafe(username);
        if (!player) {
          console.warn("[AbilityActionDispatcher] ADD_POINTS target not found:", username);
          return { success: false, reason: "PLAYER_NOT_FOUND", username };
        }

        const updated = addPoints(player.id, value);
        if (!updated) return { success: false, reason: "SCORE_UPDATE_FAILED" };

        const result = {
          success: true,
          type,
          points: value,
          playerId: updated.id,
          username: updated.name,
          newTotal: updated.points,
          abilityId: ability.abilityId,
          source: "ABILITY"
        };

        eventBus.publish("ability:score_executed", result);
        return result;
      }

      case "RESET_SCORE": {
        // Money Gun targets the configured team (currently team2 from the
        // Ability resolver). In Individual mode, no team target exists, so
        // the action is intentionally rejected instead of resetting everyone.
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
        // ADD_ROUND is a round-level ability, not a player-point mutation.
        // Publish it for the round/game subsystem rather than silently
        // converting it into points.
        const result = {
          success: true,
          type,
          value: Number.isFinite(value) ? value : 0,
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
