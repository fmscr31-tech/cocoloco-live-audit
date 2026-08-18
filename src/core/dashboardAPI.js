import { sessionManager } from "./sessionManager";
import { statisticsEngine } from "./engines/statisticsEngine";
import { rankingEngine } from "./engines/rankingEngine";
import { playerEngine } from "./engines/playerEngine";
import { gameRulesEngine } from "./engines/gameRulesEngine";
import { missionEngine } from "./engines/missionEngine";
import { battleEffectEngine } from "./engines/battleEffectEngine";
import { powerUpEngine } from "./powerUpEngine";
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

    // IMPORTANT: a browser-source overlay is a separate JS runtime. Its local
    // sessionManager/gameEngine are NOT the Admin runtime's state. Therefore a
    // remote event alone is insufficient; the Admin must transmit the complete
    // authoritative dashboard snapshot. This listener consumes that snapshot
    // without rebuilding it from the overlay's stale local stores.
    eventBus.subscribe("dashboard:snapshot", (dashboard) => {
      if (!dashboard || typeof dashboard !== "object") return;
      this.cachedDashboard = dashboard;
      if (dashboard.gameMode) currentMode = dashboard.gameMode;
      if (typeof dashboard.liveActive === "boolean") liveSessionActive = dashboard.liveActive;
      this.subscribers.forEach(cb => {
        try { cb(dashboard); }
        catch (e) { console.error("Error in remote DashboardAPI subscriber callback:", e); }
      });
    });
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
      this.invalidateCache();
      const data = this.getLiveDashboard();

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
          return (snapshotId && playerId && String(snapshotId) === String(playerId)) ||
            (snapshotUsername && playerUsername && snapshotUsername === playerUsername) ||
            (snapshotTikTokId && playerTikTokId && snapshotTikTokId === playerTikTokId);
        });
        if (index >= 0) currentPlayers[index] = { ...currentPlayers[index], ...snapshot };
        else if (snapshotId || snapshot.username) currentPlayers.push({ ...snapshot });
        data.game = { ...data.game, players: currentPlayers };

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
      }

      // THIS IS THE KEY CROSS-WINDOW FIX.
      // Send the complete authoritative dashboard state, not merely the event.
      // The receiving overlay must never call its own stale getLiveDashboard()
      // to reconstruct Admin state.
      eventBus.emit("dashboard:snapshot", { ...data, timestamp: Date.now() });

      this.subscribers.forEach(cb => {
        try { cb(data); }
        catch (e) { console.error("Error in DashboardAPI subscriber callback:", e); }
      });
    };

    const simpleEvents = [
      "player:created", "player:updated", "PLAYER_CREATED", "reward:processed",
      "session:updated", "session:started", "session:ended", "game:winner_detected",
      "game:objective_completed", "mission:created", "mission:updated", "mission:completed",
      "effect:activated", "effect:updated", "effect:expired", "effect:removed",
      "powerup:activated", "powerup:expired", "powerup:removed", "EXTERNAL_BATTLE_START",
      "EXTERNAL_BATTLE_END", "live:phase_changed", "registration:updated",
      "registration:opened", "registration:closed", "registration:locked", "registration:cleared",
      "registration:player_registered", "registration:player_removed", "registration:state_synced",
      "round:started", "ROUND_STARTED", "round:finished", "config:command_updated",
      "SESSION_STATUS_CHANGED"
    ];
    simpleEvents.forEach(name => eventBus.subscribe(name, payload => notifySubscribers(payload, name)));
    eventBus.subscribe("game:score_updated", payload => notifySubscribers(payload, "game:score_updated"));
    eventBus.subscribe("overlay:win", payload => notifySubscribers(payload, "overlay:win"));
    eventBus.subscribe("GAME_MODE_CHANGED", (payload) => {
      const modeVal = payload?.mode || payload;
      if (typeof modeVal === "string") {
        currentMode = modeVal;
        localStorage.setItem('cocoloco_game_mode', modeVal);
      }
      notifySubscribers(payload, "GAME_MODE_CHANGED");
    });
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
          return (registeredId && playerId && String(playerId) === String(registeredId)) ||
            (registeredUsername && playerUsername && registeredUsername === playerUsername) ||
            (registeredDisplayName && playerName && registeredDisplayName === playerName);
        });
        if (existingIndex >= 0) {
          mergedPlayers[existingIndex] = { ...mergedPlayers[existingIndex], teamId: registered.teamId || mergedPlayers[existingIndex].teamId || null, teamName: registered.teamName || mergedPlayers[existingIndex].teamName || null, displayName: registered.displayName || mergedPlayers[existingIndex].displayName, username: registered.username || mergedPlayers[existingIndex].username, avatar: registered.avatar || mergedPlayers[existingIndex].avatar || "" };
        } else {
          mergedPlayers.push({ id: registeredId, playerId: registered.playerId || registered.id || registeredId, tiktokId: registered.playerId || registered.id || registered.tiktokId || "", name: registered.displayName || registered.name || registered.username || registeredId, displayName: registered.displayName || registered.name || registered.username || registeredId, username: registered.username || registered.displayName || registeredId, avatar: registered.avatar || "", teamId: registered.teamId || null, teamName: registered.teamName || null, points: Number(registered.points) || 0, wins: Number(registered.wins) || 0, wordsFound: Number(registered.wordsFound) || 0, messages: Number(registered.messages) || 0 });
        }
      });
      game = { ...game, players: mergedPlayers };
    }

    this.cachedDashboard = { session, stats, statistics: stats, rankings, rules, missions, battleEffects, powerUps, historical, historicalLeaderboard: historical, livePhase, registration, commandConfig, game, recentActivity: [], gameMode: currentMode, liveActive: liveSessionActive, timestamp: Date.now() };
    return this.cachedDashboard;
  }
}

export const dashboardAPI = new DashboardAPI();
