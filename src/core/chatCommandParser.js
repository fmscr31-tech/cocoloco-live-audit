import { eventBus } from "./eventBus";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";
import { getState, playerWin } from "./gameEngine";
import { getCurrentRound } from "./roundManager";
import { addPlayer } from "./playerManager";

class ChatCommandParser {
  constructor() {
    this.initListener();
    this.initWinListener();
    this.initContextoBridge();
  }

  initListener() {
    eventBus.subscribe("normalized:chat", (event) => this.parseChatEvent(event));
  }

  initWinListener() {
    eventBus.subscribe("win:detected", (event) => this.processWinSignal(event));
  }

  initContextoBridge() {
    if (typeof window === "undefined") return;
    if (window.__COCOLOCO_CONTEXTO_BRIDGE__) return;
    window.__COCOLOCO_CONTEXTO_BRIDGE__ = true;

    const install = () => {
      const gameManager = window.GameManager;
      if (!gameManager || typeof gameManager.endRound !== "function") {
        window.setTimeout(install, 250);
        return;
      }

      if (gameManager.__COCOLOCO_WIN_BRIDGE__) return;
      const originalEndRound = gameManager.endRound;

      gameManager.endRound = function(result, winners = [], answer = "") {
        const normalizedResult = String(result || "").trim().toLowerCase();

        if (normalizedResult === "win" && !window.__COCOLOCO_LAST_WIN_SIGNAL__) {
          const winner = Array.isArray(winners) ? winners[0] : winners;
          if (winner && typeof winner === "object") {
            const payload = {
              type: "WIN_LIMPIA",
              winLimpia: true,
              playerId: winner.playerId || winner.userId || winner.tiktokId || winner.uniqueId || winner.id || "",
              userId: winner.userId || winner.playerId || winner.tiktokId || winner.uniqueId || winner.id || "",
              username: winner.username || winner.uniqueId || "",
              displayName: winner.displayName || winner.name || winner.nickname || winner.username || winner.uniqueId || "Jugador",
              avatar: winner.avatar || winner.photoUrl || winner.profilePictureUrl || winner.photo || "",
              source: "CONTEXTO_GAME_MANAGER",
              answer: answer || "",
              timestamp: Date.now()
            };

            window.__COCOLOCO_LAST_WIN_SIGNAL__ = true;
            console.log("[WIN LIMPIA CONTEXTO BRIDGE]", payload);
            eventBus.publish("win:detected", payload);

            window.setTimeout(() => {
              window.__COCOLOCO_LAST_WIN_SIGNAL__ = false;
            }, 1000);
          }
        }

        return originalEndRound.apply(this, arguments);
      };

      gameManager.__COCOLOCO_WIN_BRIDGE__ = true;
      console.log("[WIN LIMPIA CONTEXTO BRIDGE INSTALLED]");
    };

    install();
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

  _getRoundContext() {
    let gameState = null;
    try { gameState = getState(); } catch (error) { console.warn("[CHAT LIVE] Could not read game state:", error); }

    let currentRound = null;
    try { currentRound = getCurrentRound(); } catch (error) { console.warn("[CHAT LIVE] Could not read canonical round:", error); }

    const activeRound = Boolean(
      currentRound?.status === "active" ||
      gameState?.round?.status === "active" ||
      gameState?.round?.active === true
    );

    return { gameState, currentRound, activeRound };
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
    const { gameState, currentRound, activeRound } = this._getRoundContext();

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

    if (regState.status === "OPEN") {
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

    if (activeRound) {
      // Contexto is authoritative for WIN LIMPIA. The live chat parser must
      // forward every active-round guess to the Contexto engine and must never
      // compare chat text against a configured answer.
      const contextoUser = {
        ...event,
        comment: rawMessage,
        message: rawMessage,
        uniqueId: event.uniqueId || event.username || eventPlayerId,
        username: event.username || event.uniqueId || "",
        nickname: event.displayName || event.nickname || event.username || "Jugador",
        displayName: event.displayName || event.nickname || event.username || "Jugador",
        userId: event.userId || event.playerId || eventPlayerId,
        playerId: event.playerId || event.userId || eventPlayerId,
        photoUrl: event.photoUrl || event.profilePictureUrl || event.avatar || ""
      };

      // IMPORTANT: Contexto exposes its authoritative submitWord API directly.
      // Prefer it over the legacy wrapper because the wrapper can be absent in
      // the CocoLoco manager window even while Contexto itself is fully loaded.
      const submitWord =
        typeof window !== "undefined" && typeof window.Contexto?.submitWord === "function"
          ? window.Contexto.submitWord.bind(window.Contexto)
          : null;

      if (submitWord) {
        console.log("[WIN LIMPIA CHAT -> CONTEXTO.submitWord]", {
          playerId: contextoUser.playerId,
          username: contextoUser.username,
          comment: contextoUser.comment
        });
        try {
          Promise.resolve(submitWord(contextoUser)).catch((error) => {
            console.error("[WIN LIMPIA CONTEXTO.submitWord ASYNC ERROR]", error);
          });
          return { accepted: true, forwardedToContexto: true, transport: "Contexto.submitWord" };
        } catch (error) {
          console.error("[WIN LIMPIA CONTEXTO.submitWord ERROR]", error);
          return { accepted: false, reason: "CONTEXTO_FORWARD_FAILED" };
        }
      }

      // Backward-compatible fallback for builds that expose only the wrapper.
      if (typeof window !== "undefined" && typeof window.handleRealComment === "function") {
        console.log("[WIN LIMPIA CHAT -> handleRealComment]", {
          playerId: contextoUser.playerId,
          username: contextoUser.username,
          comment: contextoUser.comment
        });
        try {
          window.handleRealComment(contextoUser);
          return { accepted: true, forwardedToContexto: true, transport: "handleRealComment" };
        } catch (error) {
          console.error("[WIN LIMPIA CONTEXTO FORWARD ERROR]", error);
          return { accepted: false, reason: "CONTEXTO_FORWARD_FAILED" };
        }
      }

      console.warn("[WIN LIMPIA CONTEXTO UNAVAILABLE] Active-round chat could not be forwarded", {
        hasContexto: Boolean(typeof window !== "undefined" && window.Contexto),
        hasSubmitWord: Boolean(typeof window !== "undefined" && typeof window.Contexto?.submitWord === "function"),
        hasHandleRealComment: Boolean(typeof window !== "undefined" && typeof window.handleRealComment === "function")
      });
      eventBus.publish("chat:command_rejected", { event, reason: "CONTEXTO_UNAVAILABLE" });
      return { accepted: false, reason: "CONTEXTO_UNAVAILABLE" };
    }

    eventBus.publish("chat:command_rejected", { event, reason: "REGISTRATION_CLOSED_OR_NOT_ANSWER" });
    return { accepted: false, reason: "REGISTRATION_CLOSED_OR_NOT_ANSWER" };
  }

  processWinSignal(event) {
    console.log("[WIN LIMPIA SIGNAL RECEIVED]", event);

    if (!event?.winLimpia && event?.type !== "WIN_LIMPIA") {
      console.warn("[WIN LIMPIA] Ignoring non-authoritative signal", event);
      return { accepted: false, reason: "INVALID_WIN_SIGNAL" };
    }

    const regState = registrationManager.getRegistrationState();
    const { activeRound } = this._getRoundContext();

    if (!activeRound) {
      console.warn("[WIN LIMPIA] Winner signal received outside active round", { event, regState });
      return { accepted: false, reason: "NO_ACTIVE_ROUND" };
    }

    const eventPlayerId = event.playerId || event.userId || event.uniqueId || event.username || event.displayName;
    const eventUsername = this.normalize(event.username || event.uniqueId);
    const eventDisplayName = this.normalize(event.displayName || event.nickname);

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

    if (!matchedRegPlayer) {
      console.log("[WIN LIMPIA] Winner signal belongs to an unregistered viewer; ignored.", {
        eventPlayerId,
        eventUsername,
        eventDisplayName
      });
      return { accepted: false, reason: "WINNER_NOT_REGISTERED" };
    }

    const scoringId = matchedRegPlayer.playerId || matchedRegPlayer.id || matchedRegPlayer.tiktokId || matchedRegPlayer.username;

    const scoringPlayer = addPlayer({
      name: matchedRegPlayer.displayName || matchedRegPlayer.username || scoringId,
      displayName: matchedRegPlayer.displayName || matchedRegPlayer.username || scoringId,
      username: matchedRegPlayer.username || matchedRegPlayer.displayName || scoringId,
      tiktokId: scoringId,
      avatar: matchedRegPlayer.avatar || event.avatar || "",
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
    if (!player) {
      console.error("[WIN LIMPIA FATAL] Identity was materialized but playerWin returned null", {
        scoringId,
        scoringPlayer
      });
      return { accepted: false, reason: "SCORE_UPDATE_FAILED" };
    }

    console.log("[WIN LIMPIA SUCCESS] +1 POINT +1 WIN", {
      playerId: player.id,
      tiktokId: player.tiktokId,
      player: player.name,
      points: player.points,
      wins: player.wins,
      wordsFound: player.wordsFound,
      source: "WIN_LIMPIA_EXTERNAL"
    });

    eventBus.publish("win:correct_matched", {
      event,
      player,
      pointsAdded: 1,
      winsAdded: 1,
      source: "WIN_LIMPIA_EXTERNAL"
    });

    return { accepted: true, win: true, player };
  }
}

export const chatCommandParser = new ChatCommandParser();
