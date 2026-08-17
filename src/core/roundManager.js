import { eventBus } from "./eventBus";
import { resetRoundTeamScores, getTeams, addWinToTeam } from "./TeamManager";
import { sessionManager } from "./sessionManager";
import { getPlayers } from "./playerManager";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";
import { isGenderTeamsMode } from "./genderTeamsMode";

let currentRound = null;
let lastFinishedRoundId = null;

export function startRound(data = {}) {
  currentRound = {
    id: data.id || Date.now(),
    name: data.name || "Ronda Principal",
    duration: data.duration || 20,
    entryGift: data.entryGift,
    prize: data.prize,
    gameMode:
      data.gameMode ||
      (typeof localStorage !== "undefined"
        ? localStorage.getItem("cocoloco_game_mode")
        : null) ||
      "TEAM",
    status: "active",
    startTime: new Date()
  };

  console.log("[ROUND STARTED]", {
    roundId: currentRound.id,
    name: currentRound.name,
    duration: currentRound.duration,
    gameMode: currentRound.gameMode,
    winLimpiaAuthority: "EXTERNAL_CONTEXT_INTERACTIVE"
  });

  return currentRound;
}

export function endRound() {
  if (!currentRound || currentRound.status === "finished") return currentRound;
  if (lastFinishedRoundId === currentRound.id) return currentRound;

  lastFinishedRoundId = currentRound.id;
  currentRound.status = "finished";
  currentRound.endTime = new Date();

  const currentPlayers = getPlayers ? getPlayers() : [];
  const sorted = [...currentPlayers].sort((a, b) => (b.points || 0) - (a.points || 0));
  const topPlayer = sorted[0] || null;
  const totalPts = currentPlayers.reduce((sum, p) => sum + (p.points || 0), 0);
  const config = commandConfigManager.getConfig();
  const genderMode = isGenderTeamsMode(config.gameRegistrationMode);

  currentRound.participants = currentPlayers.map(player => ({ ...player }));
  currentRound.winner = topPlayer
    ? { id: topPlayer.id, name: topPlayer.name, points: topPlayer.points }
    : null;
  currentRound.mvp = topPlayer
    ? { id: topPlayer.id, name: topPlayer.name, points: topPlayer.points }
    : null;
  currentRound.totalPoints = totalPts;
  currentRound.totalGifts = currentPlayers.reduce((sum, p) => sum + (p.gifts || 0), 0);

  // Automatically award the round to the team with the highest round score.
  // This is the counter displayed as RONDA on each TeamPanel.
  const teamsBeforeReset = getTeams();
  const rankedTeams = [...teamsBeforeReset].sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0));
  const winningTeam = rankedTeams[0] || null;
  const runnerUpTeam = rankedTeams[1] || null;
  const winningScore = Number(winningTeam?.points) || 0;
  const runnerUpScore = Number(runnerUpTeam?.points) || 0;

  if (winningTeam && winningScore > runnerUpScore) {
    const awardedTeam = addWinToTeam(winningTeam.id);
    currentRound.winningTeamId = winningTeam.id;
    currentRound.winningTeamName = winningTeam.name;
    currentRound.winningTeamScore = winningScore;
    currentRound.roundAwarded = true;
    currentRound.roundAward = {
      teamId: winningTeam.id,
      teamName: winningTeam.name,
      score: winningScore,
      wins: awardedTeam?.wins || 0
    };
    eventBus.publish("round:awarded", {
      roundId: currentRound.id,
      teamId: winningTeam.id,
      teamName: winningTeam.name,
      score: winningScore,
      wins: awardedTeam?.wins || 0,
      timestamp: Date.now()
    });
    console.log("[ROUND AWARDED AUTOMATICALLY]", currentRound.roundAward);
  } else {
    currentRound.roundAwarded = false;
    currentRound.roundAward = null;
    console.log("[ROUND NOT AWARDED] Tie or no team score", { winningScore, runnerUpScore });
  }

  sessionManager.archiveRound(currentRound);
  resetRoundTeamScores(genderMode);
  registrationManager.prepareNextRoundRegistration();

  eventBus.publish("round:finished", {
    roundId: currentRound.id,
    roundName: currentRound.name,
    winningTeamId: currentRound.winningTeamId || null,
    winningTeamName: currentRound.winningTeamName || null,
    roundAwarded: currentRound.roundAwarded === true,
    timestamp: Date.now()
  });

  return currentRound;
}

export function getCurrentRound() {
  return currentRound;
}
