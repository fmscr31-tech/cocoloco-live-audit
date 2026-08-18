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

  initReactiveBridge() {
    const notifySubscribers = (payload, eventName = null, isRemote = false) => {
      if (isRemote) return;
      this.invalidateCache();
      const data = this.getLiveDashboard();
      const snapshot = eventName === "game:score_updated" ? payload?.playerSnapshot : eventName === "overlay:win" ? {
        id: payload?.id || payload?.playerId, playerId: payload?.playerId || payload?.id, tiktokId: payload?.tiktokId || "",
        name: payload?.name || payload?.username || "Jugador", displayName: payload?.name || payload?.username || "Jugador",
        username: payload?.username || payload?.name || "Jugador", teamId: payload?.teamId || null,
        points: Number(payload?.points) || 0, wins: Number(payload?.wins) || 0, wordsFound: Number(payload?.wordsFound) || 0
      } : null;
      if (snapshot && (eventName === "game:score_updated" || eventName === "overlay:win")) {
        const snapshotId = snapshot.id || snapshot.playerId || snapshot.tiktokId;
        const currentPlayers = Array.isArray(data?.game?.players) ? [...data.game.players] : [];
        const index = currentPlayers.findIndex(player => {
          const playerId = player?.id || player?.playerId || player?.tiktokId;
          const pu = String(player?.username || "").trim().toLowerCase(); const su = String(snapshot?.username || "").trim().toLowerCase();
          const pt = String(player?.tiktokId || player?.playerId || ""); const st = String(snapshot?.tiktokId || snapshot?.playerId || "");
          return (snapshotId && playerId && String(snapshotId) === String(playerId)) || (su && pu && su === pu) || (st && pt && st === pt);
        });
        if (index >= 0) currentPlayers[index] = { ...currentPlayers[index], ...snapshot }; else if (snapshotId || snapshot.username) currentPlayers.push({ ...snapshot });
        data.game = { ...data.game, players: currentPlayers };
        if (payload?.teamSnapshot) {
          const ts = payload.teamSnapshot; const tid = ts.id || ts.teamId; const teams = Array.isArray(data?.game?.teams) ? [...data.game.teams] : [];
          const ti = teams.findIndex(t => String(t?.id || t?.teamId) === String(tid));
          if (ti >= 0) teams[ti] = { ...teams[ti], ...ts }; else teams.push({ ...ts });
          data.game = { ...data.game, teams };
        }
      }
      data.timestamp = Date.now();
      eventBus.emit("dashboard:snapshot", { ...data, timestamp: Date.now() });
      this.subscribers.forEach(cb => { try { cb(data); } catch (e) { console.error("[DashboardAPI] subscriber", e); } });
    };

    ["player:created","player:updated","PLAYER_CREATED","reward:processed","session:updated","session:started","session:ended","game:winner_detected","game:objective_completed","effect:activated","effect:updated","effect:expired","effect:removed","powerup:activated","powerup:expired","powerup:removed","live:phase_changed","registration:updated","registration:opened","registration:closed","registration:locked","registration:cleared","registration:player_registered","registration:player_removed","registration:state_synced","round:started","ROUND_STARTED","round:finished","config:command_updated","SESSION_STATUS_CHANGED","timer:started","timer:tick","timer:paused","timer:resumed","timer:stopped","timer:reset","team:updated","teams:updated","team:created","team:removed","mvp:contribution_pending","mvp:gift_contribution","mvp:recipient_selected"].forEach(name => eventBus.subscribe(name, (p, isRemote) => notifySubscribers(p, name, isRemote)));
    eventBus.subscribe("game:score_updated", (p, isRemote) => notifySubscribers(p, "game:score_updated", isRemote));
    eventBus.subscribe("overlay:win", (p, isRemote) => notifySubscribers(p, "overlay:win", isRemote));
    eventBus.subscribe("GAME_MODE_CHANGED", (p, isRemote) => { if (isRemote) return; const m = p?.mode || p; if (typeof m === "string") { currentMode = m; localStorage.setItem('cocoloco_game_mode', m); } notifySubscribers(p, "GAME_MODE_CHANGED", false); });
  }

  subscribe(callback) { if (typeof callback === "function") { this.subscribers.add(callback); callback(this.getLiveDashboard()); return () => this.subscribers.delete(callback); } }
  getCurrentSession() { return sessionManager.getSession(); }
  getLiveDashboard() {
    if (this.cachedDashboard) return this.cachedDashboard;
    let session={}; try{session=sessionManager.getSession()||{};}catch(e){} let stats={}; try{stats=statisticsEngine.getStatistics()||{};}catch(e){} let rankings=[]; try{if(typeof rankingEngine.getTopPlayers==="function") rankings=rankingEngine.getTopPlayers()||[]; else if(typeof rankingEngine.getPlayerRanking==="function"){const pr=rankingEngine.getPlayerRanking();rankings=pr?.topPoints||pr||[];}}catch(e){} if(!Array.isArray(rankings)) rankings=[];
    let rules={};try{rules=gameRulesEngine.getCurrentRules()||{};}catch(e){} let missions=[];try{missions=missionEngine.getActiveMissions()||[];}catch(e){} let battleEffects={};try{battleEffects=battleEffectEngine.getEffectState()||{};}catch(e){} let powerUps={};try{powerUps=powerUpEngine.getPowerUpState()||{};}catch(e){} let historical={};try{historical=historicalLeaderboardEngine.getSessionLeaderboard(session)||{};}catch(e){} let livePhase={};try{livePhase=liveFlowManager.getPhaseState()||{};}catch(e){} let registration={};try{registration=registrationManager.getRegistrationState()||{};}catch(e){} let commandConfig={};try{commandConfig=commandConfigManager.getConfig()||{};}catch(e){} let game={};try{game=getState()||{};}catch(e){}
    const registeredPlayers=Array.isArray(registration?.players)?registration.players:[]; const gamePlayers=Array.isArray(game?.players)?game.players:[];
    if(registeredPlayers.length>0){const merged=gamePlayers.map(p=>({...p})); registeredPlayers.forEach(r=>{const rid=r?.playerId||r?.id||r?.tiktokId||r?.username; const ru=String(r?.username||"").trim().toLowerCase(); const rn=String(r?.displayName||r?.name||"").trim().toLowerCase(); const i=merged.findIndex(p=>{const pid=p?.id||p?.playerId||p?.tiktokId;const pu=String(p?.username||"").trim().toLowerCase();const pn=String(p?.displayName||p?.name||"").trim().toLowerCase();return(rid&&pid&&String(pid)===String(rid))||(ru&&pu&&ru===pu)||(rn&&pn&&rn===pn);}); if(i>=0) merged[i]={...merged[i],teamId:r.teamId||merged[i].teamId||null,teamName:r.teamName||merged[i].teamName||null,displayName:r.displayName||merged[i].displayName,username:r.username||merged[i].username,avatar:r.avatar||merged[i].avatar||""}; else merged.push({id:rid,playerId:r.playerId||r.id||rid,tiktokId:r.playerId||r.id||r.tiktokId||"",name:r.displayName||r.name||r.username||rid,displayName:r.displayName||r.name||r.username||rid,username:r.username||r.displayName||rid,avatar:r.avatar||"",teamId:r.teamId||null,teamName:r.teamName||null,points:Number(r.points)||0,wins:Number(r.wins)||0,wordsFound:Number(r.wordsFound)||0,messages:Number(r.messages)||0});}); game={...game,players:merged};}
    this.cachedDashboard={session,stats,statistics:stats,rankings,rules,missions,battleEffects,powerUps,historical,historicalLeaderboard:historical,livePhase,registration,commandConfig,game,recentActivity:[],gameMode:currentMode,liveActive:liveSessionActive,timestamp:Date.now()}; return this.cachedDashboard;
  }
}
export const dashboardAPI=new DashboardAPI();
