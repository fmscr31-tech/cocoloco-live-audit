import { addPlayer, players, addWin, getLeaderboard, assignTeam, removePlayer, getPlayer } from "./playerManager";
import { startRound, endRound, getCurrentRound } from "./roundManager";
import { eventBus } from "./eventBus";
import { startTimer, pauseTimer, resumeTimer, resetTimer, getTime } from "./timerManager";
import { saveData, loadData } from "./storageManager";
import { getBattle, addBattlePlayer, battlePlayerWin, removeBattlePlayer } from "./battlemanager";
import { createEvent } from "./eventManager";
import { getTeams, removePlayerFromAllTeams, addPointsToTeam } from "./TeamManager";
import { setPlayers, setRound, setBattle, setTeams, getState as getGlobalState } from "./stateManager";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";
import { isGenderTeamsMode } from "./genderTeamsMode";

const DEFAULT_TEAM_ROUND_MINUTES = 20;
const PHASE_STORAGE_KEY = "cocoloco_round_phase_v2";
export const gameState = { players, round: getCurrentRound() || null, timer: null, battle: null, teams: [] };
let roundWinners = new Set();
let winSignalBusy = false;

function getCurrentMode() { return String(commandConfigManager.getConfig().gameRegistrationMode || "INDIVIDUAL").toUpperCase(); }
function persistPhase(phase) { try { localStorage.setItem(PHASE_STORAGE_KEY, phase); } catch (e) {} }
function getPersistedPhase() { try { return localStorage.getItem(PHASE_STORAGE_KEY) || "IDLE"; } catch (e) { return "IDLE"; } }

function syncPlayersFromRegistration() {
  const regState = registrationManager.getRegistrationState();
  if (regState?.players) regState.players.forEach(p => {
    const added = addPlayer({ name:p.displayName||p.username||p.playerId,displayName:p.displayName||p.username,username:p.username||p.displayName,tiktokId:p.playerId||"",avatar:p.avatar||p.profilePictureUrl||"",teamId:p.teamId||null });
    if (added&&p.teamId) assignTeam(added.id,p.teamId);
  });
  setPlayers(gameState.players); gameState.teams=getTeams(); setTeams(gameState.teams);
}

function resolveWinPlayer(payload = {}) {
  const candidates = [payload.playerId, payload.userId, payload.tiktokId, payload.id, payload.username, payload.uniqueId, payload.displayName, payload.nickname].filter(Boolean).map(String);
  for (const candidate of candidates) { const player = getPlayer(candidate); if (player) return player; }
  const normalizedNames = candidates.map(value => value.trim().toLowerCase());
  return players.find(player => normalizedNames.includes(String(player.name || "").trim().toLowerCase()) || normalizedNames.includes(String(player.displayName || "").trim().toLowerCase()) || normalizedNames.includes(String(player.username || "").trim().toLowerCase())) || null;
}

function handleDetectedWin(payload = {}) {
  if (winSignalBusy || payload?.winLimpia === false) return null;
  const player = resolveWinPlayer(payload);
  if (!player) { console.warn("[WIN LIMPIA] External win received but player identity could not be resolved:", payload); eventBus.publish("win:rejected", { ...payload, reason: "PLAYER_NOT_FOUND", timestamp: Date.now() }); return null; }
  if (roundWinners.has(player.id)) return player;
  winSignalBusy = true;
  try { const result = playerWin(player.id); if (result) console.log("[WIN LIMPIA APPLIED]", { playerId: result.id, username: result.username, wins: result.wins, points: result.points }); return result; }
  finally { winSignalBusy = false; }
}

eventBus.subscribe("win:detected", handleDetectedWin);
eventBus.subscribe("round:started",()=>{roundWinners.clear();persistPhase("ROUND");});
eventBus.subscribe("ROUND_STARTED",()=>{roundWinners.clear();persistPhase("ROUND");});
eventBus.subscribe("registration:cleared",()=>{const previousPlayers=[...players];previousPlayers.forEach(player=>{if(player?.id)removePlayer(player.id);});gameState.players.length=0;gameState.teams=getTeams();setPlayers(gameState.players);setTeams(gameState.teams);saveState();eventBus.emit("overlay:reset");});
eventBus.subscribe("game:score_updated",payload=>{if(!payload?.teamId)return;gameState.teams=getTeams();setTeams(gameState.teams);saveState();});

