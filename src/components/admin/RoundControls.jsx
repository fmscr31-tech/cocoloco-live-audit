export function RoundControls({ roundName, setRoundName, startNewRound, round }) {
  return (
    <div style={{background:"#261c3a", padding:"14px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.08)"}}>
      <h3 style={{fontSize:"15px", margin:"0 0 10px 0", color:"#ffd700"}}>⚔️ Control de Ronda</h3>
      <div style={{display:"flex", gap:"8px", marginBottom:"10px"}}>
        <input
          value={roundName}
          onChange={e=>setRoundName(e.target.value)}
          placeholder="Nombre de la ronda"
          style={{flex:1, background:"#120d24", border:"1px solid rgba(255,255,255,0.2)", padding:"6px 10px", borderRadius:"6px", color:"white", fontSize:"13px"}}
        />
        <button onClick={startNewRound} style={{background:"#ff3366", color:"white", border:"none", padding:"6px 12px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"13px"}}>
          Iniciar
        </button>
      </div>
      {round && (
        <div style={{background:"#120d24", padding:"10px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.1)"}}>
          <div style={{fontWeight:800, color:"#00f5ff", fontSize:"14px"}}>⚔️ {round.name}</div>
          <div style={{fontSize:"12px", color:"#a0aec0", margin:"2px 0 0 0"}}>Estado: <span style={{color:"#ffd700"}}>{round.status}</span></div>
        </div>
      )}
    </div>
  );
}
