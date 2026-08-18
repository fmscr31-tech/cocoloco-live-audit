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

    const names = [
      "timer:tick",
      "timer:started",
      "timer:paused",
      "timer:resumed",
      "timer:stopped",
      "timer:reset"
    ];

    const unsubs = names.map(name => eventBus.subscribe(name, handleTimerUpdate));
    return () => unsubs.forEach(unsub => unsub && unsub());
  }, []);

  const remainingSeconds = Math.max(0, Number(timer?.remainingSeconds) || 0);
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formattedMins = String(mins).padStart(2, "0");
  const formattedSecs = String(secs).padStart(2, "0");

  const phase = String(timer?.phase || "IDLE").toUpperCase();
  const isRound = phase === "ROUND";
  const isIntermission = phase === "INTERMISSION";
  const isRunning = timer?.running === true;

  // The urgency state begins exactly at 05:00 and remains active through 00:01.
  // It is intentionally tied to remainingSeconds, not to elapsed time or render count.
  const isFiveMinuteAlert = isRound && remainingSeconds > 0 && remainingSeconds <= 300;
  const isLastMinute = isRound && remainingSeconds > 0 && remainingSeconds <= 60;
  const isPaused = !isRunning && isRound && remainingSeconds > 0;

  return (
    <div
      className={`timer-container ${isFiveMinuteAlert ? "timer-urgent-container" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: isFiveMinuteAlert ? "104px" : "94px",
        minWidth: isFiveMinuteAlert ? "104px" : "94px",
        flex: "0 0 auto",
        position: "relative",
        overflow: "visible"
      }}
    >
      <style>{`
        @keyframes cocoTimerHeartbeat {
          0%, 100% { transform: scale(1); }
          10% { transform: scale(1.10); }
          18% { transform: scale(1.02); }
          28% { transform: scale(1.07); }
          42%, 100% { transform: scale(1); }
        }

        @keyframes cocoTimerDangerBackground {
          0%, 100% {
            background: linear-gradient(145deg, rgba(72,5,8,.98), rgba(18,2,5,.99));
            border-color: rgba(255,255,255,.78);
            box-shadow:
              0 0 10px rgba(255,25,25,.45),
              0 0 24px rgba(255,25,25,.22),
              inset 0 0 12px rgba(255,35,35,.12);
          }
          50% {
            background: linear-gradient(145deg, rgba(190,12,18,1), rgba(58,3,8,1));
            border-color: rgba(255,255,255,1);
            box-shadow:
              0 0 18px rgba(255,40,40,.85),
              0 0 40px rgba(255,20,20,.42),
              inset 0 0 18px rgba(255,110,110,.24);
          }
        }

        @keyframes cocoTimerGlow {
          0%, 100% { opacity: .72; transform: scale(.94); }
          50% { opacity: 1; transform: scale(1.08); }
        }

        @keyframes cocoIntermissionPulse {
          0%, 100% { opacity: .92; }
          50% { opacity: 1; }
        }
      `}</style>

      {isFiveMinuteAlert && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "-8px -6px",
            borderRadius: "14px",
            background: "rgba(255,20,20,.18)",
            filter: "blur(8px)",
            animation: "cocoTimerGlow 1.05s ease-in-out infinite",
            pointerEvents: "none",
            zIndex: 0
          }}
        />
      )}

      {isIntermission && (
        <div style={{
          fontSize: "9px",
          lineHeight: 1,
          fontWeight: 1000,
          color: "#ffd166",
          letterSpacing: "1px",
          textTransform: "uppercase",
          marginBottom: "3px",
          animation: "cocoIntermissionPulse 1s ease-in-out infinite",
          textShadow: "0 0 8px rgba(255,209,102,.75)",
          position: "relative",
          zIndex: 2
        }}>
          NUEVA RONDA
        </div>
      )}

      <div
        className={`timer ${isFiveMinuteAlert ? "timer-five-minute-alert" : ""} ${isLastMinute ? "timer-last-minute-alert" : ""}`}
        style={{
          width: isFiveMinuteAlert ? "96px" : "88px",
          minWidth: isFiveMinuteAlert ? "96px" : "88px",
          height: isFiveMinuteAlert ? "54px" : "46px",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontSize: isFiveMinuteAlert ? "35px" : "31px",
          lineHeight: 1,
          fontWeight: 1000,
          fontVariantNumeric: "tabular-nums",
          fontFeatureSettings: '"tnum" 1',
          color: isIntermission ? "#ffd166" : isFiveMinuteAlert ? "#ff2525" : "#ffffff",
          WebkitTextStroke: isFiveMinuteAlert ? "1.2px #ffffff" : isIntermission ? "0.5px #3a2100" : "0px transparent",
          textShadow: isFiveMinuteAlert
            ? "-1px -1px 0 #050505, 1px -1px 0 #050505, -1px 1px 0 #050505, 1px 1px 0 #050505, 0 0 4px #ffffff, 0 0 10px #ff2020, 0 0 22px rgba(255,20,20,.95)"
            : isIntermission
              ? "0 0 8px rgba(255,209,102,.7)"
              : "0 0 12px rgba(0,245,255,.6)",
          background: isIntermission
            ? "rgba(40,25,5,.35)"
            : isFiveMinuteAlert
              ? "linear-gradient(145deg, rgba(105,6,10,.98), rgba(34,2,6,.99))"
              : "rgba(5,18,30,.35)",
          border: isFiveMinuteAlert ? "2px solid #ffffff" : "1px solid rgba(125,211,252,.16)",
          borderRadius: "9px",
          boxShadow: isFiveMinuteAlert
            ? "0 0 16px rgba(255,25,25,.65), 0 0 34px rgba(255,15,15,.3), inset 0 0 14px rgba(255,60,60,.15)"
            : "0 0 8px rgba(0,245,255,.08)",
          transition: "width .25s ease, height .25s ease, font-size .25s ease, color .2s ease, background .25s ease, box-shadow .25s ease",
          animation: isFiveMinuteAlert
            ? "cocoTimerHeartbeat 1.05s ease-in-out infinite, cocoTimerDangerBackground 1.05s ease-in-out infinite"
            : "none",
          transformOrigin: "center center",
          whiteSpace: "nowrap",
          flex: "0 0 auto",
          position: "relative",
          zIndex: 2
        }}
      >
        <span>{formattedMins}:</span>
        <span style={{
          color: isLastMinute ? "#ff1010" : "inherit",
          WebkitTextStroke: isFiveMinuteAlert ? "1.2px #ffffff" : "inherit",
          display: "inline-block",
          fontVariantNumeric: "tabular-nums",
          textShadow: isLastMinute
            ? "-1px -1px 0 #050505, 1px -1px 0 #050505, -1px 1px 0 #050505, 1px 1px 0 #050505, 0 0 5px #ffffff, 0 0 14px #ff1010"
            : "inherit"
        }}>
          {formattedSecs}
        </span>
      </div>

      {isPaused && (
        <span style={{
          fontSize: "9px",
          color: "#ed8936",
          fontWeight: "800",
          letterSpacing: "1px",
          textTransform: "uppercase",
          marginTop: "2px",
          position: "relative",
          zIndex: 2
        }}>
          PAUSED
        </span>
      )}
    </div>
  );
}
