import { useState, useEffect, useRef } from "react";

export function TeamPanel({ team, score, players, round, wrapperClass, isFrozen, roundMvpTitle, frozenDetails, isDamaged, isGalaxyBenefited, galaxyPopup, isDonutActive, isCowboyActive }) {
  if (!team) return null;
  const isRoundActive = round && round.active;

  const topPlayers = (players || [])
    .filter(p => p.teamId === team.id)
    .sort((a, b) => {
      if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0);
      if ((b.wins || 0) !== (a.wins || 0)) return (b.wins || 0) - (a.wins || 0);
      return (b.messages || 0) - (a.messages || 0);
    })
    .slice(0, 10); // Expanded from 3 to 10 visible players per team

  const [rankDeltas, setRankDeltas] = useState({});
  const prevRanksRef = useRef({});

  useEffect(() => {
    const newRanks = {};
    const deltas = {};

    topPlayers.forEach((player, index) => {
      const currentRank = index + 1;
      const prevRank = prevRanksRef.current[player.id];

      if (prevRank !== undefined && prevRank > currentRank) {
        const delta = prevRank - currentRank;
        deltas[player.id] = delta;
        setTimeout(() => {
          setRankDeltas(prev => {
            const copy = { ...prev };
            delete copy[player.id];
            return copy;
          });
        }, 2200);
      }
      newRanks[player.id] = currentRank;
    });

    prevRanksRef.current = newRanks;
    if (Object.keys(deltas).length > 0) {
      setRankDeltas(prev => ({ ...prev, ...deltas }));
    }
  }, [topPlayers]);

  return (
    <div className={`team-wrapper ${wrapperClass}`} style={{ position: "relative" }}>
      {/* TEAM CARD */}
      <div className={`team-card ${isFrozen ? "punished" : ""} ${isDamaged ? "damaged" : ""} ${isDonutActive ? "donut-active" : ""} ${isCowboyActive ? "cowboy-active" : ""} ${isGalaxyBenefited ? "galaxy-active" : ""}`}>
        
        {/* ISOLATED ABILITY LAYERS */}
        {isDamaged && (
          <div className="ability-layer ability-layer-money" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 15% 25%, rgba(255,0,0,0.6) 0%, transparent 35%), radial-gradient(circle at 85% 75%, rgba(255,100,0,0.6) 0%, transparent 35%)", opacity: 0.95 }}></div>
            <div style={{ position: "absolute", top: "5px", left: "10px", fontSize: "11px", transform: "rotate(-12deg)" }}>💥</div>
            <div style={{ position: "absolute", top: "10px", right: "18px", fontSize: "10px", transform: "rotate(25deg)" }}>💥</div>
          </div>
        )}

        {isCowboyActive && (
          <div className="ability-layer ability-layer-cowboy" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4, border: "2px solid #ff6622", borderRadius: "6px", boxShadow: "0 0 15px rgba(255,100,34,0.8)" }}></div>
        )}

        {isDonutActive && (
          <div className="ability-layer ability-layer-donut" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5, border: "2px solid #ff69b4", borderRadius: "6px", boxShadow: "0 0 15px rgba(255,105,180,0.8)" }}></div>
        )}

        {isGalaxyBenefited && (
          <div className="ability-layer ability-layer-galaxy" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6, border: "2px solid #00ffff", borderRadius: "6px", boxShadow: "0 0 18px rgba(0,245,255,0.9)" }}></div>
        )}

        {isFrozen && (
          <div className="ability-layer ability-layer-freeze" style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(white 1.2px, transparent 0), radial-gradient(white 1.8px, transparent 0)",
            backgroundSize: "14px 14px, 22px 22px",
            backgroundPosition: "0 0, 7px 7px",
            opacity: 0.7,
            animation: "snowfall 3.5s linear infinite",
            pointerEvents: "none",
            zIndex: 7,
            border: "2px solid #00f0ff",
            borderRadius: "6px",
            background: "rgba(0,180,216,0.25)"
          }}></div>
        )}

        {/* TOP ROW: TEAM NAME */}
        <div className="team-name" style={{
          color: isFrozen ? "#e0f7ff" : isDamaged ? "#ff9999" : isGalaxyBenefited ? "#00d2ff" : isDonutActive ? "#ffffff" : isCowboyActive ? "#ff9933" : undefined,
          textShadow: isFrozen ? "0 0 8px rgba(0,245,255,0.9)" : isDamaged ? "0 0 10px rgba(255,0,0,0.9)" : isGalaxyBenefited ? "0 0 10px rgba(0,210,255,0.8)" : isDonutActive ? "0 0 10px rgba(255,105,180,0.8)" : isCowboyActive ? "0 0 12px rgba(255,100,34,0.9)" : undefined,
          position: "relative",
          zIndex: 8
        }}>
          {isFrozen ? `❄️ ${team.name} [CONGELADO] ❄️` : isDamaged ? `💥 ${team.name} [DESTRUIDO]` : isGalaxyBenefited ? `🌌 ${team.name} 🌌` : isDonutActive ? `🍩 ${team.name} [EL MUDO]` : isCowboyActive ? `🤠 ${team.name} [RETO]` : team.name}
        </div>

        {/* MIDDLE ROW: TEAM SCORE */}
        <div className={`team-score ${isDonutActive ? "clean-number-pop" : ""}`} style={{
          color: isFrozen ? "#00f0ff" : isDamaged ? "#ff4d4d" : isGalaxyBenefited ? "#ffd700" : isDonutActive ? "#ffeb3b" : isCowboyActive ? "#ffaa33" : undefined,
          textShadow: isFrozen ? "0 0 16px rgba(0,240,255,1)" : isDamaged ? "0 0 18px rgba(255,0,0,1)" : isGalaxyBenefited ? "0 0 15px rgba(255,215,0,0.8)" : isDonutActive ? "0 0 15px rgba(255,105,180,0.8)" : isCowboyActive ? "0 0 20px rgba(255,100,34,1)" : undefined,
          position: "relative",
          zIndex: 8
        }}>
          {score}
        </div>
        
        {/* BOTTOM ROW: ROUNDS BADGE */}
        <div style={{ position: "relative", zIndex: 8, width: "100%", display: "flex", justifyContent: "center", alignItems: "center", boxSizing: "border-box" }}>
          {isFrozen ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
              <div className="freeze-timer-badge">
                <span style={{ fontSize: "11px" }}>❄️ FREEZE:</span>
                <span style={{ color: "#ffffff", fontSize: "12px", marginLeft: "2px" }}>{frozenDetails?.remainingTime || "10"}s</span>
              </div>
            </div>
          ) : (
            <div className={`team-rounds-container ${isGalaxyBenefited ? "galaxy-rounds-boost" : ""}`} style={{
              border: isGalaxyBenefited ? "1.5px solid #00d2ff" : isDonutActive ? "1.5px solid #ff69b4" : isCowboyActive ? "1.5px solid #ff6622" : undefined,
              boxShadow: isGalaxyBenefited ? "0 0 15px rgba(0,210,255,0.6), inset 0 1px 2px rgba(255,255,255,0.5)" : isDonutActive ? "0 0 12px rgba(255,105,180,0.6), inset 0 1px 2px rgba(255,255,255,0.5)" : isCowboyActive ? "0 0 18px rgba(255,100,34,0.9), inset 0 0 8px rgba(255,255,255,0.8)" : undefined,
              background: isGalaxyBenefited ? "linear-gradient(135deg, rgba(0,180,220,0.3), rgba(90,0,180,0.3))" : isDonutActive ? "linear-gradient(135deg, rgba(255,105,180,0.3), rgba(130,15,70,0.3))" : isCowboyActive ? "linear-gradient(135deg, rgba(160,70,20,0.85), rgba(80,30,10,0.85))" : undefined
            }}>
              <span className="rounds-title" style={{ color: isGalaxyBenefited ? "#00d2ff" : isDonutActive ? "#ff69b4" : isCowboyActive ? "#ff9933" : undefined }}>RONDA</span>
              <span className="rounds-digits">{team.wins || 0}</span>
              {isDamaged && <span style={{ fontSize: "5.5px", color: "#ff4d4d", fontWeight: 900, whiteSpace: "nowrap" }}>💥 0 PTS</span>}
              {isGalaxyBenefited && <span style={{ fontSize: "6px", color: "#00d2ff", fontWeight: 900, textShadow: "0 0 4px rgba(0,210,255,0.8)", whiteSpace: "nowrap" }}>⚡</span>}
              {isDonutActive && <span style={{ fontSize: "6px", color: "#ffeb3b", fontWeight: 900, textShadow: "0 0 4px rgba(255,105,180,0.8)", whiteSpace: "nowrap" }}>🍩</span>}
              {isCowboyActive && <span style={{ fontSize: "6px", color: "#ff9933", fontWeight: 900, textShadow: "0 0 6px rgba(255,153,51,1)", whiteSpace: "nowrap" }}>🤠</span>}
            </div>
          )}
        </div>
      </div>

      {/* MVP / PLAYER RANKING BOX (Expanded up to 10 players) */}
      {topPlayers && topPlayers.length > 0 && (
        <div className="players-box" style={{
          position: "relative",
          overflowY: "auto",
          maxHeight: "220px",
          border: isFrozen ? "1.5px solid #00f0ff" : isDamaged ? "1px solid rgba(255,51,51,0.5)" : isGalaxyBenefited ? "1px solid #00d2ff" : isDonutActive ? "1px solid rgba(255,105,180,0.5)" : isCowboyActive ? "1.5px solid #ff6622" : undefined,
          background: isFrozen ? "linear-gradient(145deg, rgba(0, 150, 200, 0.4), rgba(0, 60, 120, 0.6))" : isDamaged ? "linear-gradient(145deg, rgba(50, 15, 15, 0.92), rgba(20, 5, 5, 0.96))" : isGalaxyBenefited ? "linear-gradient(145deg, rgba(0, 30, 90, 0.9), rgba(50, 0, 140, 0.9))" : isDonutActive ? "linear-gradient(145deg, rgba(160, 30, 90, 0.85), rgba(90, 10, 50, 0.85))" : isCowboyActive ? "linear-gradient(145deg, rgba(100, 40, 15, 0.96), rgba(50, 20, 10, 0.96))" : undefined,
          boxShadow: isFrozen ? "0 0 20px rgba(0, 240, 255, 0.6), inset 0 0 10px rgba(255,255,255,0.8)" : isDamaged ? "0 0 15px rgba(255, 51, 51, 0.4)" : isGalaxyBenefited ? "0 0 15px rgba(0, 210, 255, 0.4)" : isDonutActive ? "0 0 12px rgba(255, 105, 180, 0.3)" : isCowboyActive ? "0 0 22px rgba(255, 100, 34, 0.8), inset 0 0 10px rgba(255,255,255,0.7)" : undefined,
          animation: isGalaxyBenefited ? "mvpSlamEntry 0.3s ease forwards" : isCowboyActive ? "cowboyPulse 1.5s infinite ease-in-out" : undefined
        }}>
          {isFrozen && (
            <div className="mvp-ice-layer">
              <div style={{ fontSize: "11px", fontWeight: 900, color: "#00f0ff", textShadow: "0 0 10px rgba(0,240,255,1)", textTransform: "uppercase", letterSpacing: "1px", whiteSpace: "nowrap" }}>
                ❄️ FROZEN / CONGELADO ❄️
              </div>
            </div>
          )}

          {isGalaxyBenefited && galaxyPopup ? (
            <div style={{ padding: "4px 2px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%" }}>
              <div style={{ fontSize: "11.5px", fontWeight: 900, color: "#00d2ff", textShadow: "0 0 8px rgba(0,210,255,0.8)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                ✨ {galaxyPopup.sender} ✨
              </div>
              <div style={{ fontSize: "7.5px", fontWeight: 900, color: "#ffd700", background: "rgba(0,0,0,0.85)", padding: "1.5px 5px", borderRadius: "3px", textTransform: "uppercase", display: "inline-block", boxShadow: "0 0 6px rgba(255,215,0,0.6)", letterSpacing: "0.5px", marginTop: "3px" }}>
                GALAXY • +1 RONDA
              </div>
            </div>
          ) : (
            <>
              <div className="players-title" style={{ color: isFrozen ? "#00f0ff" : isDamaged ? "#ff9999" : isDonutActive ? "#ffeb3b" : isCowboyActive ? "#ff9933" : (roundMvpTitle ? "#00ffcc" : "#ffd700"), position: "relative", zIndex: 2 }}>
                {isFrozen ? "❄️ MVP CONGELADOS" : isDamaged ? "💥 BAJO FUEGO" : isDonutActive ? "🍩 EL MUDO • RETO" : isCowboyActive ? "🤠 RETO CREATIVO" : (roundMvpTitle || "💥 RANKING (TOP 10)")}
              </div>
              {topPlayers.length === 0 ? (
                <div style={{ fontSize: "8.5px", color: "#ffd166", textAlign: "center", padding: "10px 4px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  ⏳ ESPERANDO EQUIPO
                </div>
              ) : (
                topPlayers.map((player, index) => {
                  const rawPoints = player.points || 0;
                  const displayPoints = rawPoints > 0 ? rawPoints : (player.wins || 0);
                  const hasRankUp = rankDeltas[player.id] !== undefined;
                  const deltaVal = rankDeltas[player.id];

                  return (
                    <div key={player.id} className={`gamer-player ${hasRankUp ? "rank-up-highlight" : ""}`} style={{
                      position: "relative",
                      zIndex: 2,
                      background: hasRankUp ? "linear-gradient(135deg, rgba(57, 255, 136, 0.28), rgba(14, 65, 105, 0.3))" : isFrozen ? "rgba(0, 240, 255, 0.1)" : isDamaged ? "rgba(255, 51, 51, 0.08)" : isDonutActive ? "rgba(255, 255, 255, 0.08)" : isCowboyActive ? "rgba(255, 100, 34, 0.08)" : undefined,
                      transition: "all 0.5s ease"
                    }}>
                      <div className="player-position">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}º`}
                        {" "}
                        <span className="player-name" style={{ color: isFrozen ? "#e0f7ff" : isDamaged ? "#ffcccc" : isDonutActive ? "#ffffff" : isCowboyActive ? "#fff2e6" : undefined }}>{player.name}</span>
                        {hasRankUp && <span className="rank-delta-badge" style={{ marginLeft: "4px" }}>▲ +{deltaVal}</span>}
                      </div>
                      <div className="player-points" style={{ color: isFrozen || isGalaxyBenefited ? "#00f0ff" : isDamaged ? "#ff6666" : isDonutActive ? "#ffeb3b" : isCowboyActive ? "#ffaa33" : undefined }}>
                        {displayPoints} pts
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
