import { useState, useEffect } from "react";
import { eventBus } from "../../core/eventBus";

/**
 * GameTimer component
 * Subscribes directly to timer events via eventBus, isolating timer updates
 * completely from dashboard subscribers, player lists, registration, and bubbles.
 */
export function GameTimer({ timer: initialTimer }) {
  const [timer, setTimer] = useState(initialTimer || { remainingSeconds: 0, running: false });

  useEffect(() => {
    if (initialTimer) {
      setTimer(initialTimer);
    }
  }, [initialTimer?.remainingSeconds]);

  useEffect(() => {
    const handleTimerUpdate = (payload) => {
      const t = payload?.timer || payload;
      if (t) {
        setTimer(t);
      }
    };

    const unsubTick = eventBus.subscribe("timer:tick", handleTimerUpdate);
    const unsubStart = eventBus.subscribe("timer:started", handleTimerUpdate);
    const unsubPause = eventBus.subscribe("timer:paused", handleTimerUpdate);
    const unsubResume = eventBus.subscribe("timer:resumed", handleTimerUpdate);
    const unsubStop = eventBus.subscribe("timer:stopped", handleTimerUpdate);
    const unsubReset = eventBus.subscribe("timer:reset", handleTimerUpdate);

    return () => {
      unsubTick && unsubTick();
      unsubStart && unsubStart();
      unsubPause && unsubPause();
      unsubResume && unsubResume();
      unsubStop && unsubStop();
      unsubReset && unsubReset();
    };
  }, []);

  const mins = timer?.minutes !== undefined ? timer.minutes : Math.floor((timer?.remainingSeconds || 0) / 60);
  const secs = timer?.seconds !== undefined ? timer.seconds : (timer?.remainingSeconds || 0) % 60;
  const formatted = String(Math.max(0, mins)).padStart(2, "0") + ":" + String(Math.max(0, secs)).padStart(2, "0");
  const isPaused = timer?.running === false && ((timer?.remainingSeconds || 0) > 0 || (timer?.minutes || 0) > 0 || (timer?.seconds || 0) > 0);

  return (
    <div className="timer-container" style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
      <div className="timer" style={{fontSize: "28px", fontWeight: "900", color: "#ffffff", textShadow: "0 0 12px rgba(0,245,255,0.6)"}}>
        {formatted}
      </div>
      {isPaused && (
        <span style={{fontSize: "9px", color: "#ed8936", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase"}}>
          PAUSED
        </span>
      )}
    </div>
  );
}
