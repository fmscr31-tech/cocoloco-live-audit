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
// The active round owns a snapshot of the answer. The live Win Limpia
// configuration is the authoritative source when a round starts. This is
// intentional: beginRound() can receive legacy/stale answer fields from old
// UI state, and those fields must NEVER overwrite the answer currently stored
// in the Win Limpia configuration.
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
  // Always refresh the persisted LIVE configuration at the exact moment the
  // round starts. This prevents a stale React/UI round object from becoming
  // the canonical answer snapshot.
  const config = commandConfigManager.refreshFromStorage();
  const configuredAnswer = normalizeAnswer(config?.winLimpia?.correctAnswer || "");

  // Only accept explicit answer fields that are deliberately named as round
  // answer sources. Legacy generic fields such as data.correctAnswer,
  // data.answer and data.word are intentionally ignored because those were
  // the source of the stale-answer overwrite observed in LIVE.
  const explicitAnswer = normalizeAnswer(
    data.targetAnswer ??
    data.roundAnswer ??
    data.winLimpiaAnswer ??
    ""
  );

  // CURRENT LIVE CONFIGURATION HAS PRIORITY. The explicit round answer is
  // used only when no Win Limpia answer is configured at all.
  const roundAnswer = configuredAnswer || explicitAnswer;
  const answerSource = configuredAnswer
    ? "COMMAND_CONFIG_WIN_LIMPIA"
    : explicitAnswer
      ? "ROUND_START_DATA"
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
