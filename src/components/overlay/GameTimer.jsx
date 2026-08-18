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
      width: "112px",
      minWidth: "112px",
      height: "58px",
      flex: "0 0 auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "visible",
      isolation: "isolate"
    }}>
      <style>{`
        @keyframes cocoCuteHeartbeat {
          0%, 100% { transform: scale(1); }
          12% { transform: scale(1.055); }
          24% { transform: scale(1.018); }
          36% { transform: scale(1.045); }
          52% { transform: scale(1); }
        }
        @keyframes cocoCuteGlow {
          0%, 100% { opacity: .45; }
          50% { opacity: .8; }
        }
        @keyframes cocoPaused { 0%,100% { opacity:.62; } 50% { opacity:1; } }
      `}</style>

      {urgent && <div aria-hidden="true" style={{
        position: "absolute",
        width: "82px",
        height: "42px",
        borderRadius: "50%",
        background: "rgba(255,88,108,.16)",
        filter: "blur(10px)",
        animation: "cocoCuteGlow 1.35s ease-in-out infinite",
        zIndex: 0,
        pointerEvents: "none"
      }} />}

      <div style={{
        position: "relative",
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        animation: urgent ? "cocoCuteHeartbeat 1.35s ease-in-out infinite" : "none",
        transformOrigin: "center center",
        padding: "2px 6px"
      }}>
        <span style={{
          fontFamily: "'Trebuchet MS', 'Arial Rounded MT Bold', system-ui, sans-serif",
          fontSize: urgent ? "38px" : "35px",
          lineHeight: 1,
          fontWeight: 900,
          letterSpacing: "-1.5px",
          fontVariantNumeric: "tabular-nums",
          color: isIntermission ? "#ffd166" : urgent ? "#ff4d67" : "#ffffff",
          WebkitTextStroke: urgent ? "1px #ffffff" : "0.5px rgba(0,0,0,.65)",
          textShadow: urgent
            ? "2px 2px 0 #18070b, -1px -1px 0 #18070b, 0 0 5px rgba(255,255,255,.9), 0 0 13px rgba(255,77,103,.75)"
            : "2px 2px 0 rgba(0,0,0,.8), 0 0 8px rgba(0,245,255,.48)",
          whiteSpace: "nowrap"
        }}>
          {formatted}
        </span>
      </div>

      {paused && <span style={{
        position: "absolute",
        bottom: "-9px",
        fontSize: "7px",
        fontWeight: 900,
        letterSpacing: ".8px",
        color: "#ffd166",
        textTransform: "uppercase",
        animation: "cocoPaused 1.2s ease-in-out infinite",
        zIndex: 4,
        textShadow: "0 1px 3px rgba(0,0,0,.9)"
      }}>PAUSED</span>}
    </div>
  );
}
