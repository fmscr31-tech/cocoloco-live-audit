import { resetRoundTeamScores, getTeams, addWinToTeam } from "./TeamManager";
import { sessionManager } from "./sessionManager";
import { getPlayers, resetRoundScores } from "./playerManager";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";
import { isGenderTeamsMode } from "./genderTeamsMode";
import { playRoundEndBuzzer } from "./roundEndSound";
import { beginRoundContributionTracking, getRoundContributions, clearRoundContributions } from "./roundContributionManager";
import { recordRoundMvp } from "./mvpLeaderboardManager";
import { resetMvpLeaderboard } from "./mvpLeaderboardManager";
import { startTimer, stopTimer } from "./timerManager";
import { eventBus } from "./eventBus";

const ROUND_STORAGE_KEY = "cocoloco_active_round_v2";
const WINNER_RECOGNITION_MS = 18000;
const GENDER_ROUND_DURATION_MINUTES = 20;
let currentRound = null;
let lastFinishedRoundId = null;
let nextIndividualRegistrationTimer = null;
let nextGenderRoundTimer = null;

function persistRound() {
  try {
    if (currentRound) localStorage.setItem(ROUND_STORAGE_KEY, JSON.stringify(currentRound));
    else localStorage.removeItem(ROUND_STORAGE_KEY);
  } catch (e) {}
}
function restoreRound() {
  try {
    const raw = localStorage.getItem(ROUND_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && saved.status === "active") currentRound = saved;
  } catch (e) {}
}
function clearNextGenderRoundTimer() {
  if (nextGenderRoundTimer) { clearTimeout(nextGenderRoundTimer); nextGenderRoundTimer = null; }
}
restoreRound();

export function startRound(data = {}) {
  if (nextIndividualRegistrationTimer) { clearTimeout(nextIndividualRegistrationTimer); nextIndividualRegistrationTimer = null; }
  clearNextGenderRoundTimer();

  const config = commandConfigManager.getConfig();
  const gameMode = data.gameMode || config.gameRegistrationMode || "TEAM";
  const genderMode = isGenderTeamsMode(gameMode);
  const duration = genderMode ? GENDER_ROUND_DURATION_MINUTES : (data.duration || 20);

  registrationManager.closeRegistration();
  if (genderMode) {
    resetRoundScores();
    resetMvpLeaderboard();
    resetRoundTeamScores(true);
  }

  currentRound = {
    id: data.id || Date.now(),
    name: data.name || "Ronda Principal",
    duration,
    roundNumber: (sessionManager.getSession()?.rounds || []).length + 1,
    entryGift: data.entryGift,
    prize: data.prize,
    gameMode,
    status: "active",
    active: true,
    startTime: new Date()
  };

  lastFinishedRoundId = null;
  persistRound();
  beginRoundContributionTracking(currentRound.id);
  eventBus.publish("round:started", { round: { ...currentRound }, timestamp: Date.now() });

  // Admin is the timer authority. A GENDER_TEAMS round always starts at 20:00.
  startTimer(duration, "ROUND");
  return currentRound;
}

