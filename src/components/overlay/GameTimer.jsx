import { useState, useEffect } from "react";
import { eventBus } from "../../core/eventBus";

const TIMER_ALERT_CSS = `
@keyframes cocoTimerHeartbeat {
  0%, 42%, 100% { transform:scale(1); }
  10% { transform:scale(1.045); }
  18% { transform:scale(1); }
  28% { transform:scale(1.045); }
  36% { transform:scale(1); }
}
`;

function normalizeTimer(raw) {
  if (!raw) return null;
  const phase = String(raw.phase || "IDLE").toUpperCase();
  const remainingSeconds = Math.max(0, Number(raw.remainingSeconds) || 0);
  const running = typeof raw.running === "boolean"
    ? raw.running
    : phase === "ROUND" && remainingSeconds > 0;
  return { ...raw, phase, remainingSeconds, running };
}

export function GameTimer({ timer: initialTimer }) {
  const [timer, setTimer] = useState(() => normalizeTimer(initialTimer) || { remainingSeconds: 0, running: false, phase: "IDLE" });

  useEffect(() => {
    const next = normalizeTimer(initialTimer);
    if (next) setTimer(next);
  }, [initialTimer?.remainingSeconds, initialTimer?.phase, initialTimer?.running]);

  useEffect(() => {
    const handleTimerUpdate = payload => {
      const next = normalizeTimer(payload?.timer || payload);
      if (next) setTimer(next);
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
  const alertMode = isRound && isRunning && remainingSeconds <= 300 && remainingSeconds > 0;

  return (
    <div className="timer-container" style={{ width:"112px", minWidth:"112px", height:"58px", flex:"0 0 auto", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"visible", isolation:"isolate" }}>
      <style>{TIMER_ALERT_CSS}</style>
      <div style={{ position:"relative", zIndex:2, display:"flex", alignItems:"center", justifyContent:"center", background:"transparent", padding:"2px 6px", transition:"none" }}>
        <span style={{ fontFamily:"'Trebuchet MS', 'Arial Rounded MT Bold', system-ui, sans-serif", fontSize:alertMode?"38px":"35px", lineHeight:1, fontWeight:900, letterSpacing:"-1.5px", fontVariantNumeric:"tabular-nums", color:alertMode?"#ff1717":(isIntermission?"#ffd166":"#ffffff"), WebkitTextStroke:alertMode?"1.15px #ffffff":"0.5px rgba(0,0,0,.65)", textShadow:alertMode?"2px 2px 0 #000,-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,0 0 8px rgba(255,255,255,.72)":"2px 2px 0 rgba(0,0,0,.8),0 0 8px rgba(0,245,255,.48)", whiteSpace:"nowrap", transformOrigin:"center", animation:alertMode?"cocoTimerHeartbeat 1s ease-in-out infinite":"none" }}>{formatted}</span>
      </div>
    </div>
  );
}
