import { eventBus } from "./eventBus";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";
import { playerWin } from "./gameEngine";

/**
 * Chat Command Parser v4
 * Processes normalized neutral chat events.
 * - When registration is OPEN: parses join/team commands.
 * - When registration is CLOSED: parses chat messages against the configured
 *   Win Limpia answer and awards exactly one point to the registered player.
 */
class ChatCommandParser {
  constructor() {
    this.initListener();
  }

  initListener() {
    eventBus.subscribe("normalized:chat", (event) => {
      this.parseChatEvent(event);
    });
  }

  normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  parseChatEvent(event) {
    console.log("[CHAT LIVE 01] RAW EVENT RECEIVED", event);
    if (!event || event.type !== "CHAT") {
      return { accepted: false, reason: "INVALID_EVENT" };
    }

    const rawMessage = String(event.message || "").trim().toLowerCase();
    const cleanMessage = rawMessage.replace(/[.,;!]+$/, "").trim();
    const eventPlayerId = event.playerId || event.userId || event.username || event.displayName;
    const eventUsername = this.normalize(event.username);
    const eventDisplayName = this.normalize(event.displayName);

    console.log("[CHAT LIVE 02] EVENT NORMALIZED", {
      playerId: eventPlayerId,
      username: event.username,
      displayName: event.displayName,
      message: event.message
    });

    const regState = registrationManager.getRegistrationState();
    const config = commandConfigManager.getConfig();

    console.log("[CHAT LIVE 03] REGISTRATION STATE", regState);
    console.log("[CHAT LIVE 04] COMMAND CONFIG", config);

    // ================================================================
    // WIN LIMPIA — active round / registration closed
    // ================================================================
    if (regState.status !== "OPEN") {
      const winConfig = config.winLimpia || {};
      const targetAnswer = this.normalize(winConfig.correctAnswer || "");

      if (winConfig.enabled !== false && targetAnswer &&
          (this.normalize(cleanMessage) === targetAnswer || this.normalize(rawMessage) === targetAnswer)) {
        const registeredPlayers = registrationManager.getRegisteredPlayers();

        const matchedRegPlayer = registeredPlayers.find((p) => {
          const registeredId = p?.playerId || p?.id || p?.tiktokId;
          const registeredUsername = this.normalize(p?.username);
          const registeredDisplayName = this.normalize(p?.displayName || p?.name);

          return (
            (eventPlayerId && registeredId && String(registeredId) === String(eventPlayerId)) ||
            (eventUsername && registeredUsername && eventUsername === registeredUsername) ||
            (eventDisplayName && registeredDisplayName && eventDisplayName === registeredDisplayName)
          );
        });

        if (matchedRegPlayer) {
          const scoringId = matchedRegPlayer.playerId || matchedRegPlayer.id || matchedRegPlayer.tiktokId || matchedRegPlayer.username;
          const player = playerWin(scoringId);

          if (player) {
            console.log("[WIN LIMPIA MATCHED] Correct answer awarded:", {
              player: player.name,
              points: player.points,
              wins: player.wins,
              correctAnswer: targetAnswer
            });

            eventBus.publish("win:correct_matched", {
              event,
              player,
              correctAnswer: targetAnswer,
              pointsAdded: 1,
              source: "WIN_LIMPIA"
            });

            return { accepted: true, win: true, player };
          }

          console.warn("[WIN LIMPIA] Registered player matched but could not be materialized for scoring:", matchedRegPlayer);
        } else {
          console.log("[WIN LIMPIA] Correct answer detected from unregistered viewer; ignored.");
        }
      }

      eventBus.publish("chat:command_rejected", {
        event,
        reason: "REGISTRATION_CLOSED_OR_NOT_ANSWER"
      });
      return { accepted: false, reason: "REGISTRATION_CLOSED_OR_NOT_ANSWER" };
    }

    // ================================================================
    // REGISTRATION — registration must be OPEN
    // ================================================================
    if (config.registrationMode !== "CHAT" && config.registrationMode !== "MIXED") {
      eventBus.publish("chat:command_rejected", {
        event,
        reason: "CHAT_REGISTRATION_DISABLED"
      });
      return { accepted: false, reason: "CHAT_REGISTRATION_DISABLED" };
    }

    const playerPayload = {
      playerId: event.playerId || event.userId || event.username,
      displayName: event.displayName || event.username || "Viewer",
      username: event.username || event.displayName || "Viewer",
      avatar: event.profilePictureUrl || event.avatar || event.profilePicture || "",
      source: "CHAT"
    };

    if (config.gameRegistrationMode === "INDIVIDUAL") {
      const targetCommand = (config.individualCommand || "entrar").trim().toLowerCase();
      const validCommands = [targetCommand, "entrar", "a", "!join", "yo", "1"];

      if (validCommands.includes(cleanMessage) || validCommands.includes(rawMessage)) {
        const result = registrationManager.registerPlayer(playerPayload);

        if (result.success) {
          eventBus.publish("chat:command_accepted", { event, player: result.player });
          return { accepted: true, player: result.player };
        }

        eventBus.publish("chat:command_rejected", { event, reason: result.reason });
        return { accepted: false, reason: result.reason };
      }
    } else if (config.gameRegistrationMode === "TEAMS" || config.gameRegistrationMode === "TEAM") {
      let matchedTeam = null;

      for (const team of config.teams || []) {
        if (team.commands && team.commands.some(cmd => {
          const normalizedCommand = cmd.trim().toLowerCase();
          return rawMessage === normalizedCommand || cleanMessage === normalizedCommand;
        })) {
          matchedTeam = team;
          break;
        }
      }

      if (matchedTeam) {
        const result = registrationManager.registerPlayer({
          ...playerPayload,
          teamId: matchedTeam.id
        });

        if (result.success) {
          eventBus.publish("chat:command_accepted", {
            event,
            player: result.player,
            teamId: matchedTeam.id
          });
          return { accepted: true, player: result.player, teamId: matchedTeam.id };
        }

        eventBus.publish("chat:command_rejected", { event, reason: result.reason });
        return { accepted: false, reason: result.reason };
      }
    }

    eventBus.publish("chat:command_rejected", { event, reason: "INVALID_COMMAND" });
    return { accepted: false, reason: "INVALID_COMMAND" };
  }
}

export const chatCommandParser = new ChatCommandParser();
