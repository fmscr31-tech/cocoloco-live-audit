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
  const paused = isRound && !isRunning && remainingSeconds > 0;

  return (
    <div className="timer-container" style={{ width:"112px", minWidth:"112px", height:"58px", flex:"0 0 auto", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"visible", isolation:"isolate" }}>
      <div style={{ position:"relative", zIndex:2, display:"flex", alignItems:"center", justifyContent:"center", background:"transparent", animation:"none", transform:"none", padding:"2px 6px", transition:"none" }}>
        <span style={{ fontFamily:"'Trebuchet MS', 'Arial Rounded MT Bold', system-ui, sans-serif", fontSize:"35px", lineHeight:1, fontWeight:900, letterSpacing:"-1.5px", fontVariantNumeric:"tabular-nums", color:isIntermission?"#ffd166":"#ffffff", WebkitTextStroke:"0.5px rgba(0,0,0,.65)", textShadow:"2px 2px 0 rgba(0,0,0,.8), 0 0 8px rgba(0,245,255,.48)", whiteSpace:"nowrap" }}>{formatted}</span>
      </div>
      {paused && <span style={{ position:"absolute", bottom:"-9px", fontSize:"7px", fontWeight:900, letterSpacing:".8px", color:"#ffd166", textTransform:"uppercase", zIndex:4, textShadow:"0 1px 3px rgba(0,0,0,.9)" }}>PAUSED</span>}
    </div>
  );
}
