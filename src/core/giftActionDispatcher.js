import { eventBus } from "./eventBus";
import { registrationManager } from "./registrationManager";
import { addPlayer, getPlayerByName, addPoints, getPlayers } from "./playerManager";
import { getTeams } from "./TeamManager";
import { setPlayers, setTeams } from "./stateManager";

/**
 * Gift Action Dispatcher v1
 * Routes resolved gift actions from giftResolver.js to appropriate game subsystems.
 * Supported actions: Add points (points), Give clue (clue), Register player (register_player), Bonus (bonus), Special event (special_event).
 */
class GiftActionDispatcher {
  /**
   * Dispatches a resolved gift action.
   * @param {Object} resolvedAction - { gift, username, action, value, team }
   * @returns {Object} Dispatch result
   */
  dispatch(resolvedAction) {
    if (!resolvedAction || !resolvedAction.action) {
      console.warn("[GiftActionDispatcher] Invalid resolved action received:", resolvedAction);
      return { success: false, reason: "INVALID_ACTION" };
    }

    const normalizedAction = String(resolvedAction.action).trim().toLowerCase();

    console.log(`[GiftActionDispatcher] Dispatching action: "${resolvedAction.action}" for ${resolvedAction.username} (Value: ${resolvedAction.value})`);

    let result = { success: true };

    switch (normalizedAction) {
      case "add points":
      case "points":
        result = this._handlePoints(resolvedAction);
        break;

      case "give clue":
      case "clue":
        result = this._handleClue(resolvedAction);
        break;

      case "register player":
      case "register_player":
        result = this._handleRegisterPlayer(resolvedAction);
        break;

      case "bonus":
        result = this._handleBonus(resolvedAction);
        break;

      case "special event":
      case "special_event":
        result = this._handleSpecialEvent(resolvedAction);
        break;

      default:
        console.warn(`[GiftActionDispatcher] Unhandled action type: ${resolvedAction.action}`);
        result = { success: false, reason: "UNHANDLED_ACTION_TYPE" };
        break;
    }

    eventBus.publish("gift:action_dispatched", {
      resolvedAction,
      result,
      timestamp: Date.now()
    });

    return result;
  }

  _handlePoints(actionObj) {
    console.log("[Points Updated]");
    // Find or add player in playerManager and update stateManager
    let player = getPlayerByName(actionObj.username);
    if (!player) {
      player = addPlayer(actionObj.username);
    }
    if (player) {
      addPoints(player.id, actionObj.value);
    }

    // Synchronize players and teams into stateManager
    setPlayers(getPlayers());
    setTeams(getTeams());

    console.log(`[GiftActionDispatcher] [Handler] Adding ${actionObj.value} points for ${actionObj.username} (Team: ${actionObj.team})`);
    eventBus.publish("gift:points_awarded", {
      username: actionObj.username,
      points: actionObj.value,
      team: actionObj.team,
      gift: actionObj.gift
    });
    return { success: true, type: "points", points: actionObj.value };
  }

  _handleClue(actionObj) {
    // Placeholder handler for giving clue
    console.log(`[GiftActionDispatcher] [Handler] Giving clue triggered by ${actionObj.username} (Value: ${actionObj.value})`);
    eventBus.publish("gift:clue_unlocked", {
      username: actionObj.username,
      gift: actionObj.gift
    });
    return { success: true, type: "clue" };
  }

  _handleRegisterPlayer(actionObj) {
    // Automatically register player if registration manager is open and synchronize stateManager
    const regResult = registrationManager.registerPlayer({
      playerId: actionObj.username,
      displayName: actionObj.username,
      source: "GIFT"
    });

    setPlayers(getPlayers());
    setTeams(getTeams());

    console.log(`[GiftActionDispatcher] [Handler] Registering player via gift: ${actionObj.username}`, regResult);
    return { success: regResult.success, type: "register_player", player: regResult.player };
  }

  _handleBonus(actionObj) {
    // Placeholder handler for bonus
    console.log(`[GiftActionDispatcher] [Handler] Bonus triggered by ${actionObj.username} (Value: ${actionObj.value})`);
    eventBus.publish("gift:bonus_triggered", {
      username: actionObj.username,
      value: actionObj.value,
      gift: actionObj.gift
    });
    return { success: true, type: "bonus", value: actionObj.value };
  }

  _handleSpecialEvent(actionObj) {
    // Placeholder handler for special event
    console.log(`[GiftActionDispatcher] [Handler] Special event triggered by ${actionObj.username} (Gift: ${actionObj.gift.name})`);
    eventBus.publish("gift:special_event", {
      username: actionObj.username,
      gift: actionObj.gift,
      value: actionObj.value
    });
    return { success: true, type: "special_event", gift: actionObj.gift.name };
  }
}

export const giftActionDispatcher = new GiftActionDispatcher();
