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

// Win Limpia is an operator-controlled LIVE command. If the operator changes
// the active answer, the active round must immediately follow that change.
// The old implementation intentionally ignored this event and left the round
// frozen on a stale word (for example "clase" while the LIVE control showed
// "paradoja"), which made the chat parser reject the real answer.
eventBus.subscribe("config:command_updated", ({ config } = {}) => {
  if (!currentRound || currentRound.status !== "active") return;

  const nextAnswer = normalizeAnswer(config?.winLimpia?.correctAnswer || "");
  if (!nextAnswer) return;

  const previousAnswer = normalizeAnswer(currentRound.correctAnswer || "");
  if (previousAnswer === nextAnswer) return;

  currentRound.correctAnswer = nextAnswer;

  console.log("[ROUND ANSWER UPDATED LIVE]", {
    roundId: currentRound.id,
    previousAnswer: previousAnswer || null,
    activeRoundAnswer: nextAnswer,
    source: "LIVE_WIN_LIMPIA_CONFIG"
  });

  eventBus.publish("round:answer_snapshot", {
    roundId: currentRound.id,
    correctAnswer: nextAnswer,
    previousAnswer: previousAnswer || null,
    source: "LIVE_WIN_LIMPIA_CONFIG",
    timestamp: Date.now()
  });
});

export function startRound(data = {}) {
  const config = commandConfigManager.refreshFromStorage();
  const configuredAnswer = normalizeAnswer(config?.winLimpia?.correctAnswer || "");
  const explicitAnswer = normalizeAnswer(data.correctAnswer ?? data.answer ?? data.word ?? "");

  // The explicit round-start answer is preferred when supplied. Otherwise use
  // the currently configured Win Limpia answer.
  const roundAnswer = explicitAnswer || configuredAnswer;
  const answerSource = explicitAnswer
    ? "ROUND_START_DATA"
    : configuredAnswer
      ? "COMMAND_CONFIG_WIN_LIMPIA"
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
