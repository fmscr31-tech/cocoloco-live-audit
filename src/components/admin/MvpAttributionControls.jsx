import { useEffect, useState } from "react";
import { registrationManager } from "../../core/registrationManager";
import { commandConfigManager } from "../../core/commandConfigManager";
import { eventBus } from "../../core/eventBus";
import { getRoundContributions, selectWinLimpiaRecipient, selectGiftRecipient } from "../../core/roundContributionManager";

export function MvpAttributionControls() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [pending, setPending] = useState(getRoundContributions());
  const [winPlayerId, setWinPlayerId] = useState("");
  const [giftPlayerId, setGiftPlayerId] = useState("");
  const [feedback, setFeedback] = useState("");

  const refresh = () => {
    setPlayers(registrationManager.getRegisteredPlayers());
    setTeams(commandConfigManager.getConfig().teams || []);
    setPending(getRoundContributions());
  };

  useEffect(() => {
    refresh();
    const events = [
      "registration:updated",
      "registration:player_registered",
      "registration:player_removed",
      "win:correct",
      "ability:started",
      "mvp:contribution_pending",
      "mvp:gift_contribution",
      "mvp:recipient_selected",
      "round:started",
      "round:finished"
    ];
    const unsubs = events.map(name => eventBus.subscribe(name, refresh));
    return () => unsubs.forEach(unsub => unsub && unsub());
  }, []);

  const saveWin = () => {
    if (!winPlayerId) return setFeedback("Selecciona el jugador que recibió la WIN LIMPIA.");
    const result = selectWinLimpiaRecipient(winPlayerId);
    setFeedback(result.success ? `🏆 WIN LIMPIA atribuida a ${result.player.name}.` : "No se pudo atribuir la WIN LIMPIA.");
    refresh();
  };

  const saveGift = () => {
    if (!giftPlayerId) return setFeedback("Selecciona el jugador que debe recibir el crédito del regalo.");
    const giftName = pending.gift?.giftName || "Regalo";
    const result = selectGiftRecipient(giftPlayerId, giftName);
    setFeedback(result.success ? `🎁 ${giftName} atribuido a ${result.player.name}.` : "No se pudo atribuir el regalo.");
    refresh();
  };

  return (
    <div style={{ background:"linear-gradient(135deg,#1b1429,#120d22)", border:"2px solid rgba(255,215,0,.35)", borderRadius:"14px", padding:"18px", color:"white", boxShadow:"0 10px 30px rgba(0,0,0,.45)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"10px", marginBottom:"12px" }}>
        <div>
          <div style={{ color:"#ffd700", fontWeight:950, fontSize:"15px", textTransform:"uppercase" }}>🏆 MVP / APORTE DE RONDA</div>
          <div style={{ color:"#a0aec0", fontSize:"10px", marginTop:"3px" }}>Selecciona exactamente quién aportó la WIN LIMPIA y quién recibe el crédito del regalo.</div>
        </div>
        <button onClick={refresh} style={{ background:"#2d3748", color:"white", border:"1px solid #4a5568", borderRadius:"6px", padding:"6px 9px", fontWeight:800, cursor:"pointer" }}>↻</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:"12px" }}>
        <div style={{ background:"#0c091a", border:"1px solid rgba(72,187,120,.3)", borderRadius:"10px", padding:"12px" }}>
          <div style={{ color:"#68d391", fontWeight:900, fontSize:"11px", textTransform:"uppercase", marginBottom:"7px" }}>👑 WIN LIMPIA</div>
          <select value={winPlayerId} onChange={e=>setWinPlayerId(e.target.value)} style={{ width:"100%", background:"#171326", color:"white", border:"1px solid #4a5568", borderRadius:"6px", padding:"8px", fontWeight:800, fontSize:"11px" }}>
            <option value="">-- Seleccionar jugador --</option>
            {teams.map(team => <optgroup key={team.id} label={team.name}>{players.filter(p=>p.teamId===team.id).map(p=><option key={p.playerId} value={p.playerId}>{p.displayName || p.username}</option>)}</optgroup>)}
          </select>
          <button onClick={saveWin} style={{ width:"100%", marginTop:"8px", background:"linear-gradient(135deg,#48bb78,#38a169)", color:"white", border:"none", borderRadius:"6px", padding:"8px", fontWeight:900, cursor:"pointer" }}>ATRIBUIR WIN LIMPIA</button>
          {pending.winLimpia && <div style={{ marginTop:"7px", fontSize:"10px", color:"#9ae6b4" }}>Actual: <strong>{pending.winLimpia.name}</strong></div>}
        </div>

        <div style={{ background:"#0c091a", border:"1px solid rgba(255,215,0,.3)", borderRadius:"10px", padding:"12px" }}>
          <div style={{ color:"#ffd700", fontWeight:900, fontSize:"11px", textTransform:"uppercase", marginBottom:"7px" }}>🎁 APORTE DEL REGALO</div>
          <div style={{ color:"#a0aec0", fontSize:"10px", marginBottom:"6px" }}>{pending.gift ? `${pending.gift.giftName} detectado` : "Aún no se detecta un regalo en esta ronda."}</div>
          <select value={giftPlayerId} onChange={e=>setGiftPlayerId(e.target.value)} style={{ width:"100%", background:"#171326", color:"white", border:"1px solid #4a5568", borderRadius:"6px", padding:"8px", fontWeight:800, fontSize:"11px" }}>
            <option value="">-- Seleccionar jugador --</option>
            {teams.map(team => <optgroup key={team.id} label={team.name}>{players.filter(p=>p.teamId===team.id).map(p=><option key={p.playerId} value={p.playerId}>{p.displayName || p.username}</option>)}</optgroup>)}
          </select>
          <button onClick={saveGift} style={{ width:"100%", marginTop:"8px", background:"linear-gradient(135deg,#d69e2e,#b7791f)", color:"white", border:"none", borderRadius:"6px", padding:"8px", fontWeight:900, cursor:"pointer" }}>ATRIBUIR REGALO</button>
          {pending.gift && <div style={{ marginTop:"7px", fontSize:"10px", color:"#ffe08a" }}>Actual: <strong>{pending.gift.name}</strong></div>}
        </div>
      </div>

      <div style={{ marginTop:"12px", background:"rgba(0,245,255,.05)", border:"1px solid rgba(0,245,255,.15)", borderRadius:"8px", padding:"8px", fontSize:"10px", color:"#cbd5e0" }}>
        Jugadores inscritos: <strong style={{color:"#fff"}}>{players.length}</strong> · Equipos: <strong style={{color:"#fff"}}>{teams.map(t=>`${t.name}: ${players.filter(p=>p.teamId===t.id).length}`).join(" · ")}</strong>
      </div>
      {feedback && <div style={{ marginTop:"8px", textAlign:"center", color:"#9ae6b4", fontSize:"11px", fontWeight:900 }}>{feedback}</div>}
    </div>
  );
}
