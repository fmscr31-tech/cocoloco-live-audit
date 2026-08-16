import { sessionManager } from "./sessionManager";
import { statisticsEngine } from "./engines/statisticsEngine";
import { rankingEngine } from "./engines/rankingEngine";
import { playerEngine } from "./engines/playerEngine";
import { gameRulesEngine } from "./engines/gameRulesEngine";
import { missionEngine } from "./engines/missionEngine";
import { battleEffectEngine } from "./engines/battleEffectEngine";
import { powerUpEngine } from "./engines/powerUpEngine";
import { historicalLeaderboardEngine } from "./engines/historicalLeaderboardEngine";
import { liveFlowManager } from "./liveFlowManager";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";
import { getState } from "./gameEngine";
import { eventBus } from "./eventBus";
import { chatCommandParser } from "./chatCommandParser";
import { isTimerRunning } from "./timerManager";

let currentMode = localStorage.getItem('cocoloco_game_mode') || 'INDIVIDUAL';
let liveSessionActive = false;

class DashboardAPI {
  constructor() {
    this.subscribers = new Set();
    this.cachedDashboard = null;
    this.initReactiveBridge();
  }
  getGameMode() { return currentMode; }
  setGameMode(mode) {
    currentMode = mode;
    localStorage.setItem('cocoloco_game_mode', mode);
    this.invalidateCache();
    eventBus.emit('GAME_MODE_CHANGED', { mode });
    return { success: true, mode };
  }
  isLiveActive() { return liveSessionActive; }
  setLiveSessionStatus(status) {
    liveSessionActive = status;
    this.invalidateCache();
    eventBus.emit('SESSION_STATUS_CHANGED', { active: status });
  }
  subscribeToModeChange(callback) { return eventBus.subscribe('GAME_MODE_CHANGED', callback); }
  invalidateCache() { this.cachedDashboard = null; }

