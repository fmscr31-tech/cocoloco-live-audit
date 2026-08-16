import {
  addPlayer,
  players,
  addWin,
  getLeaderboard,
  assignTeam,
  removePlayer,
  getPlayer
} from "./playerManager";

import { startRound, endRound } from "./roundManager";
import { eventBus } from "./eventBus";

let roundWinners = new Set();
eventBus.subscribe("round:started", () => { roundWinners.clear(); });
eventBus.subscribe("ROUND_STARTED", () => { roundWinners.clear(); });

eventBus.subscribe("registration:cleared", () => {
  const previousPlayers = [...players];
  previousPlayers.forEach(player => {
    if (player?.id) removePlayer(player.id);
  });
  gameState.players.length = 0;
  gameState.teams = getTeams();
  setPlayers(gameState.players);
  setTeams(gameState.teams);
  saveState();
  eventBus.emit("overlay:reset");
});

import {
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  getTime
} from "./timerManager";

import { saveData, loadData } from "./storageManager";

import {
  getBattle,
  addBattlePlayer,
  battlePlayerWin,
  removeBattlePlayer
} from "./battleManager";

import { createEvent } from "./eventManager";
import { getTeams, removePlayerFromAllTeams, addPointsToTeam } from "./TeamManager";
import {
  setPlayers,
  setRound,
  setBattle,
  setTeams,
  getState as getGlobalState
} from "./stateManager";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";

export const gameState = {
  players,
  round: null,
  timer: null,
  battle: null,
  teams: []
};

eventBus.subscribe("game:score_updated", payload => {
  if (!payload?.teamId) return;
  gameState.teams = getTeams();
  setTeams(gameState.teams);
  saveState();
});

function syncFromStorage() {
  const data = loadData();
  if (data) {
    if (data.players && data.players.length > 0 && gameState.players.length === 0) {
      gameState.players.length = 0;
      data.players.forEach(player => gameState.players.push(player));
    }
    gameState.round = data.round || null;
    gameState.battle = data.battle || null;
  }
  gameState.teams = getTeams();
  setPlayers(gameState.players);
  setRound(gameState.round);
  setBattle(gameState.battle);
  setTeams(gameState.teams);
}

export function createPlayer(name) {
  const player = addPlayer(name);
  if (getBattle()) addBattlePlayer(player);
  setPlayers(gameState.players);
  createEvent("PLAYER_CREATED", { playerId: player.id, name: player.name });
  saveState();
  return player;
}

export function removeGamePlayer(playerId) {
  const player = removePlayer(playerId);
  if (!player) return null;
  removePlayerFromAllTeams(playerId);
  removeBattlePlayer(playerId);
  gameState.teams = getTeams();
  setPlayers(gameState.players);
  setTeams(gameState.teams);
  createEvent("PLAYER_REMOVED", { playerId: player.id, name: player.name });
  saveState();
  return player;
}

export function playerWin(id) {
  const canonicalPlayer = getPlayer(id);
  if (!canonicalPlayer) {
    console.error("[WIN LIMPIA FATAL] Cannot resolve player before scoring", { id });
    return null;
  }

  const canonicalId = canonicalPlayer.id;
  if (roundWinners.has(canonicalId)) {
    console.log("[GameEngine] Player already won this round, ignoring duplicate win:", canonicalId);
    return canonicalPlayer;
  }

  const player = addWin(canonicalId);
  if (!player) {
    console.error("[WIN LIMPIA FATAL] addWin failed after identity resolution", {
      id,
      canonicalId,
      canonicalPlayer
    });
    return null;
  }

  roundWinners.add(player.id);
  if (getBattle()) battlePlayerWin(player.id);

  // WIN LIMPIA must also increment the persisted team scoreboard when the
  // winner belongs to a team. TeamPanel reads team.points, not player.points.
  let teamSnapshot = null;
  if (player.teamId) {
    teamSnapshot = addPointsToTeam(player.teamId, 1);
    gameState.teams = getTeams();
    setTeams(gameState.teams);
  }

  setPlayers(gameState.players);
  createEvent("PLAYER_WIN", {
    playerId: player.id,
    name: player.name,
    points: player.points,
    wins: player.wins
  });

  eventBus.publish("game:score_updated", {
    playerId: player.id,
    tiktokId: player.tiktokId,
    username: player.username || player.name,
    teamId: player.teamId || null,
    pointsAdded: 1,
    newTotal: player.points,
    wins: player.wins,
    wordsFound: player.wordsFound,
    teamPointsAdded: player.teamId ? 1 : 0,
    newTeamTotal: teamSnapshot?.points ?? null,
    source: "WIN_LIMPIA",
    timestamp: Date.now(),
    playerSnapshot: { ...player },
    teamSnapshot: teamSnapshot ? { ...teamSnapshot } : null
  });

  const winPayload = {
    winId: `win_${Date.now()}_${player.id}`,
    playerId: player.id,
    tiktokId: player.tiktokId,
    id: player.id,
    name: player.name,
    username: player.username || player.name,
    teamId: player.teamId || null,
    points: player.points,
    wins: player.wins,
    wordsFound: player.wordsFound,
    teamPoints: teamSnapshot?.points ?? null,
    timestamp: Date.now()
  };

  eventBus.emit("win:correct", winPayload);
  eventBus.emit("overlay:win", { ...winPayload, source: "WIN_LIMPIA" });

  console.log("[WIN LIMPIA POINT APPLIED]", {
    inputId: id,
    canonicalId: player.id,
    tiktokId: player.tiktokId,
    player: player.name,
    teamId: player.teamId || null,
    points: player.points,
    wins: player.wins,
    teamPoints: teamSnapshot?.points ?? null,
    wordsFound: player.wordsFound,
    pointsAdded: 1,
    teamPointsAdded: player.teamId ? 1 : 0
  });

  saveState();
  return player;
}

