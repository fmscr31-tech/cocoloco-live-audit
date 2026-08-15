export function TimerControls({ onStart, onResume, onPause, onReset }) {
  return (
    <div style={{background:"#261c3a", padding:"14px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.08)"}}>
      <h3 style={{fontSize:"15px", margin:"0 0 10px 0", color:"#ffd700"}}>⏱️ Temporizador</h3>
      <div style={{display:"flex", gap:"8px", flexWrap:"wrap"}}>
        <button onClick={onStart} style={{background:"#3182ce", color:"white", border:"none", padding:"5px 10px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"12px"}}>
          ▶ Iniciar
        </button>
        <button onClick={onResume} style={{background:"#48bb78", color:"white", border:"none", padding:"5px 10px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"12px"}}>
          ▶ Reanudar
        </button>
        <button onClick={onPause} style={{background:"#ed8936", color:"white", border:"none", padding:"5px 10px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"12px"}}>
          ⏸ Pausar
        </button>
        <button onClick={onReset} style={{background:"#e53e3e", color:"white", border:"none", padding:"5px 10px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"12px"}}>
          🔄 Reiniciar (20m)
        </button>
      </div>
    </div>
  );
}
