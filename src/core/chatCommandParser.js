import { eventBus } from "./eventBus";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";
import { getState, playerWin } from "./gameEngine";

/**
 * Chat Command Parser v5
 *
 * Registration remains unchanged when the registration window is OPEN.
 * During an active round, the configured Win Limpia answer is evaluated first
 * so a correct answer cannot accidentally fall through to registration logic.
 * Identity matching accepts TikTok/player id, username, or display name.
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
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  parseChatEvent(event) {
    console.log("[CHAT LIVE 01] RAW EVENT RECEIVED", event);
    if (!event || event.type !== "CHAT") {
      return { accepted: false, reason: "INVALID_EVENT" };
    }

    const rawMessage = String(event.message || event.comment || event.text || "").trim();
    const cleanMessage = this.normalize(rawMessage);
    const eventPlayerId = event.playerId || event.userId || event.uniqueId || event.username || event.displayName;
    const eventUsername = this.normalize(event.username || event.uniqueId);
    const eventDisplayName = this.normalize(event.displayName || event.nickname);

    console.log("[CHAT LIVE 02] EVENT NORMALIZED", {
      playerId: eventPlayerId,
      username: event.username,
      displayName: event.displayName,
      message: rawMessage
    });

    const regState = registrationManager.getRegistrationState();
    const config = commandConfigManager.getConfig();

    let gameState = null;
    try {
      gameState = getState();
    } catch (error) {
      console.warn("[CHAT LIVE] Could not read game state for Win Limpia:", error);
    }

    const activeRound = Boolean(gameState?.round?.active);

    console.log("[CHAT LIVE 03] REGISTRATION STATE", regState);
    console.log("[CHAT LIVE 04] ACTIVE ROUND", activeRound);
    console.log("[CHAT LIVE 05] COMMAND CONFIG", config);

    // ================================================================
    // WIN LIMPIA — ALWAYS FIRST DURING AN ACTIVE ROUND
    // ================================================================
    // Do not depend solely on registration.status here. The round lifecycle
    // is the authoritative signal that answers should be scored. This prevents
    // a stale OPEN registration state from swallowing the correct-answer chat.
    if (activeRound || regState.status !== "OPEN") {
      const winConfig = config.winLimpia || {};
      const targetAnswer = this.normalize(
        winConfig.correctAnswer ?? winConfig.answer ?? winConfig.word ?? ""
      );

      if (
        winConfig.enabled !== false &&
        targetAnswer &&
        cleanMessage === targetAnswer
      ) {
        const registeredPlayers = registrationManager.getRegisteredPlayers();

        const matchedRegPlayer = registeredPlayers.find((p) => {
          const registeredId = p?.playerId || p?.id || p?.tiktokId;
          const registeredUsername = this.normalize(p?.username || p?.uniqueId);
          const registeredDisplayName = this.normalize(p?.displayName || p?.name || p?.nickname);

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

      // During an active round, a non-winning message must continue through the
      // normal chat rejection path and must never register a new player.
      if (activeRound) {
        eventBus.publish("chat:command_rejected", {
          event,
          reason: "ACTIVE_ROUND_NOT_CORRECT_ANSWER"
        });
        return { accepted: false, reason: "ACTIVE_ROUND_NOT_CORRECT_ANSWER" };
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
      playerId: event.playerId || event.userId || event.uniqueId || event.username,
      displayName: event.displayName || event.username || event.nickname || "Viewer",
      username: event.username || event.uniqueId || event.displayName || "Viewer",
      avatar: event.profilePictureUrl || event.avatar || event.profilePicture || "",
      source: "CHAT"
    };

    if (config.gameRegistrationMode === "INDIVIDUAL") {
      const targetCommand = this.normalize(config.individualCommand || "entrar");
      const validCommands = new Set([targetCommand, "entrar", "a", "join", "yo", "1"]);

      if (validCommands.has(cleanMessage)) {
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
        if (team.commands && team.commands.some(cmd => this.normalize(cmd) === cleanMessage)) {
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