export function setPlayerTeam(playerId, teamId) {
  const player = assignTeam(playerId, teamId);
  if (!player) return null;
  setPlayers(gameState.players);
  createEvent("PLAYER_TEAM_ASSIGNED", {
    playerId: player.id,
    teamId: player.teamId,
    name: player.name
  });
  saveState();
  return player;
}

export function beginRound(data) {
  registrationManager.closeRegistration();
  const regState = registrationManager.getRegistrationState();
  if (regState && regState.players) {
    regState.players.forEach(p => {
      const added = addPlayer({
        name: p.displayName || p.username || p.playerId,
        displayName: p.displayName || p.username,
        username: p.username || p.displayName,
        tiktokId: p.playerId || "",
        avatar: p.avatar || p.profilePictureUrl || "",
        teamId: p.teamId || null
      });
      if (added && p.teamId) assignTeam(added.id, p.teamId);
    });
  }
  setPlayers(gameState.players);
  gameState.teams = getTeams();
  setTeams(gameState.teams);
  gameState.round = startRound(data);
  gameState.timer = startTimer(data.duration);
  setRound(gameState.round);
  createEvent("ROUND_STARTED", { round: gameState.round });
  saveState();
  return gameState;
}

export function finishActiveRound() {
  const finished = endRound();
  if (gameState.round && finished) gameState.round = { ...finished };
  registrationManager.openRegistration();
  saveState();
  return finished;
}

eventBus.subscribe("ROUND_TIME_EXPIRED", () => {
  console.log("[GameEngine] Round time expired event received. Auto-finishing round.");
  finishActiveRound();
});

export function startGameTimer(minutes = 20) {
  gameState.timer = startTimer(minutes);
  return gameState.timer;
}

export function pauseGameTimer() { pauseTimer(); }
export function resumeGameTimer() { resumeTimer(); }
export function resetGameTimer(minutes) { resetTimer(minutes); }

export function getState() {
  const leaderBoard = getLeaderboard();
  const regPlayers = registrationManager.getRegisteredPlayers().map(p => ({
    id: p.playerId || p.id,
    name: p.displayName || p.name || p.username,
    displayName: p.displayName || p.name || p.username,
    username: p.username || p.displayName,
    avatar: p.avatar,
    teamId: p.teamId,
    points: p.points || 0,
    wins: p.wins || 0
  }));

  const activePlayers = leaderBoard.length > 0 ? leaderBoard : regPlayers;
  const configTeams = commandConfigManager.getConfig().teams || [];
  const teams = gameState.teams.length > 0 ? gameState.teams : configTeams;

  return {
    players: activePlayers,
    registeredPlayers: regPlayers,
    round: gameState.round,
    timer: getTime(),
    battle: getBattle(),
    teams
  };
}

export function getGlobalGameState() {
  return getGlobalState();
}

export function loadGame() {
  syncFromStorage();
  return gameState;
}

export function saveState() {
  saveData({
    players: gameState.players,
    round: gameState.round,
    battle: gameState.battle,
    teams: gameState.teams,
    timer: getTime()
  });
}