function syncFromStorage(){
  const data=loadData();
  if(data){
    if(data.players&&data.players.length>0&&gameState.players.length===0){gameState.players.length=0;data.players.forEach(player=>gameState.players.push(player));}
    gameState.round=getCurrentRound()||data.round||null;
    gameState.battle=data.battle||null;
  }
  gameState.teams=getTeams(); setPlayers(gameState.players); setRound(gameState.round); setBattle(gameState.battle); setTeams(gameState.teams);
}

export function createPlayer(name){const player=addPlayer(name);if(getBattle())addBattlePlayer(player);setPlayers(gameState.players);createEvent("PLAYER_CREATED",{playerId:player.id,name:player.name});saveState();return player;}
export function removeGamePlayer(playerId){const player=removePlayer(playerId);if(!player)return null;removePlayerFromAllTeams(playerId);removeBattlePlayer(playerId);gameState.teams=getTeams();setPlayers(gameState.players);setTeams(gameState.teams);createEvent("PLAYER_REMOVED",{playerId:player.id,name:player.name});saveState();return player;}

export function playerWin(id, options = {}){
  const canonicalPlayer=getPlayer(id); if(!canonicalPlayer)return null;
  const canonicalId=canonicalPlayer.id;
  const allowRepeat=options.allowRepeat === true;
  const manualAttribution=options.source === "MANUAL_WIN_LIMPIA";
  const emitMvpEvent=options.emitMvpEvent !== false;
  if(!allowRepeat && roundWinners.has(canonicalId))return canonicalPlayer;

  const player=addWin(canonicalId,{emitScoreEvent:false}); if(!player)return null;
  if(!allowRepeat) roundWinners.add(player.id);
  if(getBattle())battlePlayerWin(player.id);
  let teamSnapshot=null;
  if(player.teamId){teamSnapshot=addPointsToTeam(player.teamId,1);gameState.teams=getTeams();setTeams(gameState.teams);}
  setPlayers(gameState.players);
  createEvent("PLAYER_WIN",{playerId:player.id,name:player.name,points:player.points,wins:player.wins});
  const winPayload={winId:`win_${Date.now()}_${player.id}_${Math.random().toString(36).slice(2,7)}`,playerId:player.id,tiktokId:player.tiktokId,id:player.id,name:player.name,username:player.username||player.name,teamId:player.teamId||null,points:player.points,wins:player.wins,wordsFound:player.wordsFound,teamPoints:teamSnapshot?.points??null,timestamp:Date.now(),source:manualAttribution?"MANUAL_WIN_LIMPIA":"WIN_LIMPIA",mvpAlreadyRecorded:manualAttribution && !emitMvpEvent};
  eventBus.publish("game:score_updated",{playerId:player.id,tiktokId:player.tiktokId,username:player.username||player.name,teamId:player.teamId||null,pointsAdded:1,newTotal:player.points,wins:player.wins,wordsFound:player.wordsFound,teamPointsAdded:player.teamId?1:0,newTeamTotal:teamSnapshot?.points??null,source:manualAttribution?"MANUAL_WIN_LIMPIA":"WIN_LIMPIA",timestamp:Date.now(),playerSnapshot:{...player},teamSnapshot:teamSnapshot?{...teamSnapshot}:null});
  if(emitMvpEvent) eventBus.emit("win:correct",winPayload);
  eventBus.emit("overlay:win",{...winPayload,source:manualAttribution?"MANUAL_WIN_LIMPIA":"WIN_LIMPIA"});
  saveState();
  return player;
}