  initReactiveBridge() {
    const notifySubscribers = (payload, eventName = null) => {
      console.log("[DASHBOARD NOTIFY] Subscribers notified after event, payload:", payload);
      this.invalidateCache();
      const data = this.getLiveDashboard();

      // SCORE/OVERLAY WIN IS AN AUTHORITATIVE CROSS-WINDOW STATE UPDATE.
      // Do not depend on eventManager/getNewEvent() for the live overlay score.
      // The browser-source overlay must receive the complete player snapshot
      // even when its local event history is empty or out of order.
      const isScoreEvent = eventName === "game:score_updated";
      const isWinEvent = eventName === "overlay:win";
      const snapshot = isScoreEvent
        ? payload?.playerSnapshot
        : (isWinEvent ? {
            id: payload?.id || payload?.playerId,
            playerId: payload?.playerId || payload?.id,
            tiktokId: payload?.tiktokId || "",
            name: payload?.name || payload?.username || "Jugador",
            displayName: payload?.name || payload?.username || "Jugador",
            username: payload?.username || payload?.name || "Jugador",
            teamId: payload?.teamId || null,
            points: Number(payload?.points) || 0,
            wins: Number(payload?.wins) || 0,
            wordsFound: Number(payload?.wordsFound) || 0
          } : null);

      if (snapshot && (isScoreEvent || isWinEvent)) {
        const snapshotId = snapshot.id || snapshot.playerId || snapshot.tiktokId;
        const currentPlayers = Array.isArray(data?.game?.players) ? [...data.game.players] : [];
        const index = currentPlayers.findIndex(player => {
          const playerId = player?.id || player?.playerId || player?.tiktokId;
          const playerUsername = String(player?.username || "").trim().toLowerCase();
          const snapshotUsername = String(snapshot?.username || "").trim().toLowerCase();
          const playerTikTokId = String(player?.tiktokId || player?.playerId || "");
          const snapshotTikTokId = String(snapshot?.tiktokId || snapshot?.playerId || "");
          return (
            (snapshotId && playerId && String(snapshotId) === String(playerId)) ||
            (snapshotUsername && playerUsername && snapshotUsername === playerUsername) ||
            (snapshotTikTokId && playerTikTokId && snapshotTikTokId === playerTikTokId)
          );
        });

        if (index >= 0) {
          currentPlayers[index] = { ...currentPlayers[index], ...snapshot };
        } else {
          currentPlayers.push({ ...snapshot });
        }

        data.game = { ...data.game, players: currentPlayers };

        // Team mode also reads team.points from the dashboard snapshot.
        // Carry the authoritative team snapshot across the same transport.
        if (payload?.teamSnapshot) {
          const teamSnapshot = payload.teamSnapshot;
          const teamId = teamSnapshot.id || teamSnapshot.teamId;
          const currentTeams = Array.isArray(data?.game?.teams) ? [...data.game.teams] : [];
          const teamIndex = currentTeams.findIndex(team => String(team?.id || team?.teamId) === String(teamId));
          if (teamIndex >= 0) currentTeams[teamIndex] = { ...currentTeams[teamIndex], ...teamSnapshot };
          else currentTeams.push({ ...teamSnapshot });
          data.game = { ...data.game, teams: currentTeams };
        }

        data.timestamp = Date.now();
        console.log("[DASHBOARD LIVE SCORE APPLIED]", {
          eventName,
          playerId: snapshotId,
          points: snapshot.points,
          wins: snapshot.wins,
          teamId: payload?.teamId || snapshot.teamId || null,
          teamPoints: payload?.newTeamTotal ?? payload?.teamPoints ?? null
        });
      }

      this.subscribers.forEach(cb => {
        try { cb(data); }
        catch (e) { console.error("Error in DashboardAPI subscriber callback:", e); }
      });
    };

    eventBus.subscribe("player:created", notifySubscribers);
    eventBus.subscribe("player:updated", notifySubscribers);
    eventBus.subscribe("PLAYER_CREATED", (payload) => {
      console.log("[DashboardAPI] PLAYER_CREATED received", payload);
      notifySubscribers(payload);
    });
    eventBus.subscribe("reward:processed", notifySubscribers);
    eventBus.subscribe("session:updated", notifySubscribers);
    eventBus.subscribe("session:started", notifySubscribers);
    eventBus.subscribe("session:ended", notifySubscribers);
    eventBus.subscribe("game:score_updated", (payload) => notifySubscribers(payload, "game:score_updated"));
    eventBus.subscribe("overlay:win", (payload) => notifySubscribers(payload, "overlay:win"));
    eventBus.subscribe("game:winner_detected", notifySubscribers);
    eventBus.subscribe("game:objective_completed", notifySubscribers);
    eventBus.subscribe("mission:created", notifySubscribers);
    eventBus.subscribe("mission:updated", notifySubscribers);
    eventBus.subscribe("mission:completed", notifySubscribers);
    eventBus.subscribe("effect:activated", notifySubscribers);
    eventBus.subscribe("effect:updated", notifySubscribers);
    eventBus.subscribe("effect:expired", notifySubscribers);
    eventBus.subscribe("effect:removed", notifySubscribers);
    eventBus.subscribe("powerup:activated", notifySubscribers);
    eventBus.subscribe("powerup:expired", notifySubscribers);
    eventBus.subscribe("powerup:removed", notifySubscribers);
    eventBus.subscribe("EXTERNAL_BATTLE_START", notifySubscribers);
    eventBus.subscribe("EXTERNAL_BATTLE_END", notifySubscribers);
    eventBus.subscribe("live:phase_changed", notifySubscribers);
    eventBus.subscribe("registration:updated", notifySubscribers);
    eventBus.subscribe("registration:opened", notifySubscribers);
    eventBus.subscribe("registration:closed", notifySubscribers);
    eventBus.subscribe("registration:locked", notifySubscribers);
    eventBus.subscribe("registration:cleared", notifySubscribers);
    eventBus.subscribe("registration:player_registered", notifySubscribers);
    eventBus.subscribe("registration:player_removed", notifySubscribers);
    eventBus.subscribe("registration:state_synced", notifySubscribers);
    eventBus.subscribe("round:started", notifySubscribers);
    eventBus.subscribe("ROUND_STARTED", notifySubscribers);
    eventBus.subscribe("round:finished", notifySubscribers);
    eventBus.subscribe("config:command_updated", notifySubscribers);
    eventBus.subscribe("GAME_MODE_CHANGED", (payload) => {
      const modeVal = payload?.mode || payload;
      if (typeof modeVal === "string") {
        currentMode = modeVal;
        localStorage.setItem('cocoloco_game_mode', modeVal);
      }
      notifySubscribers(payload);
    });
    eventBus.subscribe("SESSION_STATUS_CHANGED", notifySubscribers);
  }

  subscribe(callback) {
    if (typeof callback === "function") {
      this.subscribers.add(callback);
      callback(this.getLiveDashboard());
      return () => this.subscribers.delete(callback);
    }
  }
  getCurrentSession() { return sessionManager.getSession(); }

