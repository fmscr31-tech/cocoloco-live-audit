import { sessionManager } from "./sessionManager";
import { statisticsEngine } from "./engines/statisticsEngine";
import { rankingEngine } from "./engines/rankingEngine";
import { playerEngine } from "./engines/playerEngine";
import { gameRulesEngine } from "./engines/gameRulesEngine";
import { missionEngine } from "./engines/missionEngine";
import { battleEffectEngine } from "./engines/battleEffectEngine";
import { historicalLeaderboardEngine } from "./engines/historicalLeaderboardEngine";
import { liveFlowManager } from "./liveFlowManager";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";
import { getState } from "./gameEngine";
import { getTeams } from "./TeamManager";
import { eventBus } from "./eventBus";
import { chatCommandParser } from "./chatCommandParser";
import { isTimerRunning } from "./timerManager";

let currentMode = localStorage.getItem('cocoloco_game_mode') || 'INDIVIDUAL';
let liveSessionActive = false;
const stableJson = value => { try { return JSON.stringify(value ?? null); } catch { return String(value); } };

class DashboardAPI {
  constructor() {
    this.subscribers = new Set(); this.cachedDashboard = null; this.stableSections = new Map();
    this.pendingMvpSnapshotTimer = null; this.pendingMvpPayload = null; this.lastMvpSnapshotSignature = null; this.lastTimerSnapshotSecond = null;
    this.initReactiveBridge();
    eventBus.subscribe("dashboard:snapshot", (dashboard) => {
      if (!dashboard || typeof dashboard !== "object") return;
      this.cachedDashboard = dashboard;
      if (dashboard.gameMode) currentMode = dashboard.gameMode;
      if (typeof dashboard.liveActive === "boolean") liveSessionActive = dashboard.liveActive;
      this.subscribers.forEach(cb => { try { cb(dashboard); } catch (e) { console.error("[DashboardAPI] remote subscriber", e); } });
    });
  }
  getGameMode() { return currentMode; }
  setGameMode(mode) { currentMode = mode; localStorage.setItem('cocoloco_game_mode', mode); this.invalidateCache(); eventBus.emit('GAME_MODE_CHANGED', { mode }); return { success: true, mode }; }
  isLiveActive() { return liveSessionActive; }
  setLiveSessionStatus(status) { liveSessionActive = status; this.invalidateCache(); eventBus.emit('SESSION_STATUS_CHANGED', { active: status }); }
  subscribeToModeChange(callback) { return eventBus.subscribe('GAME_MODE_CHANGED', callback); }
  invalidateCache() { this.cachedDashboard = null; }
  stableSection(key, value) { const signature = stableJson(value); const previous = this.stableSections.get(key); if (previous && previous.signature === signature) return previous.value; this.stableSections.set(key, { signature, value }); return value; }

  publishSnapshot(payload, eventName = null, isRemote = false) {
    if (isRemote) return;
    this.invalidateCache();
    const data = this.getLiveDashboard();
    const snapshot = eventName === "game:score_updated" ? payload?.playerSnapshot : eventName === "overlay:win" || eventName === "win:correct" ? {
      id: payload?.id || payload?.playerId, playerId: payload?.playerId || payload?.id, tiktokId: payload?.tiktokId || "",
      name: payload?.name || payload?.username || payload?.player?.name || "Jugador", displayName: payload?.displayName || payload?.name || payload?.username || payload?.player?.name || "Jugador",
      username: payload?.username || payload?.name || payload?.player?.username || "Jugador", teamId: payload?.teamId || payload?.player?.teamId || null,
      points: Number(payload?.points ?? payload?.player?.points) || 0, wins: Number(payload?.wins ?? payload?.player?.wins) || 0, wordsFound: Number(payload?.wordsFound ?? payload?.player?.wordsFound) || 0
    } : null;
    if (snapshot && (eventName === "game:score_updated" || eventName === "overlay:win" || eventName === "win:correct")) {
      const snapshotId = snapshot.id || snapshot.playerId || snapshot.tiktokId;
      const currentPlayers = Array.isArray(data?.game?.players) ? [...data.game.players] : [];
      const index = currentPlayers.findIndex(player => {
        const playerId = player?.id || player?.playerId || player?.tiktokId; const pu = String(player?.username || "").trim().toLowerCase(); const su = String(snapshot?.username || "").trim().toLowerCase();
        const pt = String(player?.tiktokId || player?.playerId || ""); const st = String(snapshot?.tiktokId || snapshot?.playerId || "");
        return (snapshotId && playerId && String(snapshotId) === String(playerId)) || (su && pu && su === pu) || (st && pt && st === pt);
      });
      if (index >= 0) currentPlayers[index] = { ...currentPlayers[index], ...snapshot }; else if (snapshotId || snapshot.username) currentPlayers.push({ ...snapshot });
      data.game = { ...data.game, players: currentPlayers };
      if (payload?.teamId || payload?.team?.id || payload?.winningTeamId || payload?.winningTeam?.id) {
        const teamId = String(payload.teamId || payload.team?.id || payload.winningTeamId || payload.winningTeam?.id);
        const teamPayload = payload.teamSnapshot || payload.team || { id: teamId, name: payload.teamName || payload.team?.name || payload.winningTeamName || payload.winningTeam?.name, points: Number(payload.newTeamTotal ?? payload.teamPoints ?? payload.team?.points ?? payload.points ?? 0), wins: Number(payload.wins ?? payload.teamWins ?? payload.team?.wins ?? 0) };
        const currentTeams = Array.isArray(data?.game?.teams) ? [...data.game.teams] : []; const teamIndex = currentTeams.findIndex(team => String(team?.id || team?.teamId) === teamId);
        if (teamIndex >= 0) currentTeams[teamIndex] = { ...currentTeams[teamIndex], ...teamPayload }; else currentTeams.push({ ...teamPayload, id: teamPayload.id || teamId });
        data.game = { ...data.game, teams: currentTeams };
      }
    }
    data.timestamp = Date.now(); const finalSnapshot = { ...data, timestamp: data.timestamp }; eventBus.emit("dashboard:snapshot", finalSnapshot);
    this.subscribers.forEach(cb => { try { cb(finalSnapshot); } catch (e) { console.error("[DashboardAPI] subscriber", e); } });
  }

