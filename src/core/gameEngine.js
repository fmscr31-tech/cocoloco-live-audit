import { addPlayer, players, addWin, getLeaderboard, assignTeam, removePlayer, getPlayer } from "./playerManager";
import { startRound, endRound, getCurrentRound } from "./roundManager";
import { eventBus } from "./eventBus";
import { startTimer, pauseTimer, resumeTimer, resetTimer, getTime } from "./timerManager";
import { saveData, loadData } from "./storageManager";
import { getBattle, addBattlePlayer, battlePlayerWin, removeBattlePlayer } from "./battleManager";
import { createEvent } from "./eventManager";
import { getTeams, removePlayerFromAllTeams, addPointsToTeam } from "./TeamManager";
import { setPlayers, setRound, setBattle, setTeams, getState as getGlobalState } from "./stateManager";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";
import { isGenderTeamsMode } from "./genderTeamsMode";

const INTERMISSION_SECONDS = 60;
const DEFAULT_TEAM_ROUND_MINUTES = 20;
const PHASE_STORAGE_KEY = "cocoloco_round_phase_v2";

export const gameState = { players, round: getCurrentRound() || null, timer: null, battle: null, teams: [] };
let roundWinners = new Set();
let autoTransitionBusy = false;

function getCurrentMode() { return String(commandConfigManager.getConfig().gameRegistrationMode || "INDIVIDUAL").toUpperCase(); }
function isAutoRoundMode() { const mode = getCurrentMode(); return mode === "TEAM" || mode === "TEAMS" || isGenderTeamsMode(mode); }
function persistPhase(phase) { try { localStorage.setItem(PHASE_STORAGE_KEY, phase); } catch (e) {} }
function getPersistedPhase() { try { return localStorage.getItem(PHASE_STORAGE_KEY) || "ROUND"; } catch (e) { return "ROUND"; } }

function syncPlayersFromRegistration() {
  const regState = registrationManager.getRegistrationState();
  if (regState?.players) {
    regState.players.forEach(p => {
      const added = addPlayer({ name: p.displayName || p.username || p.playerId, displayName: p.displayName || p.username, username: p.username || p.displayName, tiktokId: p.playerId || "", avatar: p.avatar || p.profilePictureUrl || "", teamId: p.teamId || null });
      if (added && p.teamId) assignTeam(added.id, p.teamId);
    });
  }
  setPlayers(gameState.players);
  gameState.teams = getTeams();
  setTeams(gameState.teams);
}

eventBus.subscribe("round:started", () => { roundWinners.clear(); persistPhase("ROUND"); });
eventBus.subscribe("ROUND_STARTED", () => { roundWinners.clear(); persistPhase("ROUND"); });

eventBus.subscribe("registration:cleared", () => {
  const previousPlayers = [...players];
  previousPlayers.forEach(player => { if (player?.id) removePlayer(player.id); });
  gameState.players.length = 0; gameState.teams = getTeams(); setPlayers(gameState.players); setTeams(gameState.teams); saveState(); eventBus.emit("overlay:reset");
});

eventBus.subscribe("game:score_updated", payload => {
  if (!payload?.teamId) return;
  gameState.teams = getTeams(); setTeams(gameState.teams); saveState();
});

function syncFromStorage() {
  const data = loadData();
  if (data) {
    if (data.players && data.players.length > 0 && gameState.players.length === 0) { gameState.players.length = 0; data.players.forEach(player => gameState.players.push(player)); }
    gameState.round = getCurrentRound() || data.round || null; gameState.battle = data.battle || null;
  }
  gameState.teams = getTeams(); setPlayers(gameState.players); setRound(gameState.round); setBattle(gameState.battle); setTeams(gameState.teams);
}

export function createPlayer(name) {
  const player = addPlayer(name); if (getBattle()) addBattlePlayer(player); setPlayers(gameState.players); createEvent("PLAYER_CREATED", { playerId: player.id, name: player.name }); saveState(); return player;
}

export function removeGamePlayer(playerId) {
  const player = removePlayer(playerId); if (!player) return null; removePlayerFromAllTeams(playerId); removeBattlePlayer(playerId); gameState.teams = getTeams(); setPlayers(gameState.players); setTeams(gameState.teams); createEvent("PLAYER_REMOVED", { playerId: player.id, name: player.name }); saveState(); return player;
}

export function playerWin(id) {
  const canonicalPlayer = getPlayer(id); if (!canonicalPlayer) return null;
  const canonicalId = canonicalPlayer.id; if (roundWinners.has(canonicalId)) return canonicalPlayer;
  const player = addWin(canonicalId); if (!player) return null; roundWinners.add(player.id); if (getBattle()) battlePlayerWin(player.id);
  let teamSnapshot = null;
  if (player.teamId) { teamSnapshot = addPointsToTeam(player.teamId, 1); gameState.teams = getTeams(); setTeams(gameState.teams); }
  setPlayers(gameState.players); createEvent("PLAYER_WIN", { playerId: player.id, name: player.name, points: player.points, wins: player.wins });
  const winPayload = { winId: `win_${Date.now()}_${player.id}`, playerId: player.id, tiktokId: player.tiktokId, id: player.id, name: player.name, username: player.username || player.name, teamId: player.teamId || null, points: player.points, wins: player.wins, wordsFound: player.wordsFound, teamPoints: teamSnapshot?.points ?? null, timestamp: Date.now() };
  eventBus.publish("game:score_updated", { playerId: player.id, tiktokId: player.tiktokId, username: player.username || player.name, teamId: player.teamId || null, pointsAdded: 1, newTotal: player.points, wins: player.wins, wordsFound: player.wordsFound, teamPointsAdded: player.teamId ? 1 : 0, newTeamTotal: teamSnapshot?.points ?? null, source: "WIN_LIMPIA", timestamp: Date.now(), playerSnapshot: { ...player }, teamSnapshot: teamSnapshot ? { ...teamSnapshot } : null });
  eventBus.emit("win:correct", winPayload); eventBus.emit("overlay:win", { ...winPayload, source: "WIN_LIMPIA" }); saveState(); return player;
}

