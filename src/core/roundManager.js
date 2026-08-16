import { eventBus } from "./eventBus";
import { resetRoundTeamScores } from "./TeamManager";
import { sessionManager } from "./sessionManager";
import { getPlayers } from "./playerManager";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";

let currentRound = null;
let lastFinishedRoundId = null;

export function startRound(data = {}){
  const config = commandConfigManager.getConfig();
  const configuredAnswer = config?.winLimpia?.correctAnswer || "";
  const roundAnswer = data.correctAnswer ?? data.answer ?? data.word ?? configuredAnswer;

  currentRound = {
    id: data.id || Date.now(),
    name: data.name || "Ronda Principal",
    duration: data.duration || 20,
    entryGift: data.entryGift,
    prize: data.prize,
    gameMode: data.gameMode || (typeof localStorage !== "undefined" ? localStorage.getItem('cocoloco_game_mode') : null) || "TEAM",
    correctAnswer: String(roundAnswer || "").trim().toLowerCase(),
    status: "active",
    startTime: new Date()
  };

  console.log("[ROUND ANSWER SNAPSHOT]", {
    roundId: currentRound.id,
    correctAnswer: currentRound.correctAnswer,
    source: data.correctAnswer != null || data.answer != null || data.word != null ? "ROUND_START_DATA" : "COMMAND_CONFIG"
  });

  return currentRound;
}

export function endRound(){
  if (!currentRound || currentRound.status === "finished") return currentRound;
  if (lastFinishedRoundId === currentRound.id) return currentRound;

  lastFinishedRoundId = currentRound.id;
  currentRound.status = "finished";
  currentRound.endTime = new Date();

  const currentPlayers = getPlayers ? getPlayers() : [];
  const sorted = [...currentPlayers].sort((a, b) => (b.points || 0) - (a.points || 0));
  const topPlayer = sorted[0] || null;
  const totalPts = currentPlayers.reduce((sum, p) => sum + (p.points || 0), 0);

  currentRound.participants = currentPlayers.map(player => ({ ...player }));
  currentRound.winner = topPlayer ? { id: topPlayer.id, name: topPlayer.name, points: topPlayer.points } : null;
  currentRound.mvp = topPlayer ? { id: topPlayer.id, name: topPlayer.name, points: topPlayer.points } : null;
  currentRound.totalPoints = totalPts;
  currentRound.totalGifts = currentPlayers.reduce((sum, p) => sum + (p.gifts || 0), 0);

  sessionManager.archiveRound(currentRound);

  resetRoundTeamScores();

  registrationManager.prepareNextRoundRegistration();

  eventBus.publish("round:finished", {
    roundId: currentRound.id,
    roundName: currentRound.name,
    timestamp: Date.now()
  });

  return currentRound;
}

export function getCurrentRound(){
  return currentRound;
}