  scheduleMvpSnapshot(payload) {
    this.pendingMvpPayload = payload || {}; if (this.pendingMvpSnapshotTimer) return;
    this.pendingMvpSnapshotTimer = setTimeout(() => {
      this.pendingMvpSnapshotTimer = null; const pending = this.pendingMvpPayload; this.pendingMvpPayload = null;
      const signature = stableJson({ recipientId: pending?.recipientId || pending?.playerId || pending?.recipient?.id || null, contributionId: pending?.giftEventId || pending?.eventId || pending?.giftId || null, amount: pending?.amount || pending?.points || pending?.value || null, teamId: pending?.teamId || pending?.team?.id || null });
      if (signature === this.lastMvpSnapshotSignature) return; this.lastMvpSnapshotSignature = signature; this.publishSnapshot(pending, "mvp:gift_contribution", false);
    }, 50);
  }

  initReactiveBridge() {
    const reactiveEvents = [
      "player:created","player:updated","PLAYER_CREATED","reward:processed","session:updated","session:started","session:ended","game:winner_detected","game:objective_completed","effect:activated","effect:updated","effect:expired","effect:removed","powerup:activated","powerup:expired","powerup:removed","live:phase_changed","registration:updated","registration:opened","registration:closed","registration:locked","registration:cleared","registration:player_registered","registration:player_removed","registration:state_synced","round:started","ROUND_STARTED","round:finished","round:winner_popup","overlay:round_completed","config:command_updated","SESSION_STATUS_CHANGED","timer:started","timer:paused","timer:resumed","timer:stopped","timer:reset","team:updated","teams:updated","team:created","team:removed"
    ];
    reactiveEvents.forEach(name => eventBus.subscribe(name, (p, isRemote) => this.publishSnapshot(p, name, isRemote)));
    eventBus.subscribe("timer:tick", (p, isRemote) => {
      if (isRemote) return; const second = Number(p?.timer?.remainingSeconds); if (!Number.isFinite(second)) return;
      if (this.lastTimerSnapshotSecond === second) return; this.lastTimerSnapshotSecond = second; this.publishSnapshot(p, "timer:tick", false);
    });
    eventBus.subscribe("game:score_updated", (p, isRemote) => this.publishSnapshot(p, "game:score_updated", isRemote));
    eventBus.subscribe("overlay:win", (p, isRemote) => this.publishSnapshot(p, "overlay:win", isRemote));
    eventBus.subscribe("win:correct", (p, isRemote) => this.publishSnapshot(p, "win:correct", isRemote));
    eventBus.subscribe("mvp:contribution_pending", (p, isRemote) => { if (!isRemote) this.scheduleMvpSnapshot(p); });
    eventBus.subscribe("mvp:gift_contribution", (p, isRemote) => { if (!isRemote) this.scheduleMvpSnapshot(p); });
    eventBus.subscribe("mvp:recipient_selected", (p, isRemote) => { if (!isRemote) this.scheduleMvpSnapshot(p); });
    eventBus.subscribe("GAME_MODE_CHANGED", (p, isRemote) => { if (isRemote) return; const m = p?.mode || p; if (typeof m === "string") { currentMode = m; localStorage.setItem('cocoloco_game_mode', m); } this.publishSnapshot(p, "GAME_MODE_CHANGED", false); });
  }
  subscribe(callback) { if (typeof callback === "function") { this.subscribers.add(callback); callback(this.getLiveDashboard()); return () => this.subscribers.delete(callback); } }
  getCurrentSession() { return sessionManager.getSession(); }

