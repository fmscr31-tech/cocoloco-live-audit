import { eventBus } from "./eventBus";

let timer = {
  remainingSeconds: 0,
  interval: null,
  running: false,
  initialMinutes: 0
};

// Initialize cross-tab synchronization listener for timer state
if (typeof window !== "undefined") {
  const syncTimerState = ({ timer: t }) => {
    if (t) {
      timer.running = !!t.running;
      if (t.remainingSeconds !== undefined) {
        timer.remainingSeconds = t.remainingSeconds;
      }
    }
  };

  eventBus.subscribe("timer:started", syncTimerState);
  eventBus.subscribe("timer:tick", syncTimerState);
  eventBus.subscribe("timer:paused", syncTimerState);
  eventBus.subscribe("timer:resumed", syncTimerState);
  eventBus.subscribe("timer:stopped", syncTimerState);
  eventBus.subscribe("timer:reset", syncTimerState);
}

export function startTimer(minutes = 0) {
  stopTimer();
  timer.initialMinutes = minutes;
  timer.remainingSeconds = Math.max(0, Math.floor(minutes * 60));
  timer.running = true;

  console.log("[TIMER TRACE 02] TIMER MANAGER START", { remainingSeconds: timer.remainingSeconds, running: timer.running });
  eventBus.emit("timer:started", { timer: getTimer(), time: getTime(), timestamp: Date.now() });

  timer.interval = setInterval(() => {
    if (timer.remainingSeconds <= 0) {
      stopTimer();
      console.log("[TIMER TRACE 02] TIMER MANAGER COMPLETED");
      eventBus.publish("TIMER_COMPLETED", { timestamp: Date.now() });
      eventBus.publish("ROUND_TIME_EXPIRED", { timestamp: Date.now() });
      eventBus.emit("timer:completed", { timestamp: Date.now() });
      return;
    }
    timer.remainingSeconds--;
    console.log("[TIMER TRACE 03] TICK", { remainingSeconds: timer.remainingSeconds, running: timer.running });
    const payload = { timer: getTimer(), time: getTime(), timestamp: Date.now() };
    console.log("[TIMER TRACE 04] EVENTBUS SEND", { eventName: "timer:tick", payload });
    eventBus.emit("timer:tick", payload);
  }, 1000);

  return getTimer();
}

export function pauseTimer() {
  if (timer.interval) {
    clearInterval(timer.interval);
    timer.interval = null;
  }
  timer.running = false;
  console.log("[TIMER TRACE 02] TIMER MANAGER PAUSE", { remainingSeconds: timer.remainingSeconds, running: timer.running });
  eventBus.emit("timer:paused", { timer: getTimer(), time: getTime(), timestamp: Date.now() });
}

export function resumeTimer() {
  if (timer.running) return;

  if (timer.remainingSeconds <= 0) {
    startTimer(timer.initialMinutes);
    return getTimer();
  }

  timer.running = true;
  console.log("[TIMER TRACE 02] TIMER MANAGER RESUME", { remainingSeconds: timer.remainingSeconds, running: timer.running });
  eventBus.emit("timer:resumed", { timer: getTimer(), time: getTime(), timestamp: Date.now() });

  timer.interval = setInterval(() => {
    if (timer.remainingSeconds <= 0) {
      pauseTimer();
      console.log("[TIMER TRACE 02] TIMER MANAGER COMPLETED");
      eventBus.publish("TIMER_COMPLETED", { timestamp: Date.now() });
      eventBus.publish("ROUND_TIME_EXPIRED", { timestamp: Date.now() });
      eventBus.emit("timer:completed", { timestamp: Date.now() });
      return;
    }
    timer.remainingSeconds--;
    console.log("[TIMER TRACE 03] TICK", { remainingSeconds: timer.remainingSeconds, running: timer.running });
    const payload = { timer: getTimer(), time: getTime(), timestamp: Date.now() };
    console.log("[TIMER TRACE 04] EVENTBUS SEND", { eventName: "timer:tick", payload });
    eventBus.emit("timer:tick", payload);
  }, 1000);

  return getTimer();
}

export function stopTimer() {
  pauseTimer();
  console.log("[TIMER TRACE 02] TIMER MANAGER STOP", { remainingSeconds: timer.remainingSeconds, running: timer.running });
  eventBus.emit("timer:stopped", { timer: getTimer(), time: getTime(), timestamp: Date.now() });
}

export function resetTimer(minutes) {
  pauseTimer();
  const mins = minutes !== undefined ? minutes : timer.initialMinutes;
  timer.remainingSeconds = Math.max(0, Math.floor(mins * 60));
  console.log("[TIMER TRACE 02] TIMER MANAGER RESET", { remainingSeconds: timer.remainingSeconds, running: timer.running });
  eventBus.emit("timer:reset", { timer: getTimer(), time: getTime(), timestamp: Date.now() });
}

export function isTimerRunning() {
  return timer.running;
}

export function getTime() {
  return {
    minutes: Math.floor(timer.remainingSeconds / 60),
    seconds: timer.remainingSeconds % 60
  };
}

export function getTimer() {
  return {
    remainingSeconds: timer.remainingSeconds,
    running: timer.running
  };
}
