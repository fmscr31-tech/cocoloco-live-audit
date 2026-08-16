import { eventBus } from "./eventBus";
import { resetRoundTeamScores } from "./TeamManager";
import { sessionManager } from "./sessionManager";
import { getPlayers } from "./playerManager";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";

let currentRound = null;
let lastFinishedRoundId = null;

function normalizeAnswer(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// CRITICAL WIN LIMPIA RULE:
// Once a round is active, its answer belongs to THAT ROUND.
// The persisted command configuration may contain the next/default answer or
// a stale value from another tab. It must NEVER overwrite the active round.
// The round-start payload is the authoritative source for the current word.
eventBus.subscribe("config:command_updated", ({ config } = {}) => {
  if (!currentRound || currentRound.status !== "active") return;

  console.log("[ROUND ANSWER CONFIG UPDATE IGNORED FOR ACTIVE ROUND]", {
    roundId: currentRound.id,
    activeRoundAnswer: normalizeAnswer(currentRound.correctAnswer || "") || null,
    configuredAnswer: normalizeAnswer(config?.winLimpia?.correctAnswer || "") || null,
    source: "ACTIVE_ROUND_IS_AUTHORITATIVE"
  });
});

export function startRound(data = {}) {
  const config = commandConfigManager.refreshFromStorage();
  const configuredAnswer = normalizeAnswer(config?.winLimpia?.correctAnswer || "");
  const explicitAnswer = normalizeAnswer(data.correctAnswer ?? data.answer ?? data.word ?? "");

  // The word explicitly selected for THIS round is authoritative.
  // Only fall back to persisted Win Limpia configuration when the round-start
  // payload contains no answer at all.
  const roundAnswer = explicitAnswer || configuredAnswer;
  const answerSource = explicitAnswer
    ? "ROUND_START_DATA"
    : configuredAnswer
      ? "COMMAND_CONFIG_WIN_LIMPIA_FALLBACK"
      : "EMPTY";

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
    correctAnswer: roundAnswer,
    status: "active",
    startTime: new Date()
  };

  console.log("[ROUND ANSWER SNAPSHOT]", {
    roundId: currentRound.id,
    correctAnswer: currentRound.correctAnswer,
    explicitAnswer,
    configuredAnswer,
    source: answerSource
  });

  eventBus.publish("round:answer_snapshot", {
    roundId: currentRound.id,
    correctAnswer: currentRound.correctAnswer,
    source: answerSource,
    timestamp: Date.now()
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

  currentRound.participants = currentPlayers.map(player => ({ ...player }));
  currentRound.winner = topPlayer
    ? { id: topPlayer.id, name: topPlayer.name, points: topPlayer.points }
    : null;
  currentRound.mvp = topPlayer
    ? { id: topPlayer.id, name: topPlayer.name, points: topPlayer.points }
    : null;
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

export function getCurrentRound() {
  return currentRound;
}
