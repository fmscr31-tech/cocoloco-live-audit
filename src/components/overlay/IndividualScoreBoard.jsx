import { useState, useEffect, useRef } from "react";
import { GameTimer } from "./GameTimer";

/**
 * Individual ScoreBoard — Minimal branding header ("TOP PLAYERS") with Tropical beach visual design.
 * Preserves 100% of all existing functional logic and props, plus RANK UP visual animations.
 */
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
  }, [sortedPlayers]);

  const isDonut = !!donutTeamId;
  const isCowboy = !!hatTeamId;
  const isGalaxy = !!galaxyTeamId;
  const isDamaged = !!moneyGunTeamId;

  const winnerName = winner ? (winner.name || winner.username || "JUGADOR") : "";

  return (
    <div className="scoreboard" style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
      {/* Top 5 Individual Leaderboard Container with Tropical Beach Identity Theme */}
      <div style={{
        flex: 1,
        background: isDamaged
          ? "linear-gradient(145deg, rgba(120, 30, 20, 0.95), rgba(50, 10, 10, 0.98))"
          : isGalaxy
          ? "linear-gradient(145deg, rgba(14, 65, 105, 0.95), rgba(120, 40, 140, 0.98))"
          : isDonut
          ? "linear-gradient(145deg, rgba(14, 65, 105, 0.95), rgba(20, 50, 80, 0.98))"
          : isCowboy
          ? "linear-gradient(145deg, rgba(140, 60, 20, 0.95), rgba(70, 30, 10, 0.98))"
          : "radial-gradient(circle at 12% 12%, rgba(72, 202, 228, 0.35) 0%, transparent 48%), radial-gradient(circle at 88% 88%, rgba(255, 183, 3, 0.3) 0%, transparent 52%), radial-gradient(circle at 50% 50%, rgba(14, 65, 105, 0.95) 0%, rgba(35, 25, 20, 0.98) 100%)",
        border: isDamaged ? "2px solid #ff3333" : isGalaxy ? "2px solid #48cae4" : isDonut ? "2px solid #48cae4" : isCowboy ? "2px solid #ff9933" : "1.5px solid rgba(224, 169, 109, 0.6)",
        borderRadius: "6px",
        padding: "6px 8px",
        boxShadow: isDamaged ? "0 0 30px rgba(255,51,51,0.9)" : isGalaxy ? "0 0 40px rgba(72,202,228,0.9)" : isDonut ? "0 0 25px rgba(72,202,228,0.8)" : isCowboy ? "0 0 25px rgba(255,150,50,0.8)" : "0 8px 32px rgba(14,25,40,0.85), 0 0 22px rgba(72,202,228,0.25), inset 0 1px 2px rgba(255,220,150,0.4)",
        animation: isDamaged ? "scoreShake 0.4s ease-in-out infinite, bulletFlash 0.3s ease-in-out infinite" : isGalaxy ? "galaxyUltimateCharge 6.5s ease-in-out infinite" : isDonut ? "donutPulse 1.5s infinite ease-in-out" : isCowboy ? "cowboyPulse 1.5s infinite ease-in-out" : undefined,
        backdropFilter: "blur(6px)",
        overflow: "visible",
        position: "relative"
      }}>
        {/* Top tropical sun reflection line */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1.5px",
          background: "linear-gradient(90deg, transparent, rgba(255, 209, 102, 1), rgba(72, 202, 228, 1), transparent)",
          borderRadius: "6px 6px 0 0",
          pointerEvents: "none"
        }}></div>

        <div style={{
          fontSize: "8.5px",
          fontWeight: 900,
          color: isDamaged ? "#ff4d4d" : isGalaxy ? "#ffd166" : isDonut ? "#48cae4" : isCowboy ? "#ffb703" : "#ffd166",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: "4px",
          textAlign: "center",
          textShadow: isDamaged ? "0 0 8px rgba(255,0,0,0.9)" : isGalaxy ? "0 0 10px rgba(72,202,228,1)" : "0 0 10px rgba(255,209,102,0.8)"
        }}>
          {isDamaged ? "💥 [DESTRUIDO • MONEY GUN] 💥" : isGalaxy ? `🌌 ${galaxyPopup?.sender || "FERNANDO"} • GALAXY 🌌` : isDonut ? "🔇 EL MUDO • RETO ACTIVO" : isCowboy ? "🤠 RETO CREATIVO • MODO ARTISTA" : "TOP PLAYERS"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          {sortedPlayers.length === 0 ? (
            <div style={{ fontSize: "8px", color: "#e0a96d", textAlign: "center", padding: "8px" }}>Sin jugadores registrados</div>
          ) : (
            sortedPlayers.map((player, idx) => {
              const rank = idx + 1;
              const isFirst = rank === 1;
              const isSecond = rank === 2;
              const isThird = rank === 3;
              const isHighlighted = highlightedPlayerId === player.id;
              const hasRankUp = rankDeltas[player.id] !== undefined;
              const deltaVal = rankDeltas[player.id];

              const rankBadge = isFirst ? "🥇 🥥" : isSecond ? "🥈 🌴" : isThird ? "🥉 🌊" : `${rank}️⃣`;
              const borderColor = hasRankUp ? "#39ff88" : isHighlighted ? "#48cae4" : isFirst ? "#ffd166" : isSecond ? "#90e0ef" : isThird ? "#e0a96d" : "rgba(224, 169, 109, 0.3)";
              const bgGradient = hasRankUp
                ? "linear-gradient(135deg, rgba(57, 255, 136, 0.28), rgba(14, 65, 105, 0.3))"
                : isHighlighted
                ? "linear-gradient(135deg, rgba(72, 202, 228, 0.35), rgba(14, 65, 105, 0.25))"
                : isFirst
                ? "linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 111, 97, 0.2))"
                : isSecond
                ? "linear-gradient(135deg, rgba(72, 202, 228, 0.22), rgba(14, 65, 105, 0.15))"
                : "rgba(255, 255, 255, 0.05)";

              return (
                <div key={player.id || idx} className={`${isHighlighted ? "player-win-highlight" : ""} ${hasRankUp ? "rank-up-highlight" : ""}`} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: bgGradient,
                  border: `1px solid ${borderColor}`,
                  borderRadius: "4px",
                  padding: isFirst ? "3px 6px" : "2px 5px",
                  boxShadow: hasRankUp ? "0 0 22px rgba(57, 255, 136, 0.9), inset 0 0 10px rgba(57, 255, 136, 0.6)" : isHighlighted ? "0 0 25px rgba(72,202,228,0.85), inset 0 0 10px rgba(255,255,255,0.6)" : isFirst ? "0 0 10px rgba(255,209,102,0.3)" : "none",
                  transition: "all 0.5s ease"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ fontSize: isFirst ? "10px" : "8.5px", fontWeight: 900 }}>{rankBadge}</span>
                    <span style={{ fontSize: isFirst ? "9.5px" : "8px", fontWeight: 900, color: isHighlighted ? "#48cae4" : isFirst ? "#ffd166" : "#ffffff", textTransform: "uppercase" }}>
                      {player.name}
                    </span>
                    {hasRankUp && <span className="rank-delta-badge" style={{ marginLeft: "4px" }}>▲ +{deltaVal}</span>}
                  </div>
                  <div style={{ fontSize: isFirst ? "11px" : "9px", fontWeight: 900, color: isDamaged ? "#ff4d4d" : isGalaxy ? "#ffd166" : isHighlighted ? "#48cae4" : "#48cae4", textShadow: "0 0 6px rgba(72,202,228,0.6)" }}>
                    {isDamaged ? "0 PTS" : `${player.points || player.wins || 0} PTS`}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Center Timer */}
      <div className="center-score">
        <div className="versus" style={{ background: "#0e4169", borderColor: "#48cae4", color: "#ffd166" }}>🏖️</div>
        <GameTimer timer={timer} />
      </div>

      {/* Tropical Champion Celebration Popup */}
      {showWin && winner && (
        <div className="celebration" style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "linear-gradient(135deg, rgba(255, 238, 140, 0.95) 0%, rgba(255, 183, 3, 0.92) 50%, rgba(255, 111, 97, 0.95) 100%)",
          backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(255, 255, 255, 0.95)",
          boxShadow: "0 0 40px rgba(255,183,3,0.85), 0 0 15px rgba(255,255,255,0.6), inset 0 1px 3px rgba(255,255,255,0.95), inset 0 -4px 10px rgba(189,100,20,0.8)",
          padding: "8px 14px",
          borderRadius: "8px",
          zIndex: 999,
          maxWidth: "180px",
          width: "65%",
          textAlign: "center",
          animation: "goldenImpact 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), bannerBreath 4s infinite ease-in-out",
          overflow: "hidden"
        }}>
          {/* Shimmer sweep */}
          <div style={{
            position: "absolute",
            top: -40,
            left: -80,
            width: "50px",
            height: "200%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
            transform: "rotate(25deg)",
            animation: "goldenShineSweep 2s infinite ease-in-out",
            pointerEvents: "none",
            zIndex: 3
          }}></div>

          <div style={{ position: "relative", zIndex: 4 }}>
            <div style={{ fontSize: "18px", lineHeight: "1.2", margin: "0", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))", animation: "bounce 0.5s infinite alternate" }}>🥥 🌴 ☀️ 🏆</div>
            <div style={{ color: "#1a120b", fontSize: "13.5px", fontWeight: 900, textShadow: "0 1px 3px rgba(255,255,255,0.9)", margin: "2px 0", textTransform: "uppercase", letterSpacing: "1px" }}>{winnerName}</div>
            <div style={{ fontSize: "6px", fontWeight: 900, color: "#ffffff", background: "rgba(26, 18, 11, 0.9)", padding: "2px 6px", borderRadius: "3px", margin: "2px 0", textTransform: "uppercase", display: "inline-block", boxShadow: "0 0 6px rgba(0,0,0,0.5)", letterSpacing: "0.8px" }}>CAMPEÓN</div>
          </div>
        </div>
      )}
    </div>
  );
}
