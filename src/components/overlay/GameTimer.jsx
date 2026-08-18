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
  const formattedMins = String(mins).padStart(2, "0");
  const formattedSecs = String(secs).padStart(2, "0");
  const isIntermission = String(timer?.phase || "").toUpperCase() === "INTERMISSION";

  // From exactly 05:00 downward the timer enters the urgency state.
  const isFiveMinuteAlert = !isIntermission && remainingSeconds <= 300 && remainingSeconds > 0;
  const isLastMinute = !isIntermission && remainingSeconds <= 60 && remainingSeconds > 0;
  const isPaused = timer?.running === false && remainingSeconds > 0;

  const alertStroke = "1px #ffffff, 2px #160b0b";
  const alertShadow = "0 1px 0 #160b0b, 0 0 2px #ffffff, 0 0 5px #ffffff, 0 0 10px #ff3030, 0 0 20px rgba(239,48,48,.95)";

  return (
    <div
      className={`timer-container ${isFiveMinuteAlert ? "timer-urgent-container" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "86px",
        minWidth: "86px",
        flex: "0 0 86px",
        position: "relative"
      }}
    >
      <style>{`
        @keyframes cocoTimerDangerPulse {
          0%,100% {
            transform:scale(1);
            filter:drop-shadow(0 0 3px rgba(80,0,0,.8)) drop-shadow(0 0 7px rgba(220,20,20,.75));
          }
          12% { transform:scale(1.075); }
          24% { transform:scale(1); }
          36% { transform:scale(1.045); }
          52% { transform:scale(1); }
        }
        @keyframes cocoTimerUrgencyBackground {
          0%,100% {
            background:linear-gradient(145deg,rgba(90,8,8,.96),rgba(35,4,7,.98));
            border-color:rgba(255,75,75,.75);
            box-shadow:0 0 10px rgba(239,48,48,.28),inset 0 0 10px rgba(255,40,40,.08);
          }
          50% {
            background:linear-gradient(145deg,rgba(175,18,18,.98),rgba(70,5,10,.99));
            border-color:rgba(255,110,110,1);
            box-shadow:0 0 22px rgba(239,48,48,.78),0 0 42px rgba(239,48,48,.28),inset 0 0 16px rgba(255,80,80,.18);
          }
        }
        @keyframes cocoIntermissionPulse { 0%,100% { opacity:.92; } 50% { opacity:1; } }
      `}</style>

      {isIntermission && (
        <div style={{
          fontSize:"9px",
          lineHeight:1,
          fontWeight:1000,
          color:"#ffd166",
          letterSpacing:"1px",
          textTransform:"uppercase",
          marginBottom:"3px",
          animation:"cocoIntermissionPulse 1s ease-in-out infinite",
          textShadow:"0 0 8px rgba(255,209,102,.75)"
        }}>
          NUEVA RONDA
        </div>
      )}

      <div
        className={`timer ${isFiveMinuteAlert ? "timer-five-minute-alert" : ""} ${isLastMinute ? "timer-last-minute-alert" : ""}`}
        style={{
          width: isFiveMinuteAlert ? "84px" : "82px",
          minWidth: isFiveMinuteAlert ? "84px" : "82px",
          height: isFiveMinuteAlert ? "48px" : "42px",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontSize: isFiveMinuteAlert ? "31px" : "29px",
          lineHeight: 1,
          fontWeight: "900",
          fontVariantNumeric: "tabular-nums",
          fontFeatureSettings: '"tnum" 1',
          color: isIntermission ? "#ffd166" : isFiveMinuteAlert ? "#ff3030" : "#ffffff",
          WebkitTextStroke: isIntermission ? "0.4px #3a2100" : isFiveMinuteAlert ? alertStroke : "0px transparent",
          textShadow: isIntermission ? "0 0 8px rgba(255,209,102,.7)" : isFiveMinuteAlert ? alertShadow : "0 0 12px rgba(0,245,255,0.6)",
          background: isIntermission
            ? "rgba(40,25,5,.35)"
            : isFiveMinuteAlert
              ? "linear-gradient(145deg,rgba(120,10,10,.97),rgba(45,4,8,.99))"
              : "rgba(5,18,30,.35)",
          border: isFiveMinuteAlert ? "1.5px solid rgba(255,85,85,.85)" : "1px solid rgba(125,211,252,.16)",
          borderRadius: "7px",
          boxShadow: isFiveMinuteAlert
            ? "0 0 14px rgba(239,48,48,.42), inset 0 0 12px rgba(255,60,60,.1)"
            : "0 0 8px rgba(0,245,255,.08)",
          transition: "width .25s ease, height .25s ease, font-size .25s ease, color .2s ease, background .25s ease, box-shadow .25s ease",
          animation: isFiveMinuteAlert ? "cocoTimerDangerPulse 1.05s ease-in-out infinite, cocoTimerUrgencyBackground 1.05s ease-in-out infinite" : "none",
          transformOrigin: "center center",
          whiteSpace: "nowrap",
          flex: "0 0 auto",
          position: "relative",
          zIndex: 2
        }}
      >
        <span>{formattedMins}:</span>
        <span style={{
          color: isLastMinute ? "#ff2020" : "inherit",
          WebkitTextStroke: isLastMinute ? alertStroke : "inherit",
          display: "inline-block",
          fontVariantNumeric: "tabular-nums",
          textShadow: isLastMinute ? alertShadow : "inherit"
        }}>
          {formattedSecs}
        </span>
      </div>

      {isPaused && !isIntermission && (
        <span style={{
          fontSize:"9px",
          color:"#ed8936",
          fontWeight:"800",
          letterSpacing:"1px",
          textTransform:"uppercase",
          marginTop:"2px"
        }}>
          PAUSED
        </span>
      )}
    </div>
  );
}