export function setPlayerTeam(playerId, teamId) {
  const player = assignTeam(playerId, teamId); if (!player) return null; setPlayers(gameState.players); createEvent("PLAYER_TEAM_ASSIGNED", { playerId: player.id, teamId: player.teamId, name: player.name }); saveState(); return player;
}

export function beginRound(data = {}) {
  registrationManager.closeRegistration();
  syncPlayersFromRegistration();
  setPlayers(gameState.players);
  gameState.teams = getTeams(); setTeams(gameState.teams);
  gameState.round = startRound({ ...data, duration: Number(data.duration) || DEFAULT_TEAM_ROUND_MINUTES, gameMode: data.gameMode || getCurrentMode() });
  gameState.timer = startTimer(gameState.round.duration, "ROUND");
  setRound(gameState.round); createEvent("ROUND_STARTED", { round: gameState.round }); eventBus.publish("ROUND_STARTED", { round: { ...gameState.round }, timestamp: Date.now() }); saveState();
  return gameState;
}

export function finishActiveRound() {
  const finished = endRound();
  if (finished) gameState.round = { ...finished };
  registrationManager.openRegistration();
  gameState.teams = getTeams(); setTeams(gameState.teams); setRound(gameState.round); saveState();
  return finished;
}

function startIntermission() {
  persistPhase("INTERMISSION");
  gameState.timer = startTimer(1, "INTERMISSION");
  eventBus.publish("round:intermission_started", { durationSeconds: INTERMISSION_SECONDS, nextRoundMinutes: DEFAULT_TEAM_ROUND_MINUTES, timestamp: Date.now() });
  saveState();
}

function startNextRoundAutomatically() {
  if (autoTransitionBusy) return;
  autoTransitionBusy = true;
  try {
    const mode = getCurrentMode();
    if (!isAutoRoundMode()) return;
    const registration = registrationManager.getRegistrationState();
    if (!registration?.players?.length) {
      console.warn("[GameEngine] Intermission completed but there are no registered players; keeping registration open.");
      return;
    }
    console.log("[GameEngine] Intermission completed. Starting next 20-minute round automatically.");
    beginRound({ duration: DEFAULT_TEAM_ROUND_MINUTES, gameMode: mode, name: "Nueva Ronda" });
  } finally {
    autoTransitionBusy = false;
  }
}

function handleTimerCompletion(payload = {}) {
  const phase = String(payload.phase || payload.timer?.phase || getPersistedPhase()).toUpperCase();
  if (phase === "INTERMISSION") { startNextRoundAutomatically(); return; }
  const activeRound = gameState.round || getCurrentRound();
  if (!activeRound || activeRound.status === "finished") return;
  gameState.round = activeRound;
  console.log("[GameEngine] Timer completed. Auto-finishing active round at exact 00:00.");
  const finished = finishActiveRound();
  if (finished && isAutoRoundMode()) startIntermission();
}

eventBus.subscribe("ROUND_TIME_EXPIRED", handleTimerCompletion);
eventBus.subscribe("timer:completed", handleTimerCompletion);
eventBus.subscribe("TIMER_COMPLETED", handleTimerCompletion);

export function startGameTimer(minutes = DEFAULT_TEAM_ROUND_MINUTES) { gameState.timer = startTimer(minutes, "ROUND"); return gameState.timer; }
export function pauseGameTimer() { pauseTimer(); }
export function resumeGameTimer() { resumeTimer(); }
export function resetGameTimer(minutes) { resetTimer(minutes, "ROUND"); }

export function getState() {
  const leaderBoard = getLeaderboard();
  const regPlayers = registrationManager.getRegisteredPlayers().map(p => ({ id: p.playerId || p.id, name: p.displayName || p.name || p.username, displayName: p.displayName || p.name || p.username, username: p.username || p.displayName, avatar: p.avatar, teamId: p.teamId, points: p.points || 0, wins: p.wins || 0 }));
  const activePlayers = leaderBoard.length > 0 ? leaderBoard : regPlayers;
  const configTeams = commandConfigManager.getConfig().teams || [];
  const teams = gameState.teams.length > 0 ? gameState.teams : configTeams;
  gameState.round = gameState.round || getCurrentRound();
  return { players: activePlayers, registeredPlayers: regPlayers, round: gameState.round, timer: { ...getTime(), phase: getPersistedPhase() }, battle: getBattle(), teams };
}

export function getGlobalGameState() { return getGlobalState(); }
export function loadGame() { syncFromStorage(); return gameState; }
export function saveState() { saveData({ players: gameState.players, round: gameState.round, battle: gameState.battle, teams: gameState.teams, timer: getTime() }); }
