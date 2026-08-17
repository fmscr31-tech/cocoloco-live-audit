import { useState, useEffect } from "react";
import { eventBus } from "../../core/eventBus";

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
  const formattedMins = String(mins).padStart(2, "0");
  const formattedSecs = String(secs).padStart(2, "0");
  const isIntermission = String(timer?.phase || "").toUpperCase() === "INTERMISSION";
  const isFiveMinuteAlert = !isIntermission && remainingSeconds <= 300 && remainingSeconds > 0;
  const isLastMinute = !isIntermission && remainingSeconds <= 60 && remainingSeconds > 0;
  const isPaused = timer?.running === false && remainingSeconds > 0;

  return (
    <div className="timer-container" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <style>{`
        @keyframes cocoTimerDangerPulse { 0%,100% { transform:scale(1); filter:drop-shadow(0 0 3px #7f1d1d) drop-shadow(0 0 8px rgba(185,28,28,.85)); } 50% { transform:scale(1.055); filter:drop-shadow(0 0 5px #7f1d1d) drop-shadow(0 0 12px rgba(185,28,28,1)); } }
        @keyframes cocoTimerSecondsNudge { 0%,100% { transform:translateX(0); } 25% { transform:translateX(-1px); } 75% { transform:translateX(1px); } }
        @keyframes cocoIntermissionPulse { 0%,100% { opacity:.92; } 50% { opacity:1; } }
        div[style*="min-width: 160px"][style*="padding: 12px 24px"] { min-width:80px !important; padding:6px 12px !important; transform:translate(-50%,-50%) scale(.72) !important; transform-origin:center center !important; }
        div[style*="min-width: 160px"][style*="padding: 12px 24px"] > div:first-child { width:24px !important; height:24px !important; }
        div[style*="min-width: 160px"][style*="padding: 12px 24px"] > div:first-child img { width:24px !important; height:24px !important; }
      `}</style>
      {isIntermission && <div style={{fontSize:"9px",lineHeight:1,fontWeight:1000,color:"#ffd166",letterSpacing:"1px",textTransform:"uppercase",marginBottom:"3px",animation:"cocoIntermissionPulse 1s ease-in-out infinite",textShadow:"0 0 8px rgba(255,209,102,.75)"}}>NUEVA RONDA</div>}
      <div className={`timer ${isFiveMinuteAlert?"timer-five-minute-alert":""} ${isLastMinute?"timer-last-minute-alert":""}`} style={{fontSize:isFiveMinuteAlert?"32px":"28px",lineHeight:1,fontWeight:"900",color:isIntermission?"#ffd166":isFiveMinuteAlert?"#ef3030":"#ffffff",WebkitTextStroke:isIntermission?"0.4px #3a2100":isFiveMinuteAlert?"1px #7f1d1d":"0px transparent",textShadow:isIntermission?"0 0 8px rgba(255,209,102,.7)":isFiveMinuteAlert?"0 1px 0 #7f1d1d, 0 0 4px #7f1d1d, 0 0 10px rgba(127,29,29,.95)":"0 0 12px rgba(0,245,255,0.6)",transition:"font-size .25s ease, color .2s ease, text-shadow .2s ease",animation:isFiveMinuteAlert?"cocoTimerDangerPulse 1.05s ease-in-out infinite":isLastMinute?"cocoTimerSecondsNudge .45s ease-in-out infinite":"none",transformOrigin:"center center",whiteSpace:"nowrap"}}>
        <span>{formattedMins}:</span>
        <span style={{color:isLastMinute?"#ef3030":"inherit",WebkitTextStroke:isLastMinute?"1px #7f1d1d":"inherit",display:"inline-block",animation:isLastMinute?"cocoTimerSecondsNudge .45s ease-in-out infinite":"none",textShadow:isLastMinute?"0 1px 0 #7f1d1d, 0 0 5px #7f1d1d, 0 0 11px rgba(127,29,29,.95)":"inherit"}}>{formattedSecs}</span>
      </div>
      {isPaused&&!isIntermission&&<span style={{fontSize:"9px",color:"#ed8936",fontWeight:"800",letterSpacing:"1px",textTransform:"uppercase"}}>PAUSED</span>}
    </div>
  );
}