  getLiveDashboard() {
    if (this.cachedDashboard) return this.cachedDashboard;
    let session = {};
    try { session = sessionManager.getSession() || {}; } catch(e) {}
    let stats = {};
    try { stats = statisticsEngine.getStatistics() || {}; } catch(e) {}
    let rankings = [];
    try {
      if (typeof rankingEngine.getTopPlayers === "function") rankings = rankingEngine.getTopPlayers() || [];
      else if (typeof rankingEngine.getPlayerRanking === "function") {
        const pr = rankingEngine.getPlayerRanking();
        rankings = pr?.topPoints || pr || [];
      }
    } catch (e) { rankings = []; }
    if (!Array.isArray(rankings)) rankings = [];
    let rules = {};
    try { rules = gameRulesEngine.getCurrentRules() || {}; } catch(e) {}
    let missions = [];
    try { missions = missionEngine.getActiveMissions() || []; } catch(e) {}
    let battleEffects = {};
    try { battleEffects = battleEffectEngine.getEffectState() || {}; } catch(e) {}
    let powerUps = {};
    try { powerUps = powerUpEngine.getPowerUpState() || {}; } catch(e) {}
    let historical = {};
    try { historical = historicalLeaderboardEngine.getSessionLeaderboard(session) || {}; } catch(e) {}
    let livePhase = {};
    try { livePhase = liveFlowManager.getPhaseState() || {}; } catch(e) {}
    let registration = {};
    try { registration = registrationManager.getRegistrationState() || {}; } catch(e) {}
    let commandConfig = {};
    try { commandConfig = commandConfigManager.getConfig() || {}; } catch(e) {}
    let game = {};
    try { game = getState() || {}; } catch(e) {}

    const registeredPlayers = Array.isArray(registration?.players) ? registration.players : [];
    const gamePlayers = Array.isArray(game?.players) ? game.players : [];
    if (registeredPlayers.length > 0) {
      const mergedPlayers = gamePlayers.map(player => ({ ...player }));
      registeredPlayers.forEach(registered => {
        const registeredId = registered?.playerId || registered?.id || registered?.tiktokId || registered?.username;
        const registeredUsername = String(registered?.username || "").trim().toLowerCase();
        const registeredDisplayName = String(registered?.displayName || registered?.name || "").trim().toLowerCase();
        const existingIndex = mergedPlayers.findIndex(player => {
          const playerId = player?.id || player?.playerId || player?.tiktokId;
          const playerUsername = String(player?.username || "").trim().toLowerCase();
          const playerName = String(player?.displayName || player?.name || "").trim().toLowerCase();
          return (
            (registeredId && playerId && String(playerId) === String(registeredId)) ||
            (registeredUsername && playerUsername && registeredUsername === playerUsername) ||
            (registeredDisplayName && playerName && registeredDisplayName === playerName)
          );
        });
        if (existingIndex >= 0) {
          mergedPlayers[existingIndex] = {
            ...mergedPlayers[existingIndex],
            teamId: registered.teamId || mergedPlayers[existingIndex].teamId || null,
            teamName: registered.teamName || mergedPlayers[existingIndex].teamName || null,
            displayName: registered.displayName || mergedPlayers[existingIndex].displayName,
            username: registered.username || mergedPlayers[existingIndex].username,
            avatar: registered.avatar || mergedPlayers[existingIndex].avatar || ""
          };
        } else {
          mergedPlayers.push({
            id: registeredId,
            playerId: registered.playerId || registered.id || registeredId,
            tiktokId: registered.playerId || registered.id || registered.tiktokId || "",
            name: registered.displayName || registered.name || registered.username || registeredId,
            displayName: registered.displayName || registered.name || registered.username || registeredId,
            username: registered.username || registered.displayName || registeredId,
            avatar: registered.avatar || "",
            teamId: registered.teamId || null,
            teamName: registered.teamName || null,
            points: Number(registered.points) || 0,
            wins: Number(registered.wins) || 0,
            wordsFound: Number(registered.wordsFound) || 0,
            messages: Number(registered.messages) || 0
          });
        }
      });
      game = { ...game, players: mergedPlayers };
    }

    this.cachedDashboard = {
      session,
      stats,
      statistics: stats,
      rankings,
      rules,
      missions,
      battleEffects,
      powerUps,
      historical,
      historicalLeaderboard: historical,
      livePhase,
      registration,
      commandConfig,
      game,
      recentActivity: [],
      gameMode: currentMode,
      liveActive: liveSessionActive,
      timestamp: Date.now()
    };
    return this.cachedDashboard;
  }
}

export const dashboardAPI = new DashboardAPI();
