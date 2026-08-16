import { eventBus } from "./eventBus";
import { addPoints, getPlayer, getPlayers } from "./playerManager";
import { addPointsToTeam, getTeam } from "./TeamManager";

/**
 * Ability Action Dispatcher v1.2
 * Executes scoreAction exactly once in the authoritative/admin context.
 * Remote ability:started events are visual-only in the overlay and must never
 * execute the score action a second time.
 */
class AbilityActionDispatcher {
  constructor() {
    this.processed = new Set();
    eventBus.subscribe("ability:started", (ability, isRemote) => {
      if (isRemote) {
        console.log("[AbilityActionDispatcher] Remote ability is visual-only; score execution skipped:", ability?.abilityId);
        return;
      }
      this.dispatch(ability);
    });
  }

  dispatch(ability) {
    if (!ability?.abilityId) return { success: false, reason: "INVALID_ABILITY" };

    const executionId = ability.executionId || `${ability.abilityId}:${ability.timestamp || Date.now()}:${ability.playerId || ability.sender || ability.username || "unknown"}`;
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

    switch (type) {
      case "ADD_POINTS": {
        const player = this._resolvePlayer(ability);
        if (!player || !Number.isFinite(baseValue) || baseValue === 0) {
          console.warn("[AbilityActionDispatcher] ADD_POINTS target not found:", {
            playerId: ability.playerId,
            userId: ability.userId,
            username: ability.username || ability.sender,
            displayName: ability.displayName
          });
          return { success: false, reason: "PLAYER_NOT_FOUND", username: ability.username || ability.sender || "" };
        }

        const points = baseValue * quantity;
        const updated = addPoints(player.id, points);
        if (!updated) return { success: false, reason: "SCORE_UPDATE_FAILED" };

        if (updated.teamId) addPointsToTeam(updated.teamId, points);

        const result = {
          success: true,
          type,
          points,
          quantity,
          playerId: updated.id,
          tiktokId: updated.tiktokId || null,
          username: updated.username || updated.name,
          teamId: updated.teamId || null,
          newTotal: updated.points,
          abilityId: ability.abilityId,
          giftId: ability.giftId || null,
          canonicalGiftId: ability.canonicalGiftId || null,
          source: "ABILITY"
        };

        eventBus.publish("ability:score_executed", result);
        eventBus.publish("gift:points_awarded", result);
        return result;
      }

      case "RESET_SCORE": {
        const teamId = ability.teamId;
        if (!teamId) return { success: false, reason: "TEAM_TARGET_REQUIRED" };

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
        if (previousTeamPoints !== 0) addPointsToTeam(teamId, -previousTeamPoints);

        const result = {
          success: true,
          type,
          teamId,
          playersReset: affected.length,
          previousTeamPoints,
          abilityId: ability.abilityId,
          giftId: ability.giftId || null,
          canonicalGiftId: ability.canonicalGiftId || null,
          source: "ABILITY"
        };

        eventBus.publish("ability:score_executed", result);
        eventBus.publish("gift:action_dispatched", result);
        return result;
      }

      case "ADD_ROUND": {
        const result = {
          success: true,
          type,
          value: Number.isFinite(baseValue) ? baseValue : 0,
          teamId: ability.teamId || null,
          abilityId: ability.abilityId,
          giftId: ability.giftId || null,
          canonicalGiftId: ability.canonicalGiftId || null,
          source: "ABILITY"
        };
        eventBus.publish("ability:round_executed", result);
        eventBus.publish("gift:action_dispatched", result);
        return result;
      }

      case "NONE":
      default: {
        const result = {
          success: true,
          type,
          abilityId: ability.abilityId,
          giftId: ability.giftId || null,
          canonicalGiftId: ability.canonicalGiftId || null,
          source: "ABILITY"
        };
        eventBus.publish("ability:score_executed", result);
        eventBus.publish("gift:action_dispatched", result);
        return result;
      }
    }
  }

  _resolvePlayer(ability) {
    const identityCandidates = [ability.playerId, ability.userId].filter(Boolean).map(String);
    for (const candidate of identityCandidates) {
      const player = getPlayer(candidate);
      if (player) return player;
    }

    const username = String(ability.username || ability.sender || "").trim().toLowerCase();
    const displayName = String(ability.displayName || "").trim().toLowerCase();
    if (!username && !displayName) return null;

    return getPlayers().find(player => {
      const playerUsername = String(player.username || "").trim().toLowerCase();
      const playerName = String(player.name || "").trim().toLowerCase();
      const playerDisplayName = String(player.displayName || "").trim().toLowerCase();
      return (
        (username && (playerUsername === username || playerName === username || playerDisplayName === username)) ||
        (displayName && (playerDisplayName === displayName || playerName === displayName))
      );
    }) || null;
  }
}

export const abilityActionDispatcher = new AbilityActionDispatcher();