export function endRound() {
  if (!currentRound || currentRound.status === "finished") return currentRound;
  if (lastFinishedRoundId === currentRound.id) return currentRound;

  lastFinishedRoundId = currentRound.id;
  currentRound.status = "finished";
  currentRound.active = false;
  currentRound.endTime = new Date();

  const currentPlayers = getPlayers ? getPlayers() : [];
  const sorted = [...currentPlayers].sort((a, b) => (b.points || 0) - (a.points || 0));
  const topPlayer = sorted[0] || null;
  const totalPts = currentPlayers.reduce((sum, p) => sum + (p.points || 0), 0);
  const config = commandConfigManager.getConfig();
  const genderMode = isGenderTeamsMode(config.gameRegistrationMode);
  const individualMode = String(config.gameRegistrationMode || "").toUpperCase() === "INDIVIDUAL";
  const contributions = getRoundContributions();
  const contributionMvp = contributions.winLimpia || contributions.gift || null;

  stopTimer();
  currentRound.participants = currentPlayers.map(player => ({ ...player }));
  currentRound.winner = topPlayer ? { id: topPlayer.id, name: topPlayer.name, points: topPlayer.points } : null;
  currentRound.mvp = contributionMvp
    ? { id: contributionMvp.playerId, name: contributionMvp.name, teamId: contributionMvp.teamId || null, source: contributions.winLimpia ? "WIN_LIMPIA" : "GIFT", giftName: contributions.gift?.giftName || null, points: 1 }
    : topPlayer
      ? { id: topPlayer.id, name: topPlayer.name, points: topPlayer.points, source: "TOP_SCORE" }
      : null;
  currentRound.contributions = contributions;
  currentRound.mvpContributions = { winLimpia: contributions.winLimpia || null, gift: contributions.gift || null };
  currentRound.totalPoints = totalPts;
  currentRound.totalGifts = currentPlayers.reduce((sum, p) => sum + (p.gifts || 0), 0);

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
    currentRound.roundAward = { teamId: winningTeam.id, teamName: winningTeam.name, score: winningScore, wins: awardedTeam?.wins || 0 };
    eventBus.publish("round:awarded", { roundId: currentRound.id, teamId: winningTeam.id, teamName: winningTeam.name, score: winningScore, wins: awardedTeam?.wins || 0, timestamp: Date.now() });
  } else {
    currentRound.roundAwarded = false;
    currentRound.roundAward = null;
  }

  if (currentRound.mvp) recordRoundMvp(currentRound);
  playRoundEndBuzzer();
  sessionManager.archiveRound(currentRound);

  eventBus.publish("round:winner_popup", {
    roundId: currentRound.id,
    roundNumber: currentRound.roundNumber,
    mode: config.gameRegistrationMode,
    individual: individualMode,
    winner: currentRound.winner,
    winningTeamId: currentRound.winningTeamId || null,
    winningTeamName: currentRound.winningTeamName || null,
    winningTeamScore: currentRound.winningTeamScore || 0,
    mvp: currentRound.mvp || null,
    roundAwarded: currentRound.roundAwarded === true,
    durationMs: WINNER_RECOGNITION_MS,
    timestamp: Date.now()
  });

  resetRoundTeamScores(genderMode);

  if (individualMode) {
    registrationManager.closeRegistration();
    if (nextIndividualRegistrationTimer) clearTimeout(nextIndividualRegistrationTimer);
    nextIndividualRegistrationTimer = setTimeout(() => {
      nextIndividualRegistrationTimer = null;
      const latestConfig = commandConfigManager.getConfig();
      if (String(latestConfig.gameRegistrationMode || "").toUpperCase() !== "INDIVIDUAL") return;
      registrationManager.prepareNextRoundRegistration();
      eventBus.publish("individual:registration_cycle_opened", { method: latestConfig.individualRegistrationMethod, command: latestConfig.individualCommand, giftName: latestConfig.individualRegistrationGift, giftAsset: latestConfig.individualRegistrationGiftAsset, timestamp: Date.now() });
    }, WINNER_RECOGNITION_MS);
  } else if (genderMode) {
    registrationManager.prepareNextRoundRegistration();
    clearNextGenderRoundTimer();
    nextGenderRoundTimer = setTimeout(() => {
      nextGenderRoundTimer = null;
      const latestConfig = commandConfigManager.getConfig();
      if (!isGenderTeamsMode(latestConfig.gameRegistrationMode)) return;
      const session = sessionManager.getSession?.();
      if (!session?.isActive) return;
      startRound({ name: currentRound?.name || "Ronda Principal", duration: GENDER_ROUND_DURATION_MINUTES, gameMode: latestConfig.gameRegistrationMode });
    }, WINNER_RECOGNITION_MS);
  } else {
    registrationManager.prepareNextRoundRegistration();
  }

  eventBus.publish("round:finished", {
    roundId: currentRound.id,
    roundNumber: currentRound.roundNumber,
    roundName: currentRound.name,
    winningTeamId: currentRound.winningTeamId || null,
    winningTeamName: currentRound.winningTeamName || null,
    roundAwarded: currentRound.roundAwarded === true,
    mvp: currentRound.mvp || null,
    mvpContributions: currentRound.mvpContributions,
    nextRoundInMs: genderMode ? WINNER_RECOGNITION_MS : null,
    timestamp: Date.now()
  });

  persistRound();
  clearRoundContributions();
  return currentRound;
}

export function getCurrentRound() { return currentRound; }
export function getWinnerRecognitionDuration() { return WINNER_RECOGNITION_MS; }
