import { eventBus } from "./eventBus";

const TIMER_STORAGE_KEY = "cocoloco_active_timer_v2";

let timer = {
  remainingSeconds: 0,
  interval: null,
  running: false,
  initialMinutes: 0,
  endAt: null
};

function persistTimer() {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
      remainingSeconds: timer.remainingSeconds,
      running: timer.running,
      initialMinutes: timer.initialMinutes,
      endAt: timer.endAt
    }));
  } catch (e) {
    console.warn("[TIMER] Failed to persist timer:", e);
  }
}

function clearPersistedTimer() {
  try { localStorage.removeItem(TIMER_STORAGE_KEY); } catch (e) {}
}

function emitTick(eventName = "timer:tick") {
  const payload = { timer: getTimer(), time: getTime(), timestamp: Date.now() };
  eventBus.emit(eventName, payload);
}

function finishTimer() {
  if (timer.interval) {
    clearInterval(timer.interval);
    timer.interval = null;
  }
  timer.remainingSeconds = 0;
  timer.running = false;
  timer.endAt = null;
  persistTimer();
  console.log("[TIMER] COMPLETED");
  eventBus.publish("TIMER_COMPLETED", { timestamp: Date.now() });
  eventBus.publish("ROUND_TIME_EXPIRED", { timestamp: Date.now() });
  eventBus.emit("timer:completed", { timer: getTimer(), time: getTime(), timestamp: Date.now() });
}

function startInterval() {
  if (timer.interval) clearInterval(timer.interval);
  timer.interval = setInterval(() => {
    if (!timer.running) return;
    if (timer.endAt) {
      timer.remainingSeconds = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
    } else {
      timer.remainingSeconds = Math.max(0, timer.remainingSeconds - 1);
    }
    if (timer.remainingSeconds <= 0) {
      finishTimer();
      return;
    }
    persistTimer();
    emitTick();
  }, 1000);
}

function restoreTimer() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    timer.initialMinutes = Number(saved.initialMinutes) || 0;
    timer.endAt = Number(saved.endAt) || null;
    timer.running = saved.running === true;
    timer.remainingSeconds = Number(saved.remainingSeconds) || 0;

    if (timer.running && timer.endAt) {
      timer.remainingSeconds = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
      if (timer.remainingSeconds > 0) {
        startInterval();
        console.log("[TIMER] Restored after page reload", getTimer());
      } else {
        finishTimer();
      }
    }
  } catch (e) {
    console.warn("[TIMER] Failed to restore persisted timer:", e);
  }
}

if (typeof window !== "undefined") {
  const syncTimerState = ({ timer: t }) => {
    if (!t) return;
    timer.running = !!t.running;
    if (t.remainingSeconds !== undefined) timer.remainingSeconds = Number(t.remainingSeconds) || 0;
  };
  eventBus.subscribe("timer:started", syncTimerState);
  eventBus.subscribe("timer:tick", syncTimerState);
  eventBus.subscribe("timer:paused", syncTimerState);
  eventBus.subscribe("timer:resumed", syncTimerState);
  eventBus.subscribe("timer:stopped", syncTimerState);
  eventBus.subscribe("timer:reset", syncTimerState);
  restoreTimer();
}

export function startTimer(minutes = 0) {
  if (timer.interval) clearInterval(timer.interval);
  timer.initialMinutes = Math.max(0, Number(minutes) || 0);
  timer.remainingSeconds = Math.max(0, Math.floor(timer.initialMinutes * 60));
  timer.running = timer.remainingSeconds > 0;
  timer.endAt = timer.running ? Date.now() + timer.remainingSeconds * 1000 : null;
  persistTimer();

  console.log("[TIMER] START", { remainingSeconds: timer.remainingSeconds, running: timer.running, endAt: timer.endAt });
  emitTick("timer:started");
  if (timer.running) startInterval();
  return getTimer();
}

export function pauseTimer() {
  if (timer.interval) {
    clearInterval(timer.interval);
    timer.interval = null;
  }
  if (timer.endAt) timer.remainingSeconds = Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
  timer.endAt = null;
  timer.running = false;
  persistTimer();
  emitTick("timer:paused");
}

export function resumeTimer() {
  if (timer.running) return getTimer();
  if (timer.remainingSeconds <= 0) return startTimer(timer.initialMinutes);
  timer.running = true;
  timer.endAt = Date.now() + timer.remainingSeconds * 1000;
  persistTimer();
  emitTick("timer:resumed");
  startInterval();
  return getTimer();
}

export function stopTimer() {
  if (timer.interval) {
    clearInterval(timer.interval);
    timer.interval = null;
  }
  timer.running = false;
  timer.endAt = null;
  persistTimer();
  emitTick("timer:stopped");
}

export function resetTimer(minutes) {
  if (timer.interval) clearInterval(timer.interval);
  timer.interval = null;
  timer.initialMinutes = minutes !== undefined ? Math.max(0, Number(minutes) || 0) : timer.initialMinutes;
  timer.remainingSeconds = Math.floor(timer.initialMinutes * 60);
  timer.running = false;
  timer.endAt = null;
  persistTimer();
  emitTick("timer:reset");
}

export function clearTimerPersistence() {
  clearPersistedTimer();
}

export function isTimerRunning() { return timer.running; }

export function getTime() {
  return {
    minutes: Math.floor(timer.remainingSeconds / 60),
    seconds: timer.remainingSeconds % 60
  };
}

export function getTimer() {
  return {
    remainingSeconds: timer.remainingSeconds,
    running: timer.running,
    minutes: Math.floor(timer.remainingSeconds / 60),
    seconds: timer.remainingSeconds % 60
  };
}