  getLiveDashboard() {
    if (this.cachedDashboard) return this.cachedDashboard;
    let session={}; try{session=sessionManager.getSession()||{};}catch(e){} let stats={}; try{stats=statisticsEngine.getStatistics()||{};}catch(e){} let rankings=[]; try{if(typeof rankingEngine.getTopPlayers==="function") rankings=rankingEngine.getTopPlayers()||[]; else if(typeof rankingEngine.getPlayerRanking==="function"){const pr=rankingEngine.getPlayerRanking();rankings=pr?.topPoints||pr||[];}}catch(e){} if(!Array.isArray(rankings)) rankings=[];
    let rules={};try{rules=gameRulesEngine.getCurrentRules()||{};}catch(e){} let missions=[];try{missions=missionEngine.getActiveMissions()||[];}catch(e){} let battleEffects={};try{battleEffects=battleEffectEngine.getEffectState()||{};}catch(e){} let powerUps={};try{powerUps={};}catch(e){} let historical={};try{historical=historicalLeaderboardEngine.getSessionLeaderboard(session)||{};}catch(e){} let livePhase={};try{livePhase=liveFlowManager.getPhaseState()||{};}catch(e){} let registration={};try{registration=registrationManager.getRegistrationState()||{};}catch(e){} let commandConfig={};try{commandConfig=commandConfigManager.getConfig()||{};}catch(e){} let game={};try{game=getState()||{};}catch(e){}

    // Keep the timer in the dashboard snapshot authoritative. The game engine
    // now supplies running directly from timerManager; retain it explicitly so
    // overlay consumers never lose it when a dashboard snapshot is rebuilt.
    try {
      const dashboardTimer = game?.timer || {};
      game = { ...game, timer: {
        ...dashboardTimer,
        phase: String(dashboardTimer.phase || "IDLE").toUpperCase(),
        running: typeof dashboardTimer.running === "boolean" ? dashboardTimer.running : isTimerRunning()
      }};
    } catch (e) {}

    const configuredTeams = Array.isArray(commandConfig?.teams) ? commandConfig.teams : [];
    const gameTeams = Array.isArray(game?.teams) ? game.teams : [];
    if (configuredTeams.length >= 2) {
      const mergedTeams = configuredTeams.map((configuredTeam, index) => {
        const currentTeam = gameTeams.find(team => String(team?.id) === String(configuredTeam?.id)) || gameTeams[index] || {};
        return {
          ...configuredTeam,
          ...currentTeam,
          id: configuredTeam?.id || currentTeam?.id || `team${index + 1}`,
          name: configuredTeam?.name || currentTeam?.name || `Equipo ${index + 1}`,
          gender: configuredTeam?.gender || currentTeam?.gender,
          mode: configuredTeam?.gender ? "GENDER_TEAMS" : currentTeam?.mode,
          gameMode: configuredTeam?.gender ? "GENDER_TEAMS" : currentTeam?.gameMode
        };
      });
      game = { ...game, teams: mergedTeams };
    }

    const registeredPlayers=Array.isArray(registration?.players)?registration.players:[]; const gamePlayers=Array.isArray(game?.players)?game.players:[];
    const playerIdentity = player => [player?.id, player?.playerId, player?.tiktokId, player?.username, player?.uniqueId]
      .filter(Boolean).map(value => String(value).trim().toLowerCase());
    const registeredOnly = registeredPlayers.map(r => {
      const registrationKeys = playerIdentity(r);
      const gamePlayer = gamePlayers.find(p => {
        const gameKeys = playerIdentity(p);
        return registrationKeys.some(key => gameKeys.includes(key));
      });
      return gamePlayer
        ? { ...gamePlayer, ...r, id: gamePlayer.id || r.playerId || r.id }
        : {
            id:r?.playerId||r?.id||r?.tiktokId||r?.username,
            playerId:r?.playerId||r?.id||r?.tiktokId||r?.username,
            tiktokId:r?.playerId||r?.id||r?.tiktokId||"",
            name:r?.displayName||r?.name||r?.username||"Jugador",
            displayName:r?.displayName||r?.name||r?.username||"Jugador",
            username:r?.username||r?.displayName||r?.name||"Jugador",
            avatar:r?.avatar||"", teamId:r?.teamId||null, teamName:r?.teamName||null,
            points:Number(r?.points)||0, wins:Number(r?.wins)||0, wordsFound:Number(r?.wordsFound)||0, messages:Number(r?.messages)||0
          };
    });
    game={...game,players:registeredOnly};

    this.cachedDashboard={session,stats,statistics:stats,rankings,rules,missions,battleEffects:this.stableSection("battleEffects", battleEffects),powerUps:this.stableSection("powerUps", powerUps),historical,historicalLeaderboard:historical,livePhase,registration,commandConfig,game,recentActivity:[],gameMode:currentMode,liveActive:liveSessionActive,timestamp:Date.now()};
    return this.cachedDashboard;
  }
}
export const dashboardAPI=new DashboardAPI();
