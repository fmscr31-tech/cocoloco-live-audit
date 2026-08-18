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
  const critical = isRound && remainingSeconds > 0 && remainingSeconds <= 60;
  const paused = isRound && !isRunning && remainingSeconds > 0;

  return (
    <div className="timer-container" style={{
      width: urgent ? "116px" : "108px",
      minWidth: urgent ? "116px" : "108px",
      height: urgent ? "68px" : "62px",
      flex: "0 0 auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "visible",
      isolation: "isolate"
    }}>
      <style>{`
        @keyframes cocoTimerHeartbeatStrong {
          0%, 100% { transform: scale(1); }
          8% { transform: scale(1.13); }
          16% { transform: scale(1.03); }
          25% { transform: scale(1.09); }
          38%, 100% { transform: scale(1); }
        }
        @keyframes cocoTimerRedFlash {
          0%,100% { background: linear-gradient(180deg,#3b0508 0%,#150205 100%); box-shadow: 0 0 10px rgba(255,0,0,.45), inset 0 0 14px rgba(255,40,40,.12); }
          50% { background: linear-gradient(180deg,#d71920 0%,#62070d 100%); box-shadow: 0 0 24px rgba(255,0,0,.95), 0 0 50px rgba(255,0,0,.38), inset 0 0 18px rgba(255,150,150,.24); }
        }
        @keyframes cocoTimerHalo {
          0%,100% { opacity:.25; transform:scale(.88); }
          50% { opacity:.8; transform:scale(1.12); }
        }
        @keyframes cocoTimerPaused { 0%,100% { opacity:.65; } 50% { opacity:1; } }
      `}</style>

      {urgent && <div aria-hidden="true" style={{
        position: "absolute",
        inset: "-10px -14px",
        borderRadius: "18px",
        background: "rgba(255,0,0,.24)",
        filter: "blur(12px)",
        animation: "cocoTimerHalo 1.05s ease-in-out infinite",
        zIndex: 0,
        pointerEvents: "none"
      }} />}

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
          borderRadius: urgent ? "14px" : "12px",
          border: urgent ? "3px solid #ffffff" : "2px solid rgba(125,211,252,.72)",
          background: isIntermission
            ? "linear-gradient(180deg,#382507,#160d02)"
            : urgent
              ? "linear-gradient(180deg,#5b080d,#170205)"
              : "linear-gradient(180deg,rgba(9,31,48,.98),rgba(3,13,23,.99))",
          boxShadow: urgent
            ? "0 0 18px rgba(255,0,0,.75), 0 0 38px rgba(255,0,0,.3), inset 0 0 16px rgba(255,70,70,.18)"
            : "0 5px 18px rgba(0,0,0,.55), inset 0 1px 2px rgba(255,255,255,.12)",
          animation: urgent ? "cocoTimerHeartbeatStrong 1.05s ease-in-out infinite, cocoTimerRedFlash 1.05s ease-in-out infinite" : "none",
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
          background: urgent ? "#ffffff" : "linear-gradient(90deg,transparent,#7dd3fc,transparent)",
          opacity: urgent ? 1 : .75
        }} />

        <span style={{
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontSize: urgent ? "39px" : "35px",
          lineHeight: 1,
          fontWeight: 1000,
          letterSpacing: "-1px",
          fontVariantNumeric: "tabular-nums",
          color: isIntermission ? "#ffd166" : urgent ? "#ff2020" : "#ffffff",
          WebkitTextStroke: urgent ? "1.4px #ffffff" : "0px transparent",
          textShadow: urgent
            ? "-2px -2px 0 #050000,2px -2px 0 #050000,-2px 2px 0 #050000,2px 2px 0 #050000,0 0 5px #ffffff,0 0 16px #ff0000"
            : "0 0 12px rgba(0,245,255,.65)",
          whiteSpace: "nowrap"
        }}>
          {formatted}
        </span>

        {urgent && <div aria-hidden="true" style={{
          position: "absolute",
          left: "10px",
          right: "10px",
          bottom: "4px",
          height: "2px",
          background: "rgba(255,255,255,.85)",
          boxShadow: "0 0 7px #ffffff",
          opacity: .75
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
