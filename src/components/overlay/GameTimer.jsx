import { useState, useEffect } from "react";
import { eventBus } from "../../core/eventBus";

export function GameTimer({ timer: initialTimer }) {
  const [timer, setTimer] = useState(initialTimer || { remainingSeconds: 0, running: false });

  useEffect(() => {
    if (initialTimer) setTimer(initialTimer);
  }, [initialTimer?.remainingSeconds]);

  useEffect(() => {
    const handleTimerUpdate = (payload) => {
      const t = payload?.timer || payload;
      if (t) setTimer(t);
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

  const remainingSeconds = Math.max(0, Number(timer?.remainingSeconds) || 0);
  const mins = timer?.minutes !== undefined ? Number(timer.minutes) : Math.floor(remainingSeconds / 60);
  const secs = timer?.seconds !== undefined ? Number(timer.seconds) : remainingSeconds % 60;
  const formattedMins = String(Math.max(0, mins)).padStart(2, "0");
  const formattedSecs = String(Math.max(0, secs)).padStart(2, "0");
  const isFiveMinuteAlert = remainingSeconds <= 300 && remainingSeconds > 0;
  const isLastMinute = remainingSeconds <= 60 && remainingSeconds > 0;
  const isPaused = timer?.running === false && remainingSeconds > 0;

  return (
    <div className="timer-container" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <style>{`
        @keyframes cocoTimerDangerPulse {
          0%, 100% { transform: scale(1); text-shadow: 0 0 12px rgba(255,0,0,.65); }
          50% { transform: scale(1.16); text-shadow: 0 0 24px rgba(255,0,0,1), 0 0 8px rgba(255,255,255,.35); }
        }
        @keyframes cocoTimerSecondsNudge {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-1.5px); }
          75% { transform: translateX(1.5px); }
        }
      `}</style>
      <div
        className={`timer ${isFiveMinuteAlert ? "timer-five-minute-alert" : ""} ${isLastMinute ? "timer-last-minute-alert" : ""}`}
        style={{
          fontSize: isFiveMinuteAlert ? "38px" : "28px",
          lineHeight: 1,
          fontWeight: "900",
          color: isFiveMinuteAlert ? "#ff3030" : "#ffffff",
          textShadow: isFiveMinuteAlert ? "0 0 18px rgba(255,0,0,.8)" : "0 0 12px rgba(0,245,255,0.6)",
          transition: "font-size .25s ease, color .2s ease, text-shadow .2s ease",
          animation: isFiveMinuteAlert ? "cocoTimerDangerPulse 1.05s ease-in-out infinite" : "none",
          transformOrigin: "center center",
          whiteSpace: "nowrap"
        }}>
        <span>{formattedMins}:</span>
        <span
          style={{
            color: isLastMinute ? "#ff3030" : "inherit",
            animation: isLastMinute ? "cocoTimerSecondsNudge .45s ease-in-out infinite" : "none",
            display: "inline-block"
          }}
        >
          {formattedSecs}
        </span>
      </div>
      {isPaused && (
        <span style={{ fontSize: "9px", color: "#ed8936", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase" }}>
          PAUSED
        </span>
      )}
    </div>
  );
}
