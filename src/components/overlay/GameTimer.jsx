import { useState, useEffect } from "react";
import { eventBus } from "../../core/eventBus";

export function GameTimer({ timer: initialTimer }) {
  const [timer, setTimer] = useState(initialTimer || { remainingSeconds: 0, running: false, phase: "IDLE" });

  useEffect(() => {
    if (initialTimer) setTimer(initialTimer);
  }, [initialTimer?.remainingSeconds, initialTimer?.phase, initialTimer?.running]);

  useEffect(() => {
    const handleTimerUpdate = payload => {
      const t = payload?.timer || payload;
      if (t) setTimer(t);
    };
    const names = ["timer:tick", "timer:started", "timer:paused", "timer:resumed", "timer:stopped", "timer:reset"];
    const unsubs = names.map(name => eventBus.subscribe(name, handleTimerUpdate));
    return () => unsubs.forEach(unsub => unsub && unsub());
  }, []);

  const remainingSeconds = Math.max(0, Number(timer?.remainingSeconds) || 0);
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const phase = String(timer?.phase || "IDLE").toUpperCase();
  const isRound = phase === "ROUND";
  const isIntermission = phase === "INTERMISSION";
  const isRunning = timer?.running === true;
  const urgent = isRound && remainingSeconds > 0 && remainingSeconds <= 300;
  const paused = isRound && !isRunning && remainingSeconds > 0;

  return (
    <div className="timer-container" style={{
      width: urgent ? "112px" : "108px",
      minWidth: urgent ? "112px" : "108px",
      height: urgent ? "66px" : "62px",
      flex: "0 0 auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "visible",
      isolation: "isolate"
    }}>
      <style>{`
        @keyframes cocoTimerCuteHeartbeat {
          0%, 100% { transform: scale(1); }
          10% { transform: scale(1.045); }
          20% { transform: scale(1.012); }
          30% { transform: scale(1.032); }
          45%, 100% { transform: scale(1); }
        }
        @keyframes cocoTimerCuteGlow {
          0%, 100% { box-shadow: 0 4px 14px rgba(0,0,0,.42), 0 0 7px rgba(255,92,110,.22), inset 0 1px 2px rgba(255,255,255,.22); }
          50% { box-shadow: 0 5px 17px rgba(0,0,0,.46), 0 0 15px rgba(255,72,92,.48), inset 0 1px 3px rgba(255,255,255,.3); }
        }
        @keyframes cocoTimerPaused {
          0%,100% { opacity:.58; }
          50% { opacity:1; }
        }
      `}</style>

      <div
        className={urgent ? "timer-five-minute-alert" : "timer-standard"}
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 2,
          borderRadius: "18px",
          border: urgent ? "2px solid rgba(255,255,255,.92)" : "2px solid rgba(125,211,252,.72)",
          background: isIntermission
            ? "linear-gradient(180deg,#382507,#160d02)"
            : urgent
              ? "linear-gradient(180deg,rgba(255,244,246,.98),rgba(255,225,231,.98))"
              : "linear-gradient(180deg,rgba(9,31,48,.98),rgba(3,13,23,.99))",
          boxShadow: urgent
            ? "0 4px 14px rgba(0,0,0,.42), 0 0 7px rgba(255,92,110,.22), inset 0 1px 2px rgba(255,255,255,.22)"
            : "0 5px 18px rgba(0,0,0,.55), inset 0 1px 2px rgba(255,255,255,.12)",
          animation: urgent ? "cocoTimerCuteHeartbeat 1.25s ease-in-out infinite, cocoTimerCuteGlow 1.25s ease-in-out infinite" : "none",
          transition: "width .25s ease, height .25s ease, border .25s ease, box-shadow .25s ease",
          transformOrigin: "center center",
          overflow: "hidden"
        }}
      >
        <div aria-hidden="true" style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: urgent ? "linear-gradient(90deg,transparent,#ff7185,transparent)" : "linear-gradient(90deg,transparent,#7dd3fc,transparent)",
          opacity: .8
        }} />

        <span style={{
          fontFamily: "'Trebuchet MS', 'Arial Rounded MT Bold', Arial, sans-serif",
          fontSize: urgent ? "38px" : "35px",
          lineHeight: 1,
          fontWeight: 900,
          letterSpacing: "-1.2px",
          fontVariantNumeric: "tabular-nums",
          color: isIntermission ? "#ffd166" : urgent ? "#e91e3f" : "#ffffff",
          WebkitTextStroke: urgent ? "0.8px #ffffff" : "0px transparent",
          textShadow: urgent
            ? "1px 1px 0 #111827, -1px -1px 0 #111827, 0 2px 5px rgba(0,0,0,.28)"
            : "0 0 12px rgba(0,245,255,.65)",
          whiteSpace: "nowrap"
        }}>
          {formatted}
        </span>

        {urgent && <div aria-hidden="true" style={{
          position: "absolute",
          top: "5px",
          right: "8px",
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          background: "#ff5c73",
          boxShadow: "0 0 6px rgba(255,92,115,.65)",
          opacity: .85
        }} />}
      </div>

      {paused && <span style={{
        position: "absolute",
        bottom: "-12px",
        fontSize: "8px",
        fontWeight: 900,
        letterSpacing: "1px",
        color: "#ed8936",
        textTransform: "uppercase",
        animation: "cocoTimerPaused 1.2s ease-in-out infinite",
        zIndex: 4
      }}>PAUSED</span>}
    </div>
  );
}
