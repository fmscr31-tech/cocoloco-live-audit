import { eventBus } from "./eventBus";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";
import { getState, playerWin } from "./gameEngine";
import { getCurrentRound } from "./roundManager";
import { addPlayer } from "./playerManager";

class ChatCommandParser {
  constructor() { this.initListener(); }

  initListener() {
    eventBus.subscribe("normalized:chat", (event) => this.parseChatEvent(event));
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
    if (!event || event.type !== "CHAT") return { accepted: false, reason: "INVALID_EVENT" };

    const rawMessage = String(event.message || event.comment || event.text || "").trim();
    const cleanMessage = this.normalize(rawMessage);
    const eventPlayerId = event.playerId || event.userId || event.uniqueId || event.username || event.displayName;
    const eventUsername = this.normalize(event.username || event.uniqueId);
    const eventDisplayName = this.normalize(event.displayName || event.nickname);

    const regState = registrationManager.getRegistrationState();
    const config = commandConfigManager.refreshFromStorage();

    let gameState = null;
    try { gameState = getState(); } catch (error) { console.warn("[CHAT LIVE] Could not read game state:", error); }

    let currentRound = null;
    try { currentRound = getCurrentRound(); } catch (error) { console.warn("[CHAT LIVE] Could not read canonical round:", error); }

    const activeRound = Boolean(
      currentRound?.status === "active" ||
      gameState?.round?.status === "active" ||
      gameState?.round?.active === true
    );

    console.log("[CHAT LIVE 02] EVENT NORMALIZED", {
      playerId: eventPlayerId,
      username: event.username,
      displayName: event.displayName,
      message: rawMessage
    });
    console.log("[CHAT LIVE 03] REGISTRATION STATE", regState);
    console.log("[CHAT LIVE 04] ACTIVE ROUND", activeRound, {
      canonicalStatus: currentRound?.status,
      stateStatus: gameState?.round?.status,
      legacyActive: gameState?.round?.active
    });
    console.log("[CHAT LIVE 05] COMMAND CONFIG", config);

    if (activeRound || regState.status !== "OPEN") {
      const winConfig = config.winLimpia || {};
      const configuredAnswer = this.normalize(
        winConfig.correctAnswer ?? winConfig.answer ?? winConfig.word ?? ""
      );

      const roundAnswer = this.normalize(
        currentRound?.correctAnswer ??
        currentRound?.answer ??
        currentRound?.word ??
        gameState?.round?.correctAnswer ??
        gameState?.round?.answer ??
        gameState?.round?.word ??
        ""
      );

      // CRITICAL WIN LIMPIA RULE:
      // During an active round, the answer selected for THIS round is the
      // scoring authority. The command configuration can be stale (for
      // example "clase") while the active round is actually "paradoja" or
      // "poeta". Never let persisted config override an active round answer.
      // Config is only the fallback for legacy rounds with no round answer.
      const targetAnswer = activeRound
        ? (roundAnswer || configuredAnswer)
        : (configuredAnswer || roundAnswer);
      const answerSource = activeRound
        ? (roundAnswer ? "ACTIVE_ROUND" : "WIN_LIMPIA_CONFIG_FALLBACK")
        : (configuredAnswer ? "WIN_LIMPIA_CONFIG" : "ACTIVE_ROUND_FALLBACK");

      console.log("[WIN LIMPIA CHECK]", {
        enabled: winConfig.enabled !== false,
        activeRound,
        targetAnswer,
        receivedAnswer: cleanMessage,
        matches: Boolean(targetAnswer && cleanMessage === targetAnswer),
        eventPlayerId,
        eventUsername,
        eventDisplayName,
        roundAnswer: roundAnswer || null,
        configuredAnswer: configuredAnswer || null,
        answerSource
      });

      if (winConfig.enabled !== false && targetAnswer && cleanMessage === targetAnswer) {
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

          console.log("[WIN LIMPIA MATCH]", { matchedRegPlayer, scoringId });

          const scoringPlayer = addPlayer({
            name: matchedRegPlayer.displayName || matchedRegPlayer.username || scoringId,
            displayName: matchedRegPlayer.displayName || matchedRegPlayer.username || scoringId,
            username: matchedRegPlayer.username || matchedRegPlayer.displayName || scoringId,
            tiktokId: scoringId,
            avatar: matchedRegPlayer.avatar || "",
            teamId: matchedRegPlayer.teamId || null
          });

          console.log("[WIN LIMPIA SCORE IDENTITY READY]", {
            scoringId,
            localPlayerId: scoringPlayer?.id || null,
            localTikTokId: scoringPlayer?.tiktokId || null,
            beforePoints: scoringPlayer?.points ?? null,
            beforeWins: scoringPlayer?.wins ?? null
          });

          const player = playerWin(scoringId);
          if (player) {
            console.log("[WIN LIMPIA SUCCESS] +1 POINT +1 WIN", {
              playerId: player.id,
              tiktokId: player.tiktokId,
              player: player.name,
              points: player.points,
              wins: player.wins,
              wordsFound: player.wordsFound,
              correctAnswer: targetAnswer
            });

            eventBus.publish("win:correct_matched", {
              event,
              player,
              correctAnswer: targetAnswer,
              pointsAdded: 1,
              winsAdded: 1,
              source: "WIN_LIMPIA"
            });

            return { accepted: true, win: true, player };
          }

          console.error("[WIN LIMPIA FATAL] Identity was materialized but playerWin returned null", {
            scoringId,
            scoringPlayer
          });
        } else {
          console.log("[WIN LIMPIA] Correct answer from unregistered viewer; ignored.");
        }
      }

      if (activeRound) {
        eventBus.publish("chat:command_rejected", { event, reason: "ACTIVE_ROUND_NOT_CORRECT_ANSWER" });
        return { accepted: false, reason: "ACTIVE_ROUND_NOT_CORRECT_ANSWER" };
      }

      eventBus.publish("chat:command_rejected", { event, reason: "REGISTRATION_CLOSED_OR_NOT_ANSWER" });
      return { accepted: false, reason: "REGISTRATION_CLOSED_OR_NOT_ANSWER" };
    }

    if (config.registrationMode !== "CHAT" && config.registrationMode !== "MIXED") {
      eventBus.publish("chat:command_rejected", { event, reason: "CHAT_REGISTRATION_DISABLED" });
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
        const result = registrationManager.registerPlayer({ ...playerPayload, teamId: matchedTeam.id });
        if (result.success) {
          eventBus.publish("chat:command_accepted", { event, player: result.player, teamId: matchedTeam.id });
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
