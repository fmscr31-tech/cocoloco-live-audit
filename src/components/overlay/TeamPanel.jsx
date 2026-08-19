import { useState, useEffect, useRef } from "react";
import { getPlayerMvpRounds, getPlayerContributionPoints, getMvpLeaderboard } from "../../core/mvpLeaderboardManager";
import { eventBus } from "../../core/eventBus";
import { commandConfigManager } from "../../core/commandConfigManager";

function FloatingGirlsDecor() {
  const boxRef = useRef(null);
  const itemsRef = useRef([
    { icon: "♥", x: 4, y: 12, vx: 0.48, vy: 0.22, size: 30, color: "#ffb7dd", glow: "#ff359d" },
    { icon: "✿", x: 72, y: 70, vx: -0.36, vy: 0.31, size: 34, color: "#ffe66d", glow: "#ff4aa8" },
    { icon: "❀", x: 38, y: 25, vx: 0.29, vy: -0.34, size: 31, color: "#9eeaff", glow: "#ff43a7" },
    { icon: "♡", x: 82, y: 42, vx: -0.43, vy: -0.19, size: 27, color: "#ff8fc9", glow: "#ff2f9d" },
    { icon: "✾", x: 18, y: 76, vx: 0.34, vy: -0.28, size: 29, color: "#fff09a", glow: "#6edcff" }
  ]);
  const [, forceFrame] = useState(0);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    let raf = 0;
    let last = performance.now();
    const tick = now => {
      const dt = Math.min(32, now - last);
      last = now;
      itemsRef.current.forEach((item, index) => {
        const t = now / 1000 + index * 1.7;
        item.vx += Math.sin(t * (0.22 + index * 0.013)) * 0.00016;
        item.vy += Math.cos(t * (0.19 + index * 0.011)) * 0.00016;
        const speed = Math.hypot(item.vx, item.vy) || 1;
        const targetSpeed = 0.075 + (index % 3) * 0.012;
        item.vx = (item.vx / speed) * targetSpeed;
        item.vy = (item.vy / speed) * targetSpeed;
        item.x += item.vx * dt / 20;
        item.y += item.vy * dt / 20;
        const pad = 4;
        const maxX = 100 - pad;
        const maxY = 100 - pad;
        if (item.x <= pad) { item.x = pad; item.vx = Math.abs(item.vx) * 0.98; }
        if (item.x >= maxX) { item.x = maxX; item.vx = -Math.abs(item.vx) * 0.98; }
        if (item.y <= pad) { item.y = pad; item.vy = Math.abs(item.vy) * 0.98; }
        if (item.y >= maxY) { item.y = maxY; item.vy = -Math.abs(item.vy) * 0.98; }
      });
      forceFrame(v => (v + 1) % 2);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div ref={boxRef} aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
    {itemsRef.current.map((item, index) => <span key={`${item.icon}-${index}`} style={{ position: "absolute", left: `${item.x}%`, top: `${item.y}%`, transform: "translate(-50%,-50%)", fontSize: `${item.size}px`, lineHeight: 1, color: item.color, fontWeight: 900, opacity: .9, textShadow: `0 0 5px ${item.glow},0 0 12px ${item.glow},0 0 22px rgba(255,220,120,.45)`, willChange: "left,top" }}>{item.icon}</span>)}
  </div>;
}

export function TeamPanel({ team, score, players, round, wrapperClass, isFrozen, roundMvpTitle, frozenDetails, isDamaged, isGalaxyBenefited, galaxyPopup, isDonutActive, isCowboyActive }) {
  if (!team) return null;
  const config = commandConfigManager.getConfig();
  const configuredTeam = (config?.teams || []).find(t => String(t.id) === String(team.id)) || {};
  const displayTeam = { ...configuredTeam, ...team, name: team.name || configuredTeam.name || "Equipo" };
  const configuredCommands = Array.isArray(displayTeam.commands) ? displayTeam.commands.filter(Boolean).map(v => String(v).trim()).filter(Boolean) : [];
  const commandPrompt = configuredCommands[0] || String(displayTeam.command || displayTeam.joinCommand || displayTeam.registrationCommand || displayTeam.entryCommand || "").trim();
  const topPlayers = (players || []).filter(p => p.teamId === team.id).sort((a,b) => (b.points||0)-(a.points||0) || (b.wins||0)-(a.wins||0) || (b.messages||0)-(a.messages||0)).slice(0,10);
  const winMvpId = round?.contributions?.winLimpia?.playerId || null;
  const giftMvpId = round?.contributions?.gift?.playerId || null;
  const [mvpRefresh, setMvpRefresh] = useState(0);
  const [rankDeltas, setRankDeltas] = useState({});
  const prevRanksRef = useRef({});

  const teamLabel = String(displayTeam.name || "").toLowerCase();
  const teamGender = String(displayTeam.gender || displayTeam.genderType || displayTeam.genderRole || displayTeam.sex || "").toLowerCase();
  const teamMode = String(displayTeam.mode || displayTeam.gameMode || displayTeam.gameModeId || displayTeam.variant || displayTeam.type || displayTeam.category || displayTeam.teamMode || "").toUpperCase();
  const isGenderBattle = teamMode.includes("GENDER") || teamMode.includes("CHICOS") || teamMode.includes("CHICAS") || teamGender.length > 0 || /\b(chico|chicos|chica|chicas|hombre|hombres|mujer|mujeres|masculino|femenino)\b/.test(teamLabel);
  const isGirlsTeam = isGenderBattle && (teamGender.includes("female") || teamGender.includes("woman") || teamGender.includes("mujer") || teamGender.includes("femen") || /\b(chica|chicas|mujer|mujeres|femenino|femenina)\b/.test(teamLabel));
  const isBoysTeam = isGenderBattle && !isGirlsTeam && (teamGender.includes("male") || teamGender.includes("man") || teamGender.includes("hombre") || teamGender.includes("mascul") || /\b(chico|chicos|hombre|hombres|masculino|masculina)\b/.test(teamLabel));
  const genderTheme = isGirlsTeam ? { border: "rgba(255,106,181,.98)", glow: "rgba(255,91,174,.7)" } : isBoysTeam ? { border: "rgba(78,210,255,.98)", glow: "rgba(31,159,232,.72)" } : null;
  const commandColor = isGirlsTeam ? "#a21caf" : isBoysTeam ? "#075985" : "#0b63ce";

  const mvpLeaderboard = getMvpLeaderboard();
  const teamMvpPlayers = isGenderBattle
    ? mvpLeaderboard
        .filter(player => String(player.teamId || "") === String(team.id))
        .filter(player => Number(player.contributionPoints || 0) > 0)
        .slice(0, 10)
    : [];
  const visiblePlayers = isGenderBattle ? teamMvpPlayers : topPlayers;

  useEffect(() => {
    const unsubs = ["mvp:recipient_selected","mvp:contribution_pending","mvp:gift_contribution","round:finished"].map(name => eventBus.subscribe(name, () => setMvpRefresh(v => v + 1)));
    return () => unsubs.forEach(u => u?.());
  }, []);

  useEffect(() => {
    const next = {};
    const deltas = {};
    visiblePlayers.forEach((player,index) => {
      const previous = prevRanksRef.current[player.id];
      if (previous !== undefined && previous > index + 1) deltas[player.id] = previous - (index + 1);
      next[player.id] = index + 1;
    });
    prevRanksRef.current = next;
    if (Object.keys(deltas).length) setRankDeltas(deltas);
  }, [visiblePlayers, mvpRefresh]);

  const name = displayTeam.name;
  const nameText = isFrozen ? `❄️ ${name} [CONGELADO] ❄️` : isDamaged ? `💥 ${name} [DESTRUIDO]` : isGalaxyBenefited ? `🌌 ${name} 🌌` : isDonutActive ? `🍩 ${name} [EL MUDO]` : isCowboyActive ? `🤠 ${name} [RETO]` : name;
  const commandVisible = !!commandPrompt;
  const teamNameStyle = { color: isGirlsTeam ? "#ff4fa6" : isBoysTeam ? "#8feaff" : "#fff", WebkitTextStroke: isGirlsTeam ? "1px #70123f" : isBoysTeam ? "1px #063b67" : "1px rgba(0,0,0,.5)", fontFamily: isGirlsTeam || isBoysTeam ? '"Siller", "Arial Rounded MT Bold", "Arial Black", Impact, sans-serif' : undefined, fontWeight: 950, fontSize: "16px", letterSpacing: ".45px", lineHeight: 1.05, textAlign: "center", position: "relative", zIndex: 20, minHeight: "38px", height: "38px", flex: "0 0 38px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", width: "100%", overflow: "hidden", textShadow: isGirlsTeam ? "0 2px 0 #4b092b,0 0 8px rgba(255,159,211,.85)" : isBoysTeam ? "0 2px 0 #031d34,0 0 8px rgba(135,235,255,.8)" : "0 2px 5px #000" };
  const commandStyle = { color: "#050505", background: "rgba(255,255,255,.97)", border: `2px solid ${genderTheme?.border || "rgba(0,0,0,.35)"}`, borderRadius: "6px", padding: "2px 6px", fontSize: "7.5px", lineHeight: "10px", fontWeight: 950, letterSpacing: ".15px", textTransform: "uppercase", whiteSpace: "nowrap", maxWidth: "100%", boxSizing: "border-box", overflow: "hidden", textOverflow: "ellipsis", boxShadow: "0 1px 4px rgba(0,0,0,.35)", flex: "0 0 14px" };

  return <div className={`team-wrapper ${wrapperClass} ${isGenderBattle ? "gender-team-wrapper" : ""} ${isGirlsTeam ? "gender-girls" : ""} ${isBoysTeam ? "gender-boys" : ""}`} style={{ position:"relative" }}>
    <div className={`team-card ${isFrozen?"punished":""} ${isDamaged?"damaged":""} ${isDonutActive?"donut-active":""} ${isCowboyActive?"cowboy-active":""} ${isGalaxyBenefited?"galaxy-active":""}`} style={{ position:"relative", overflow:"hidden" }}>
      {isGirlsTeam && <FloatingGirlsDecor />}
      {isDamaged && <div className="ability-layer ability-layer-money" style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:3,overflow:"hidden"}}><div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 15% 25%,rgba(255,0,0,.6),transparent 35%),radial-gradient(circle at 85% 75%,rgba(255,100,0,.6),transparent 35%)"}}/></div>}
      {isCowboyActive && <div className="ability-layer ability-layer-cowboy" style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:4,border:"2px solid #ff6622",borderRadius:"6px",boxShadow:"0 0 15px rgba(255,100,34,.8)"}}/>}
      {isDonutActive && <div className="ability-layer ability-layer-donut" style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:5,border:"2px solid #ff69b4",borderRadius:"6px",boxShadow:"0 0 15px rgba(255,105,180,.8)"}}/>}
      {isGalaxyBenefited && <div className="ability-layer ability-layer-galaxy" style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:6,border:"2px solid #00ffff",borderRadius:"6px",boxShadow:"0 0 18px rgba(0,245,255,.9)"}}/>}
      {isFrozen && <div className="ability-layer ability-layer-freeze" style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:7,border:"2px solid #00f0ff",borderRadius:"6px",background:"rgba(0,180,216,.25)"}}/>}

      <div className="team-name" style={teamNameStyle}>
        <span style={{height:"20px",minHeight:"20px",lineHeight:"20px",display:"block",flex:"0 0 20px"}}>{nameText}</span>
        <span style={{height:"14px",minHeight:"14px",display:"flex",alignItems:"center",justifyContent:"center",flex:"0 0 14px",width:"100%",visibility:commandVisible?"visible":"hidden"}}>{commandVisible && <>ESCRIBE <strong style={{color:commandColor,fontWeight:1000,margin:"0 2px"}}>{commandPrompt}</strong> PARA UNIRTE A TU EQUIPO</>}</span>
      </div>

      <div className={`team-score ${isDonutActive ? "clean-number-pop" : ""}`} style={{color:"#fff",position:"relative",zIndex:20,textShadow:isFrozen?"0 0 16px #00f0ff":isDamaged?"0 0 18px red":isGalaxyBenefited?"0 0 15px #fff":isDonutActive?"0 0 15px #ff69b4":isCowboyActive?"0 0 20px #ff6422":"0 2px 8px #000"}}>{score}</div>
      <div style={{position:"relative",zIndex:20,width:"100%",display:"flex",justifyContent:"center"}}>
        {isFrozen ? <div className="freeze-timer-badge">❄️ FREEZE: {frozenDetails?.remainingTime || "10"}s</div> : <div className={`team-rounds-container ${isGalaxyBenefited?"galaxy-rounds-boost":""}`} style={{position:"relative",display:"flex",justifyContent:"center",alignItems:"center",gap:"3px",minHeight:"18px",padding:"2px 7px",borderRadius:"5px",overflow:"hidden"}}><span className="rounds-title">RONDA</span><span className="rounds-digits">{displayTeam.wins || team.wins || 0}</span></div>}
      </div>
    </div>

    {visiblePlayers.length > 0 && <div className="players-box" style={{position:"relative",zIndex:10,overflowY:visiblePlayers.length > 5 ? "auto" : "hidden",maxHeight:"220px"}}>
      {isGalaxyBenefited && galaxyPopup ? <div style={{padding:"8px",textAlign:"center"}}><div style={{fontSize:"11.5px",fontWeight:900,color:"#fff"}}>✨ {galaxyPopup.sender} ✨</div><div style={{fontSize:"7.5px",fontWeight:900,color:"#fff"}}>GALAXY • +1 RONDA</div></div> : <>
        <div className="players-title">{isFrozen ? "❄️ MVP CONGELADOS" : isDamaged ? "💥 BAJO FUEGO" : isDonutActive ? "🍩 EL MUDO • RETO" : isCowboyActive ? "🤠 RETO CREATIVO" : (isGenderBattle ? `🏆 MVPs ${isGirlsTeam ? "CHICAS" : isBoysTeam ? "CHICOS" : "EQUIPO"}` : (roundMvpTitle || "🏆 MVPS (TOP 10)"))}</div>
        {visiblePlayers.map((player,index) => {
          const id = player.id || player.playerId || player.tiktokId || player.username;
          const mvpRounds = getPlayerMvpRounds(id);
          const contributionPoints = Number(player.contributionPoints || getPlayerContributionPoints(id) || 0);
          const isWinMvp = String(id) === String(winMvpId);
          const isGiftMvp = String(id) === String(giftMvpId);
          return <div key={id} className="gamer-player" style={{position:"relative",zIndex:2}}><div className="player-position">{index<3?["🥇","🥈","🥉"][index]:`${index+1}º`} <span className="player-name">{player.name}</span>{mvpRounds>0&&<span style={{marginLeft:4,fontSize:8}}>🏆 {mvpRounds}</span>}{contributionPoints>0&&<span style={{marginLeft:4,fontSize:7}}>💠 +{contributionPoints} APORTE</span>}{isWinMvp&&<span style={{marginLeft:4,fontSize:8,color:"#15803d"}}>👑 WIN</span>}{isGiftMvp&&<span style={{marginLeft:4,fontSize:8}}>MVP</span>}{rankDeltas[id]&&<span style={{marginLeft:4}}>▲ +{rankDeltas[id]}</span>}</div><div className="player-points">{isGenderBattle ? `${contributionPoints} aporte${contributionPoints === 1 ? "" : "s"}` : `${player.points || player.wins || 0} pts`}</div></div>;
        })}
      </>}
    </div>}
  </div>;
}
