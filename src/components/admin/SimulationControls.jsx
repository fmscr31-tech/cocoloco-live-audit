import { useState } from "react";
import { simulationEngine } from "../../core/simulationEngine";
import { runLiveBattleScenario } from "../../core/testScenarios/liveBattleScenario";
import { GIFT_CONFIG } from "../../config/gifts";

export function SimulationControls() {
  const [username, setUsername] = useState("ViewerTest");
  const [chatMsg, setChatMsg] = useState("¡Hola a todos!");
  const [testResult, setTestResult] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const handleRunTest = async () => {
    const res = await runLiveBattleScenario();
    setTestResult(res);
  };

  const triggerAction = (actionName, actionFn) => {
    try {
      actionFn();
      setFeedback(`✅ Simulado: ${actionName} (${username})`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback(`❌ Error simulando ${actionName}`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const giftsList = Object.values(GIFT_CONFIG.GIFTS || {});

  return (
    <div style={{background:"#261c3a", padding:"16px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.08)", marginTop:"16px", boxShadow:"0 4px 15px rgba(0,0,0,0.4)"}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px"}}>
        <h3 style={{fontSize:"15px", margin:0, color:"#00f5ff", textTransform:"uppercase", letterSpacing:"0.5px"}}>
          🧪 Consola Demo & Simulador (Pipeline Real)
        </h3>
        <button onClick={handleRunTest} style={{background:"linear-gradient(135deg, #48bb78, #319795)", color:"white", border:"none", padding:"6px 12px", borderRadius:"6px", fontWeight:800, cursor:"pointer", fontSize:"12px"}}>
          ▶ Ejecutar LIVE Test
        </button>
      </div>

      <div style={{marginBottom:"12px"}}>
        <label style={{fontSize:"10px", color:"#a0aec0", display:"block", marginBottom:"3px"}}>Username Simulado:</label>
        <input
          value={username}
          onChange={e=>setUsername(e.target.value)}
          placeholder="ej. ViewerTest"
          style={{width:"100%", background:"#120d24", border:"1px solid rgba(255,255,255,0.2)", padding:"7px 10px", borderRadius:"6px", color:"white", fontSize:"13px", boxSizing:"border-box"}}
        />
      </div>

      <div style={{marginBottom:"12px"}}>
        <label style={{fontSize:"10px", color:"#a0aec0", display:"block", marginBottom:"4px"}}>Gift Quick-Bar (Catálogo Real):</label>
        <div style={{display:"flex", gap:"6px", flexWrap:"wrap"}}>
          {giftsList.map((g) => (
            <button
              key={g.id}
              onClick={() => triggerAction(`Regalo ${g.name}`, () => simulationEngine.simulateGift(username, g.name, g.diamondValue))}
              style={{background:"linear-gradient(135deg, #dd6b20, #c05621)", color:"white", border:"none", padding:"6px 10px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"11px"}}
            >
              🎁 {g.name} ({g.diamondValue}💎)
            </button>
          ))}
        </div>
      </div>

      <div style={{marginBottom:"12px"}}>
        <label style={{fontSize:"10px", color:"#a0aec0", display:"block", marginBottom:"4px"}}>Interacciones & Chat:</label>
        <div style={{display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"8px"}}>
          <button onClick={()=>triggerAction("Join", ()=>simulationEngine.simulateJoin(username))} style={{background:"#3182ce", color:"white", border:"none", padding:"6px 10px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"11px"}}>
            👋 Join
          </button>
          <button onClick={()=>triggerAction("Follow", ()=>simulationEngine.simulateFollow(username))} style={{background:"#805ad5", color:"white", border:"none", padding:"6px 10px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"11px"}}>
            ⭐ Follow
          </button>
          <button onClick={()=>triggerAction("Share", ()=>simulationEngine.simulateShare(username))} style={{background:"#d69e2e", color:"white", border:"none", padding:"6px 10px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"11px"}}>
            🔄 Share
          </button>
          <button onClick={()=>triggerAction("Like", ()=>simulationEngine.simulateLike(username, 15))} style={{background:"#319795", color:"white", border:"none", padding:"6px 10px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"11px"}}>
            ❤️ Likes (+15)
          </button>
        </div>

        <div style={{display:"flex", gap:"8px"}}>
          <input
            value={chatMsg}
            onChange={e=>setChatMsg(e.target.value)}
            placeholder="Mensaje de chat"
            style={{flex:1, background:"#120d24", border:"1px solid rgba(255,255,255,0.2)", padding:"6px 10px", borderRadius:"6px", color:"white", fontSize:"13px"}}
          />
          <button onClick={()=>triggerAction("Chat", ()=>simulationEngine.simulateChat(username, chatMsg))} style={{background:"#4a5568", color:"white", border:"none", padding:"6px 12px", borderRadius:"6px", fontWeight:700, cursor:"pointer", fontSize:"12px"}}>
            💬 Enviar Chat
          </button>
        </div>
      </div>

      <div>
        <label style={{fontSize:"10px", color:"#a0aec0", display:"block", marginBottom:"4px"}}>Contexto Interactivo:</label>
        <button
          onClick={()=>triggerAction("Interactive Win", ()=>simulationEngine.simulateWin(username))}
          style={{width:"100%", background:"linear-gradient(135deg, #d69e2e, #b7791f)", color:"#000", border:"none", padding:"8px", borderRadius:"6px", fontWeight:800, cursor:"pointer", fontSize:"12px"}}
        >
          🏆 Simular Interactive Win (Victory Trigger)
        </button>
      </div>

      {feedback && (
        <div style={{marginTop:"10px", background:"#120d24", padding:"8px", borderRadius:"6px", fontSize:"11px", color:"#48bb78", fontWeight:700, textAlign:"center"}}>
          {feedback}
        </div>
      )}

      {testResult && (
        <div style={{marginTop:"10px", background:"#120d24", padding:"8px", borderRadius:"6px", fontSize:"11px", color:"#ffd700"}}>
          ✅ Test ejecutado. Participantes: {testResult.participants} | Regalos: {testResult.totalGifts} | Puntos: {testResult.accumulatedPoints}
        </div>
      )}
    </div>
  );
}
