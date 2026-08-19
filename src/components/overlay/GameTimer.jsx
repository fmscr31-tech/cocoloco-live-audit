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

export function GameTimer({ timer: initialTimer }) {
  const [timer, setTimer] = useState(initialTimer || { remainingSeconds: 0, running: false, phase: "IDLE" });
  useEffect(() => { if (initialTimer) setTimer(initialTimer); }, [initialTimer?.remainingSeconds, initialTimer?.phase, initialTimer?.running]);
  useEffect(() => {
    const handleTimerUpdate = payload => { const t = payload?.timer || payload; if (t) setTimer(t); };
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
  const paused = isRound && !isRunning && remainingSeconds > 0;
  const alertMode = isRound && isRunning && remainingSeconds <= 300 && remainingSeconds > 0;
  return (
    <div className="timer-container" style={{ width:"112px", minWidth:"112px", height:"58px", flex:"0 0 auto", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"visible", isolation:"isolate" }}>
      <style>{TIMER_ALERT_CSS}</style>
      <div style={{ position:"relative", zIndex:2, display:"flex", alignItems:"center", justifyContent:"center", background:"transparent", padding:"2px 6px", transition:"none" }}>
        <span style={{ fontFamily:"'Trebuchet MS', 'Arial Rounded MT Bold', system-ui, sans-serif", fontSize:alertMode?"38px":"35px", lineHeight:1, fontWeight:900, letterSpacing:"-1.5px", fontVariantNumeric:"tabular-nums", color:alertMode?"#ff1717":(isIntermission?"#ffd166":"#ffffff"), WebkitTextStroke:alertMode?"1.15px #ffffff":"0.5px rgba(0,0,0,.65)", textShadow:alertMode?"2px 2px 0 #000,-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,0 0 8px rgba(255,255,255,.72)":"2px 2px 0 rgba(0,0,0,.8),0 0 8px rgba(0,245,255,.48)", whiteSpace:"nowrap", transformOrigin:"center", animation:alertMode?"cocoTimerHeartbeat 1s ease-in-out infinite":"none" }}>{formatted}</span>
      </div>
      {paused && <span style={{ position:"absolute", bottom:"-9px", fontSize:"7px", fontWeight:900, letterSpacing:".8px", color:"#ffd166", textTransform:"uppercase", zIndex:4, textShadow:"0 1px 3px rgba(0,0,0,.9)" }}>PAUSED</span>}
    </div>
  );
}