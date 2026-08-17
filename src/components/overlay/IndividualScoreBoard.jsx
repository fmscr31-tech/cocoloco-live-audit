import { useState, useEffect, useRef } from "react";
import { GameTimer } from "./GameTimer";

export function IndividualScoreBoard({ players, timer, roundMvpTitle, donutTeamId, hatTeamId, galaxyTeamId, galaxyPopup, moneyGunTeamId, highlightedPlayerId, showWin, winner }) {
  const sortedPlayers = [...(players || [])].sort((a, b) => (b.points || b.wins || 0) - (a.points || a.wins || 0)).slice(0, 5);
  const [rankDeltas, setRankDeltas] = useState({});
  const prevRanksRef = useRef({});

  useEffect(() => {
    const newRanks = {};
    const deltas = {};
    sortedPlayers.forEach((player, index) => {
      const currentRank = index + 1;
      const prevRank = prevRanksRef.current[player.id];
      if (prevRank !== undefined && prevRank > currentRank) {
        const delta = prevRank - currentRank;
        deltas[player.id] = delta;
        setTimeout(() => setRankDeltas(prev => { const copy = { ...prev }; delete copy[player.id]; return copy; }), 2200);
      }
      newRanks[player.id] = currentRank;
    });
    prevRanksRef.current = newRanks;
    if (Object.keys(deltas).length > 0) setRankDeltas(prev => ({ ...prev, ...deltas }));
  }, [sortedPlayers]);

  const isDonut = !!donutTeamId;
  const isCowboy = !!hatTeamId;
  const isGalaxy = !!galaxyTeamId;
  const isDamaged = !!moneyGunTeamId;
  const winnerName = winner ? (winner.name || winner.username || "JUGADOR") : "";

  return (
    <div className="scoreboard" style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
      <div style={{
        flex: 1,
        background: isDamaged ? "linear-gradient(145deg, rgba(120,30,20,.95), rgba(50,10,10,.98))" : isGalaxy ? "linear-gradient(145deg, rgba(14,65,105,.95), rgba(65,35,90,.98))" : isDonut ? "linear-gradient(145deg, rgba(14,65,105,.95), rgba(20,50,80,.98))" : isCowboy ? "linear-gradient(145deg, rgba(110,55,20,.95), rgba(55,25,10,.98))" : "radial-gradient(circle at 12% 12%, rgba(72,202,228,.2) 0%, transparent 48%), radial-gradient(circle at 88% 88%, rgba(255,183,3,.16) 0%, transparent 52%), linear-gradient(145deg, rgba(12,28,45,.98), rgba(22,20,28,.99))",
        border: isDamaged ? "2px solid #ff3333" : isGalaxy ? "2px solid #7dd3fc" : isDonut ? "2px solid #7dd3fc" : isCowboy ? "2px solid #ff9933" : "1.5px solid rgba(125,211,252,.55)",
        borderRadius: "6px", padding: "6px 8px",
        boxShadow: isDamaged ? "0 0 30px rgba(255,51,51,.9)" : isGalaxy ? "0 0 28px rgba(125,211,252,.45)" : isDonut ? "0 0 22px rgba(125,211,252,.35)" : isCowboy ? "0 0 25px rgba(255,150,50,.55)" : "0 8px 32px rgba(0,0,0,.7), inset 0 1px 2px rgba(255,255,255,.12)",
        animation: isDamaged ? "scoreShake .4s ease-in-out infinite, bulletFlash .3s ease-in-out infinite" : isGalaxy ? "galaxyUltimateCharge 6.5s ease-in-out infinite" : isDonut ? "donutPulse 1.5s infinite ease-in-out" : isCowboy ? "cowboyPulse 1.5s infinite ease-in-out" : undefined,
        backdropFilter: "blur(6px)", overflow: "visible", position: "relative"
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1.5px", background: "linear-gradient(90deg, transparent, rgba(255,209,102,.9), rgba(125,211,252,.8), transparent)", borderRadius: "6px 6px 0 0", pointerEvents: "none" }} />
        <div style={{ fontSize: "8.5px", fontWeight: 900, color: isDamaged ? "#ff6b6b" : "#ffffff", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", textAlign: "center", textShadow: "0 1px 4px rgba(0,0,0,.9)" }}>
          {isDamaged ? "💥 [DESTRUIDO • MONEY GUN] 💥" : isGalaxy ? `🌌 ${galaxyPopup?.sender || "FERNANDO"} • GALAXY 🌌` : isDonut ? "🔇 EL MUDO • RETO ACTIVO" : isCowboy ? "🤠 RETO CREATIVO • MODO ARTISTA" : "TOP PLAYERS"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          {sortedPlayers.length === 0 ? (
            <div style={{ fontSize: "8px", color: "#dbeafe", textAlign: "center", padding: "8px" }}>Sin jugadores registrados</div>
          ) : sortedPlayers.map((player, idx) => {
            const rank = idx + 1;
            const isFirst = rank === 1, isSecond = rank === 2, isThird = rank === 3;
            const isHighlighted = highlightedPlayerId === player.id;
            const hasRankUp = rankDeltas[player.id] !== undefined;
            const deltaVal = rankDeltas[player.id];
            const rankBadge = isFirst ? "🥇 🥥" : isSecond ? "🥈 🌴" : isThird ? "🥉 🌊" : `${rank}️⃣`;
            const borderColor = hasRankUp ? "#39ff88" : isHighlighted ? "#7dd3fc" : isFirst ? "#7dd3fc" : "rgba(148,163,184,.45)";
            const bgGradient = hasRankUp ? "linear-gradient(135deg, rgba(57,255,136,.18), rgba(255,255,255,.96))" : isHighlighted ? "linear-gradient(135deg, rgba(219,234,254,.98), rgba(241,245,249,.98))" : isFirst ? "linear-gradient(135deg, rgba(255,255,255,.98), rgba(226,232,240,.98))" : "linear-gradient(135deg, rgba(248,250,252,.96), rgba(226,232,240,.94))";
            return (
              <div key={player.id || idx} className={`${isHighlighted ? "player-win-highlight" : ""} ${hasRankUp ? "rank-up-highlight" : ""}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: bgGradient, border: `1px solid ${borderColor}`, borderRadius: "4px", padding: isFirst ? "3px 6px" : "2px 5px", boxShadow: hasRankUp ? "0 0 22px rgba(57,255,136,.8)" : isHighlighted ? "0 0 16px rgba(125,211,252,.55)" : isFirst ? "0 0 10px rgba(255,255,255,.18)" : "none", transition: "all .5s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: isFirst ? "10px" : "8.5px", fontWeight: 900 }}>{rankBadge}</span>
                  <span style={{ fontSize: isFirst ? "9.5px" : "8px", fontWeight: 900, color: "#102a43", textTransform: "uppercase", textShadow: "none" }}>{player.name}</span>
                  {hasRankUp && <span className="rank-delta-badge" style={{ marginLeft: "4px" }}>▲ +{deltaVal}</span>}
                </div>
                <div style={{ fontSize: isFirst ? "11px" : "9px", fontWeight: 950, color: isDamaged ? "#b91c1c" : "#102a43", textShadow: "none", letterSpacing: ".2px" }}>
                  {isDamaged ? "0 PTS" : `${player.points || player.wins || 0} PTS`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="center-score">
        <div className="versus" style={{ background: "#0e4169", borderColor: "#7dd3fc", color: "#ffffff" }}>🏖️</div>
        <GameTimer timer={timer} />
      </div>
      {showWin && winner && (
        <div className="celebration" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "linear-gradient(135deg, rgba(255,238,140,.95), rgba(255,183,3,.92), rgba(255,111,97,.95))", backdropFilter: "blur(12px)", border: "1.5px solid rgba(255,255,255,.95)", boxShadow: "0 0 40px rgba(255,183,3,.85), 0 0 15px rgba(255,255,255,.6), inset 0 1px 3px rgba(255,255,255,.95), inset 0 -4px 10px rgba(189,100,20,.8)", padding: "8px 14px", borderRadius: "8px", zIndex: 999, maxWidth: "180px", width: "65%", textAlign: "center", animation: "goldenImpact .3s cubic-bezier(.175,.885,.32,1.275), bannerBreath 4s infinite ease-in-out", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, left: -80, width: "50px", height: "200%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,.9), transparent)", transform: "rotate(25deg)", animation: "goldenShineSweep 2s infinite ease-in-out", pointerEvents: "none", zIndex: 3 }} />
          <div style={{ position: "relative", zIndex: 4 }}>
            <div style={{ fontSize: "18px", lineHeight: "1.2", margin: 0, filter: "drop-shadow(0 2px 6px rgba(0,0,0,.7))", animation: "bounce .5s infinite alternate" }}>🥥 🌴 ☀️ 🏆</div>
            <div style={{ color: "#1a120b", fontSize: "13.5px", fontWeight: 900, textShadow: "0 1px 3px rgba(255,255,255,.9)", margin: "2px 0", textTransform: "uppercase", letterSpacing: "1px" }}>{winnerName}</div>
            <div style={{ fontSize: "6px", fontWeight: 900, color: "#fff", background: "rgba(26,18,11,.9)", padding: "2px 6px", borderRadius: "3px", margin: "2px 0", textTransform: "uppercase", display: "inline-block", boxShadow: "0 0 6px rgba(0,0,0,.5)", letterSpacing: ".8px" }}>CAMPEÓN</div>
          </div>
        </div>
      )}
    </div>
  );
}
