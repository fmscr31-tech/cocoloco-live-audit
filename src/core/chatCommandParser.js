import { eventBus } from "./eventBus";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";
import { playerWin } from "./gameEngine";
import { getPlayerByName, players } from "./playerManager";

/**
 * Chat Command Parser v3 (Live Trace Instrumented)
 * Processes normalized neutral chat events.
 * - When registration is OPEN: parses join/team commands.
 * - When registration is CLOSED (round active): parses chat messages against Win Limpia correct answers for registered players.
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

  /**
   * Processes a normalized chat event.
   * Expected format: { type: "CHAT", playerId: "123", displayName: "Name", message: "!esp" }
   */
  parseChatEvent(event) {
    console.log("[CHAT LIVE 01] RAW EVENT RECEIVED", event);
    if (!event || event.type !== "CHAT") return { accepted: false, reason: "INVALID_EVENT" };

    console.log("[CHAT LIVE 02] EVENT NORMALIZED", event);
    const rawMessage = (event.message || "").trim().toLowerCase();
    const cleanMessage = rawMessage.replace(/[.,;!]+$/, "").trim();
    console.log("[CHAT LIVE 03] MESSAGE TEXT", { rawMessage, cleanMessage, username: event.displayName || event.username });

    const regState = registrationManager.getRegistrationState();
    console.log("[CHAT LIVE 04] REGISTRATION STATE", regState);

    const config = commandConfigManager.getConfig();
    console.log("[CHAT LIVE 05] COMMAND CONFIG", config);

    // 1. IF REGISTRATION IS CLOSED (ROUND ACTIVE), CHECK WIN LIMPIA ANSWER MATCHING
    if (regState.status !== "OPEN") {
      const winConfig = config.winLimpia || { enabled: true, correctAnswer: "clase", points: 1 };
      
      if (winConfig.enabled && winConfig.correctAnswer) {
        const targetAnswer = winConfig.correctAnswer.trim().toLowerCase();
        const normalizeStr = (str) => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
        
        if (normalizeStr(cleanMessage) === normalizeStr(targetAnswer) || normalizeStr(rawMessage) === normalizeStr(targetAnswer)) {
          // Verify if player is registered in the current round
          const playerId = event.playerId || event.userId || event.username;
          const registeredPlayers = registrationManager.getRegisteredPlayers();
          const matchedRegPlayer = registeredPlayers.find(p => 
            p.playerId === playerId || 
            p.username?.toLowerCase() === (event.username || "").toLowerCase() || 
            p.displayName?.toLowerCase() === (event.displayName || "").toLowerCase()
          );

          // STRICT CHECK: Unregistered players are ignored and NEVER auto-created
          if (matchedRegPlayer) {
            let player = getPlayerByName(matchedRegPlayer.displayName || matchedRegPlayer.username);
            if (!player && matchedRegPlayer.playerId) {
              player = players.find(p => p.tiktokId === matchedRegPlayer.playerId || p.id === matchedRegPlayer.playerId);
            }
            if (player) {
              console.log("[WIN LIMPIA MATCHED] Correct answer by registered player:", player.name);
              playerWin(player.id);
              eventBus.publish("win:correct_matched", { event, player, correctAnswer: targetAnswer });
              return { accepted: true, win: true, player };
            }
          }
        }
      }

      eventBus.publish("chat:command_rejected", { event, reason: "REGISTRATION_CLOSED_OR_NOT_ANSWER" });
      return { accepted: false, reason: "REGISTRATION_CLOSED_OR_NOT_ANSWER" };
    }

    // 2. IF REGISTRATION IS OPEN: PROCESS REGISTRATION COMMANDS
    if (config.registrationMode !== "CHAT" && config.registrationMode !== "MIXED") {
      console.log("[CHAT LIVE] Chat registration disabled by mode:", config.registrationMode);
      eventBus.publish("chat:command_rejected", { event, reason: "CHAT_REGISTRATION_DISABLED" });
      return { accepted: false, reason: "CHAT_REGISTRATION_DISABLED" };
    }

    const playerPayload = {
      playerId: event.playerId || event.userId || event.username,
      displayName: event.displayName || event.username || "Viewer",
      username: event.username || event.displayName || "Viewer",
      avatar: event.profilePictureUrl || event.avatar || event.profilePicture || event.payload?.profilePictureUrl || event.payload?.data?.profilePictureUrl || "",
      source: "CHAT"
    };

    if (config.gameRegistrationMode === "INDIVIDUAL") {
      const targetCommand = (config.individualCommand || "entrar").trim().toLowerCase();
      const validCommands = [targetCommand, "entrar", "a", "!join", "yo", "1"];
      console.log("[CHAT LIVE 06] COMMAND MATCH CHECK", { cleanMessage, rawMessage, validCommands });

      if (validCommands.includes(cleanMessage) || validCommands.includes(rawMessage)) {
        console.log("[CHAT LIVE 07] REGISTER ATTEMPT", playerPayload);
        const result = registrationManager.registerPlayer(playerPayload);

        if (result.success) {
          console.log("[CHAT LIVE 08] PLAYER REGISTERED", result.player);
          console.log("[CHAT LIVE 09] GAME STATE UPDATED", { playerCount: registrationManager.getRegisteredPlayers().length });
          eventBus.publish("chat:command_accepted", { event, player: result.player });
          return { accepted: true, player: result.player };
        } else {
          console.log("[CHAT LIVE] REGISTER REJECTED", { reason: result.reason });
          eventBus.publish("chat:command_rejected", { event, reason: result.reason });
          return { accepted: false, reason: result.reason };
        }
      }
    } else if (config.gameRegistrationMode === "TEAMS" || config.gameRegistrationMode === "TEAM") {
      let matchedTeam = null;
      for (const team of config.teams) {
        if (team.commands && team.commands.some(cmd => rawMessage === cmd.trim().toLowerCase() || cleanMessage === cmd.trim().toLowerCase())) {
          matchedTeam = team;
          break;
        }
      }

      if (matchedTeam) {
        console.log("[CHAT LIVE 06] TEAM COMMAND MATCH", { teamId: matchedTeam.id });
        console.log("[CHAT LIVE 07] REGISTER ATTEMPT (TEAM)", playerPayload);
        const result = registrationManager.registerPlayer({
          ...playerPayload,
          teamId: matchedTeam.id
        });

        if (result.success) {
          console.log("[CHAT LIVE 08] PLAYER REGISTERED (TEAM)", result.player);
          console.log("[CHAT LIVE 09] GAME STATE UPDATED (TEAM)", { playerCount: registrationManager.getRegisteredPlayers().length });
          eventBus.publish("chat:command_accepted", { event, player: result.player, teamId: matchedTeam.id });
          return { accepted: true, player: result.player, teamId: matchedTeam.id };
        } else {
          console.log("[CHAT LIVE] REGISTER REJECTED (TEAM)", { reason: result.reason });
          eventBus.publish("chat:command_rejected", { event, reason: result.reason });
          return { accepted: false, reason: result.reason };
        }
      }
    }

    eventBus.publish("chat:command_rejected", { event, reason: "INVALID_COMMAND" });
    return { accepted: false, reason: "INVALID_COMMAND" };
  }
}

export const chatCommandParser = new ChatCommandParser();