export function setPlayerTeam(playerId,teamId){const player=assignTeam(playerId,teamId);if(!player)return null;setPlayers(gameState.players);createEvent("PLAYER_TEAM_ASSIGNED",{playerId:player.id,teamId:player.teamId,name:player.name});saveState();return player;}

export function beginRound(data={}){
  const mode=String(data.gameMode||getCurrentMode()).toUpperCase();
  const persistentGender=isGenderTeamsMode(mode);
  if(!persistentGender) registrationManager.closeRegistration(); else registrationManager.openRegistration();
  syncPlayersFromRegistration(); setPlayers(gameState.players); gameState.teams=getTeams(); setTeams(gameState.teams);
  gameState.round=startRound({...data,duration:Number(data.duration)||DEFAULT_TEAM_ROUND_MINUTES,gameMode:mode});
  gameState.timer=startTimer(gameState.round.duration,"ROUND");
  setRound(gameState.round); createEvent("ROUND_STARTED",{round:gameState.round}); eventBus.publish("ROUND_STARTED",{round:{...gameState.round},timestamp:Date.now()}); saveState(); return gameState;
}

export function finishActiveRound(){
  const finished=endRound();
  if(finished)gameState.round={...finished};
  registrationManager.openRegistration();
  gameState.teams=getTeams(); setTeams(gameState.teams); setRound(gameState.round); saveState(); return finished;
}

function handleTimerCompletion(payload={}){
  const phase=String(payload.phase||payload.timer?.completedPhase||payload.timer?.phase||getPersistedPhase()).toUpperCase();
  if(phase!=="ROUND") return;
  const activeRound=gameState.round||getCurrentRound();
  if(!activeRound||activeRound.status==="finished") return;
  gameState.round=activeRound;
  const finished=finishActiveRound();
  if(!finished) return;
  persistPhase("IDLE");
  resetTimer(0,"IDLE");
  gameState.timer={remainingSeconds:0,running:false,minutes:0,seconds:0,phase:"IDLE"};
  eventBus.publish("overlay:round_completed",{roundId:finished.id,round:{...finished},phase:"IDLE",timestamp:Date.now()});
  if(finished.winner) eventBus.publish("round:winner_popup",{mode:getCurrentMode(),winner:finished.winner,winningTeamId:finished.winningTeamId||null,winningTeamName:finished.winningTeamName||null,roundId:finished.id,timestamp:Date.now()});
  saveState();
}

eventBus.subscribe("timer:completed",handleTimerCompletion);

/* Manual timer authority: changing the timer must work in every mode and does not require a round object. */
export function startGameTimer(minutes=DEFAULT_TEAM_ROUND_MINUTES){
  const requestedMinutes=Math.max(0,Number(minutes)||0);
  gameState.timer=startTimer(requestedMinutes,"ROUND");
  return gameState.timer;
}

export function pauseGameTimer(){pauseTimer();}
export function resumeGameTimer(){resumeTimer();}
export function resetGameTimer(minutes){resetTimer(minutes,"ROUND");}

export function getState(){
  const leaderBoard=getLeaderboard();
  const regPlayers=registrationManager.getRegisteredPlayers().map(p=>({id:p.playerId||p.id,name:p.displayName||p.name||p.username,displayName:p.displayName||p.name||p.username,username:p.username||p.displayName,avatar:p.avatar,teamId:p.teamId,points:p.points||0,wins:p.wins||0}));
  const activePlayers=leaderBoard.length>0?leaderBoard:regPlayers;
  const configTeams=commandConfigManager.getConfig().teams||[];
  const teams=gameState.teams.length>0?gameState.teams:configTeams;
  gameState.round=gameState.round||getCurrentRound();
  return{players:activePlayers,registeredPlayers:regPlayers,round:gameState.round,timer:{...getTime(),phase:getPersistedPhase()},battle:getBattle(),teams};
}

export function getGlobalGameState(){return getGlobalState();}
export function loadGame(){syncFromStorage();return gameState;}
export function saveState(){saveData({players:gameState.players,round:gameState.round,battle:gameState.battle,teams:gameState.teams,timer:getTime()});}
