import { eventBus } from "./eventBus";
import { addPoints, getPlayer, getPlayers } from "./playerManager";
import { addPointsToTeam, addWinToTeam, getTeam, getTeams } from "./TeamManager";
import { battleEffectEngine } from "./engines/battleEffectEngine";

/**
 * Ability Action Dispatcher v2
 * Authoritative executor for gift consequences. Visual components never decide
 * score targets. FREEZE is consulted before competitive effects.
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
    if (this.processed.has(executionId)) return { success: false, reason: "DUPLICATE" };
    this.processed.add(executionId);
    if (this.processed.size > 2000) {
      const first = this.processed.values().next().value;
      if (first) this.processed.delete(first);
    }

    const action = ability.scoreAction || {};
    const type = String(action.type || "NONE").trim().toUpperCase();
    const canonicalUnitValues = { doughnut: 1, hat_and_mustache: 5 };
    const configuredValue = Number(action.value ?? 0);
    const baseValue = Object.prototype.hasOwnProperty.call(canonicalUnitValues, ability.canonicalGiftId)
      ? canonicalUnitValues[ability.canonicalGiftId]
      : configuredValue;
    const quantity = Math.max(1, Number(ability.quantity || ability.repeatCount || 1));

    switch (type) {
      case "ADD_POINTS": return this._executeAddPoints(ability, baseValue, quantity);
      case "RESET_SCORE": return this._executeResetScore(ability);
      case "ADD_ROUND": return this._executeAddRound(ability, baseValue, quantity);
      default: {
        const result = { success: true, type, abilityId: ability.abilityId, giftId: ability.giftId || null, canonicalGiftId: ability.canonicalGiftId || null, source: "ABILITY" };
        eventBus.publish("ability:score_executed", result);
        eventBus.publish("gift:action_dispatched", result);
        return result;
      }
    }
  }

  _executeAddPoints(ability, baseValue, quantity) {
    const player = this._resolvePlayer(ability);
    if (!player || !Number.isFinite(baseValue) || baseValue === 0) {
      console.warn("[AbilityActionDispatcher] ADD_POINTS target not found:", { playerId: ability.playerId, userId: ability.userId, displayName: ability.displayName, canonicalGiftId: ability.canonicalGiftId, quantity });
      return { success: false, reason: "PLAYER_NOT_FOUND", displayName: ability.displayName || "" };
    }

    const points = baseValue * quantity;
    const senderTeamId = player.teamId || ability.teamId || null;

    if (senderTeamId && battleEffectEngine.isTeamFrozen(senderTeamId)) {
      const targetTeam = this._getOpposingTeam(senderTeamId);
      if (!targetTeam) return { success: false, reason: "FREEZE_TARGET_TEAM_NOT_FOUND", originalTeamId: senderTeamId };
      const teamSnapshot = addPointsToTeam(targetTeam.id, points);
      const result = {
        success: true, type: "ADD_POINTS", points, unitPoints: baseValue, quantity,
        playerId: player.id, displayName: player.displayName || player.name, username: player.username || player.name,
        originalTeamId: senderTeamId, redirectedTeamId: targetTeam.id, redirectedTeamName: targetTeam.name,
        teamId: targetTeam.id, teamSnapshot, abilityId: ability.abilityId, giftId: ability.giftId || null,
        canonicalGiftId: ability.canonicalGiftId || null, source: "ABILITY_FREEZE_REDIRECT"
      };

      // Reuse the DashboardAPI's authoritative score transport so browser-source
      // overlays receive the redirected team total as well.
      eventBus.emit("game:score_updated", {
        userId: player.id,
        username: player.username || player.name,
        pointsAdded: 0,
        playerSnapshot: { ...player },
        teamId: targetTeam.id,
        teamSnapshot,
        freezeRedirect: true,
        redirectedFromTeamId: senderTeamId,
        redirectedPoints: points,
        timestamp: Date.now()
      });
      eventBus.emit("game:score_redirected", { originalTeam: senderTeamId, redirectedTeam: targetTeam.id, player: player.username || player.name, points, reason: "FREEZE", source: "ABILITY", canonicalGiftId: ability.canonicalGiftId || null });
      eventBus.publish("ability:score_executed", result);
      eventBus.publish("gift:points_awarded", result);
      return result;
    }

    // Update the team first so PlayerManager's score event observes the new
    // team total and the dashboard snapshot is internally consistent.
    let teamSnapshot = null;
    if (player.teamId) teamSnapshot = addPointsToTeam(player.teamId, points);
    const updated = addPoints(player.id, points);
    if (!updated) {
      if (player.teamId) addPointsToTeam(player.teamId, -points);
      return { success: false, reason: "SCORE_UPDATE_FAILED" };
    }

    const result = {
      success: true, type: "ADD_POINTS", points, unitPoints: baseValue, quantity, playerId: updated.id,
      tiktokId: updated.tiktokId || null, displayName: updated.displayName || updated.name,
      username: updated.username || updated.name, teamId: updated.teamId || null, teamSnapshot,
      newTotal: updated.points, abilityId: ability.abilityId, giftId: ability.giftId || null,
      canonicalGiftId: ability.canonicalGiftId || null, source: "ABILITY"
    };
    console.log("[GIFT SCORE EXECUTED]", result);
    eventBus.publish("ability:score_executed", result);
    eventBus.publish("gift:points_awarded", result);
    return result;
  }

  _executeResetScore(ability) {
    const sender = this._resolvePlayer(ability);
    const senderTeamId = sender?.teamId || ability.teamId || null;

    if (senderTeamId) {
      const frozenSender = battleEffectEngine.isTeamFrozen(senderTeamId);
      const targetTeam = frozenSender ? getTeam(senderTeamId) : this._getOpposingTeam(senderTeamId);
      if (!targetTeam) return { success: false, reason: "TEAM_TARGET_REQUIRED", senderTeamId };

      const affected = getPlayers()
        .filter(player => String(player.teamId) === String(targetTeam.id) && Number(player.points) > 0)
        .map(player => addPoints(player.id, -Number(player.points)))
        .filter(Boolean)
        .map(player => player.id);
      const previousTeamPoints = Number(targetTeam.points) || 0;
      if (previousTeamPoints !== 0) addPointsToTeam(targetTeam.id, -previousTeamPoints);

      const result = {
        success: true, type: "RESET_SCORE", teamId: targetTeam.id, teamName: targetTeam.name,
        playersReset: affected.length, previousTeamPoints, senderTeamId,
        targetWasSenderBecauseFrozen: frozenSender, abilityId: ability.abilityId,
        giftId: ability.giftId || null, canonicalGiftId: ability.canonicalGiftId || null,
        source: frozenSender ? "ABILITY_FREEZE_INVERTED" : "ABILITY"
      };
      eventBus.publish("ability:score_executed", result);
      eventBus.publish("gift:action_dispatched", result);
      return result;
    }

    const senderId = sender?.id || ability.playerId || ability.userId || null;
    const affected = getPlayers()
      .filter(player => player.id !== senderId && Number(player.points) > 0)
      .map(player => addPoints(player.id, -Number(player.points)))
      .filter(Boolean)
      .map(player => player.id);
    const result = {
      success: true, type: "RESET_SCORE", teamId: null, playersReset: affected.length, senderId,
      abilityId: ability.abilityId, giftId: ability.giftId || null, canonicalGiftId: ability.canonicalGiftId || null,
      source: "ABILITY_INDIVIDUAL"
    };
    eventBus.publish("ability:score_executed", result);
    eventBus.publish("gift:action_dispatched", result);
    return result;
  }

  _executeAddRound(ability, baseValue, quantity) {
    const sender = this._resolvePlayer(ability);
    const senderTeamId = sender?.teamId || ability.teamId || null;
    const configuredRounds = Number.isFinite(baseValue) && baseValue > 0 ? baseValue : 1;
    if (!senderTeamId) return { success: false, type: "ADD_ROUND", reason: "TEAM_TARGET_REQUIRED", abilityId: ability.abilityId, canonicalGiftId: ability.canonicalGiftId || null };

    const targetTeam = battleEffectEngine.isTeamFrozen(senderTeamId) ? this._getOpposingTeam(senderTeamId) : getTeam(senderTeamId);
    if (!targetTeam) return { success: false, type: "ADD_ROUND", reason: "TEAM_TARGET_NOT_FOUND", senderTeamId };

    const rounds = Math.max(1, Math.floor(configuredRounds * quantity));
    let teamSnapshot = getTeam(targetTeam.id);
    for (let i = 0; i < rounds; i += 1) teamSnapshot = addWinToTeam(targetTeam.id, 1);
    const redirectedByFreeze = String(targetTeam.id) !== String(senderTeamId);
    const result = {
      success: true, type: "ADD_ROUND", rounds, teamId: targetTeam.id, teamName: targetTeam.name,
      senderTeamId, redirectedByFreeze, teamSnapshot, abilityId: ability.abilityId,
      giftId: ability.giftId || null, canonicalGiftId: ability.canonicalGiftId || null,
      source: redirectedByFreeze ? "ABILITY_FREEZE_REDIRECT" : "ABILITY"
    };
    eventBus.emit("ability:round_executed", result);
    eventBus.emit("gift:round_awarded", result);
    eventBus.publish("gift:action_dispatched", result);
    return result;
  }

  _getOpposingTeam(teamId) {
    return getTeams().find(team => String(team.id) !== String(teamId)) || null;
  }

  _resolvePlayer(ability) {
    const displayName = String(ability.displayName || ability.sender || "").trim().toLowerCase();
    if (displayName) {
      const byDisplay = getPlayers().find(player => {
        const playerDisplayName = String(player.displayName || "").trim().toLowerCase();
        const playerName = String(player.name || "").trim().toLowerCase();
        return playerDisplayName === displayName || playerName === displayName;
      });
      if (byDisplay) return byDisplay;
    }
    const identityCandidates = [ability.playerId, ability.userId].filter(Boolean).map(String);
    for (const candidate of identityCandidates) {
      const player = getPlayer(candidate);
      if (player) return player;
    }
    const username = String(ability.username || "").trim().toLowerCase();
    if (!username) return null;
    return getPlayers().find(player => String(player.username || "").trim().toLowerCase() === username) || null;
  }
}

export const abilityActionDispatcher = new AbilityActionDispatcher();
