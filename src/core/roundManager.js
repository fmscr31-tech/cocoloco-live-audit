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
    .trim()
    .toLowerCase();
}

// Keep the active round synchronized with the Win Limpia configuration.
// This prevents an old answer snapshot from remaining active after the
// operator changes the correct answer during LIVE.
eventBus.subscribe("config:command_updated", ({ config } = {}) => {
  if (!currentRound || currentRound.status !== "active") return;

  const configuredAnswer = config?.winLimpia?.correctAnswer;
  if (!configuredAnswer) return;

  const previousAnswer = currentRound.correctAnswer;
  const nextAnswer = normalizeAnswer(configuredAnswer);

  if (!nextAnswer || previousAnswer === nextAnswer) return;

  currentRound.correctAnswer = nextAnswer;

  console.log("[ROUND ANSWER LIVE SYNC]", {
    roundId: currentRound.id,
    previousAnswer,
    correctAnswer: nextAnswer,
    source: "COMMAND_CONFIG_UPDATED_DURING_ACTIVE_ROUND"
  });

  eventBus.publish("round:answer_updated", {
    roundId: currentRound.id,
    correctAnswer: nextAnswer,
    previousAnswer,
    source: "WIN_LIMPIA_CONFIG"
  });
});

export function startRound(data = {}) {
  const config = commandConfigManager.getConfig();
  const configuredAnswer = config?.winLimpia?.correctAnswer || "";
  const explicitAnswer = data.correctAnswer ?? data.answer ?? data.word ?? "";

  // Win Limpia configuration is authoritative when present. This prevents
  // stale/default answer data from another control from overriding the answer
  // selected by the operator.
  const roundAnswer = configuredAnswer || explicitAnswer;

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
    correctAnswer: normalizeAnswer(roundAnswer),
    status: "active",
    startTime: new Date()
  };

  console.log("[ROUND ANSWER SNAPSHOT]", {
    roundId: currentRound.id,
    correctAnswer: currentRound.correctAnswer,
    source: configuredAnswer
      ? "COMMAND_CONFIG_WIN_LIMPIA"
      : explicitAnswer
        ? "ROUND_START_DATA"
        : "EMPTY"
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
