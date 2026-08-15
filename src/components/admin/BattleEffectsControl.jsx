import { useState } from "react";
import { simulationEngine } from "../../core/simulationEngine";

export function BattleEffectsControl() {
  const [username, setUsername] = useState("Pablo");

  return (
    <div style={{background:"#261c3a", padding:"14px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.08)", marginTop:"16px"}}>
      <h3 style={{fontSize:"15px", margin:"0 0 10px 0", color:"#00f5ff"}}>❄️ Efectos de Batalla (Freeze)</h3>
      <div style={{display:"flex", gap:"8px", marginBottom:"10px"}}>
        <input
          value={username}
          onChange={e=>setUsername(e.target.value)}
          placeholder="Jugador activador (ej. Pablo)"
          style={{flex:1, background:"#120d24", border:"1px solid rgba(255,255,255,0.2)", padding:"6px 10px", borderRadius:"6px", color:"white", fontSize:"13px"}}
        />
      </div>
      <div style={{display:"flex", gap:"8px", flexWrap:"wrap"}}>
        <button onClick={()=>simulationEngine.simulateGift(username, "STAR", 1)} style={{background:"#00bfff", color:"#000", border:"none", padding:"6px 12px", borderRadius:"6px", fontWeight:800, cursor:"pointer", fontSize:"12px"}}>
          🎁 Enviar STAR (Freeze / Contraataque)
        </button>
      </div>
    </div>
  );
}
