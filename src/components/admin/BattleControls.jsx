export function BattleControls({ battleName, setBattleName, createNewBattle, battle, beginBattle, endBattle }) {
  return (
    <div style={{background:"#261c3a", padding:"14px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.08)"}}>
      <h3 style={{fontSize:"15px", margin:"0 0 10px 0", color:"#ffd700"}}>🎮 Control de Batalla</h3>
      <div style={{display:"flex", gap:"8px", marginBottom:"10px"}}>
        <input
          value={battleName}
          onChange={e=>setBattleName(e.target.value)}
          placeholder="Nombre batalla"
          style={{flex:1, background:"#120d24", border:"1px solid rgba(255,255,255,0.2)", padding:"6px 10px", borderRadius:"6px", color:"white", fontSize:"13px"}}
        />
        <button onClick={createNewBattle} style={{background:"#ff3366", color:"white", border:"none", padding:"6px 12px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"13px"}}>
          Crear
        </button>
      </div>
      {battle && (
        <div style={{background:"#120d24", padding:"10px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.1)"}}>
          <div style={{fontWeight:800, color:"#00f5ff", fontSize:"14px"}}>🔥 {battle.name}</div>
          <div style={{fontSize:"12px", color:"#a0aec0", margin:"4px 0 8px 0"}}>Estado: <span style={{color:"#ffd700"}}>{battle.status}</span></div>
          <div style={{display:"flex", gap:"8px"}}>
            <button onClick={beginBattle} style={{background:"#48bb78", color:"white", border:"none", padding:"5px 10px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"12px"}}>
              ▶ Iniciar
            </button>
            <button onClick={endBattle} style={{background:"#e53e3e", color:"white", border:"none", padding:"5px 10px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"12px"}}>
              ⏹ Finalizar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
