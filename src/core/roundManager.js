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

// WIN LIMPIA AUTHORITY:
// The answer belongs to the individual round that is being played.
// A round-specific answer must never be replaced by a stale global
// configuration value while that round is active.
export function startRound(data = {}) {
  const config = commandConfigManager.refreshFromStorage();
  const configuredAnswer = normalizeAnswer(config?.winLimpia?.correctAnswer || "");

  // Explicit round data is authoritative. This is the critical distinction
  // between the word for THIS round and an older/default Win Limpia setting.
  // Keep legacy field names for compatibility with existing round callers.
  const explicitAnswer = normalizeAnswer(
    data.targetAnswer ??
    data.roundAnswer ??
    data.winLimpiaAnswer ??
    data.correctAnswer ??
    data.answer ??
    data.word ??
    ""
  );

  // A deliberately supplied round answer always wins. The persisted Win
  // Limpia configuration is only a fallback for legacy callers that do not
  // provide an answer when starting the round.
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
    source: answerSource,
    ignoredLegacyFields: {
      correctAnswer: Boolean(data.correctAnswer),
      answer: Boolean(data.answer),
      word: Boolean(data.word)
    }
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
