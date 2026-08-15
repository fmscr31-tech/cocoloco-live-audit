import { useState, useEffect } from "react";
import { GameTimer } from "./GameTimer";
import { InformationRotationPanel } from "./InformationRotationPanel";
import { CocoDanceZone } from "./CocoDanceZone";
import { eventBus } from "../../core/eventBus";
import { GIFT_ABILITY_MAP } from "../../config/giftAbilityMap";
import { ABILITY_REGISTRY } from "../../config/abilityRegistry";
import { resolveCanonicalGiftId } from "../../config/canonicalGifts";
import { GiftImage } from "../common/GiftImage";

/**
 * Individual Panel v3 — COCOLOCO BEACH / TROPICAL GAME SHOW Identity Edition
 * Header updated to minimal "TOP PLAYERS" per branding guidelines.
 * Preserves 100% of all existing functional logic, events, scores, and state.
 */
export function IndividualPanel({ players, timer, round, roundMvpTitle, donutTeamId, hatTeamId, galaxyTeamId, galaxyPopup, moneyGunTeamId, frozenTeamId, frozenDetails, highlightedPlayerId, showWin, winner, onTestWin, battleEffects }) {
  const [internalShowWin, setInternalShowWin] = useState(false);
  const [recentScoredPlayerId, setRecentScoredPlayerId] = useState(null);

  const isRoundActive = round && round.active;

  // Live Activity Queue
  const [activityQueue, setActivityQueue] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);

  useEffect(() => {
    if (activityQueue.length > 0 && !currentEvent) {
      const nextItem = activityQueue[0];
      setCurrentEvent(nextItem);
      const timerId = setTimeout(() => {
        setActivityQueue(prev => prev.slice(1));
        setCurrentEvent(null);
      }, 4000);
      return () => clearTimeout(timerId);
    }
  }, [activityQueue, currentEvent]);

  const enqueueActivity = (eventData) => {
    setActivityQueue(prev => [...prev, { id: Date.now() + Math.random(), ...eventData }]);
  };

  useEffect(() => {
    const handleScoreUpdated = (data) => {
      if (data && data.playerId) {
        setRecentScoredPlayerId(data.playerId);
        const timerId = setTimeout(() => {
          setRecentScoredPlayerId(null);
        }, 1500);
        return () => clearTimeout(timerId);
      }
    };

    const handleGiftNotification = (item) => {
      const donorName = (item.sender || item.username || "ESPECTADOR").toUpperCase();
      const rawGiftName = item.sourceGift || item.giftName || "Donut";
      const mapping = GIFT_ABILITY_MAP.find(m =>
        m.giftId.toLowerCase() === rawGiftName.toLowerCase() ||
        m.giftName.toLowerCase() === rawGiftName.toLowerCase() ||
        (m.aliases && m.aliases.some(a => a.toLowerCase() === rawGiftName.toLowerCase()))
      );

      const abilityId = mapping ? mapping.abilityId : (item.abilityId || "silent_challenge");
      const registryEntry = ABILITY_REGISTRY[abilityId] || {
        display: { name: "El Mudo", icon: "🍩" },
        scoreAction: { type: "ADD_POINTS", value: 1 }
      };

      const giftIcon = registryEntry.display.icon || "🍩";
      const giftName = (mapping ? mapping.giftName : rawGiftName).toUpperCase();
      const abilityName = (registryEntry.display.name || "El Mudo").toUpperCase();

      let effectText = "+1 PUNTO";
      if (registryEntry.scoreAction?.type === "ADD_ROUND") effectText = "+1 RONDA";
      else if (registryEntry.scoreAction?.type === "RESET_SCORE") effectText = "IMPACTO ÉPICO";
      else if (abilityId === "silent_challenge") effectText = "+1 PUNTO";
      else if (abilityId === "creative_challenge") effectText = "RETO CREATIVO";

      enqueueActivity({
        type: "GIFT",
        headerIcon: giftIcon,
        headerTitle: giftName,
        donorName,
        effectText,
        abilityName: `⚡ ${abilityName}`
      });
    };

    const handleWinNotification = (data) => {
      const playerName = (data.name || data.username || data.player?.name || "JUGADOR").toUpperCase();
      const pointsVal = data.points || data.player?.points || 100;
      const teamName = data.teamName || data.team || "";
      if (data.playerId || data.id) {
        setRecentScoredPlayerId(data.playerId || data.id);
        setTimeout(() => setRecentScoredPlayerId(null), 1500);
      }
      enqueueActivity({
        type: "WIN_LIMPIA",
        headerIcon: "✨",
        headerTitle: "WIN LIMPIA",
        donorName: `🥥 ${playerName}`,
        effectText: `+${pointsVal} PTS`,
        abilityName: teamName ? `🏆 ${teamName}` : "¡RESPUESTA CORRECTA!"
      });
    };

    const handleWinnerNotification = (data) => {
      const winnerName = (data.name || data.username || "CAMPEÓN").toUpperCase();
      enqueueActivity({
        type: "WINNER",
        headerIcon: "👑",
        headerTitle: "CAMPEÓN",
        donorName: winnerName,
        effectText: "VICTORIA SUPREMA",
        abilityName: "¡GANADOR!"
      });
    };

    const unsubScore = eventBus.subscribe("game:score_updated", handleScoreUpdated);
    const unsubAbility = eventBus.subscribe("ability:started", handleGiftNotification);
    const unsubDispatched = eventBus.subscribe("gift:action_dispatched", (data) => {
      handleGiftNotification({
        sender: data.sender || data.username,
        sourceGift: data.gift?.name || data.giftName,
        abilityId: data.abilityId
      });
    });
    const unsubReward = eventBus.subscribe("reward:processed", (e) => {
      handleGiftNotification({
        sender: e.username || e.sender,
        giftName: e.giftName,
        abilityId: e.giftName
      });
    });
    const unsubWin = eventBus.subscribe("win:correct", handleWinNotification);
    const unsubPlayerWin = eventBus.subscribe("PLAYER_WIN", (e) => handleWinnerNotification(e.data || e));

    return () => {
      unsubScore();
      unsubAbility();
      unsubDispatched();
      unsubReward();
      unsubWin();
      unsubPlayerWin();
    };
  }, []);

  const sourcePlayers = players || [];
  const sortedPlayers = [...sourcePlayers].sort((a, b) => {
    const ptsB = b.points || b.wins || 0;
    const ptsA = a.points || a.wins || 0;
    if (ptsB !== ptsA) return ptsB - ptsA;
    return (b.messages || 0) - (a.messages || 0);
  }).slice(0, 5);

  const topPlayer = sortedPlayers[0] || { name: "ESPERANDO...", points: 0, wins: 0 };
  const effectiveWinner = winner || { name: topPlayer.name, points: topPlayer.points || topPlayer.wins || 0 };
  const winnerName = effectiveWinner.name || effectiveWinner.username || "JUGADOR";
  const effectiveShowWin = showWin || internalShowWin;

  const handleTestWinnerClick = () => {
    setInternalShowWin(true);
    if (onTestWin) onTestWin();
    setTimeout(() => setInternalShowWin(false), 5000);
  };

  const isDonut = !!donutTeamId;
  const isCowboy = !!hatTeamId;
  const isGalaxy = !!galaxyTeamId;
  const isDamaged = !!moneyGunTeamId;
  const isFrozen = !!frozenTeamId;

  return (
    <div className="scoreboard" style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", width: "100%", boxSizing: "border-box" }}>
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
          : isFrozen
          ? "linear-gradient(145deg, rgba(0, 150, 200, 0.4), rgba(0, 60, 120, 0.6))"
          : "radial-gradient(circle at 12% 12%, rgba(72, 202, 228, 0.35) 0%, transparent 48%), radial-gradient(circle at 88% 88%, rgba(255, 183, 3, 0.3) 0%, transparent 52%), radial-gradient(circle at 50% 50%, rgba(14, 65, 105, 0.95) 0%, rgba(35, 25, 20, 0.98) 100%)",
        border: isDamaged ? "2px solid #ff3333" : isGalaxy ? "2px solid #48cae4" : isDonut ? "2px solid #48cae4" : isCowboy ? "2px solid #ff9933" : isFrozen ? "1.5px solid #00f0ff" : "1.5px solid rgba(224, 169, 109, 0.6)",
        borderRadius: "6px",
        padding: "6px 8px",
        boxShadow: isDamaged ? "0 0 30px rgba(255,51,51,0.9)" : isGalaxy ? "0 0 40px rgba(72,202,228,0.9)" : isDonut ? "0 0 25px rgba(72,202,228,0.8)" : isCowboy ? "0 0 25px rgba(255,150,50,0.8)" : isFrozen ? "0 0 20px rgba(0,240,255,0.6)" : "0 8px 32px rgba(14,25,40,0.85), 0 0 22px rgba(72,202,228,0.25), inset 0 1px 2px rgba(255,220,150,0.4)",
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
          color: isDamaged ? "#ff4d4d" : isGalaxy ? "#ffd166" : isDonut ? "#48cae4" : isCowboy ? "#ffb703" : isFrozen ? "#00f0ff" : "#ffd166",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: "4px",
          textAlign: "center",
          textShadow: isDamaged ? "0 0 8px rgba(255,0,0,0.9)" : isGalaxy ? "0 0 10px rgba(72,202,228,1)" : "0 0 10px rgba(255,209,102,0.8)"
        }}>
          {isDamaged ? "💥 [DESTRUIDO • MONEY GUN] 💥" : isGalaxy ? `🌌 ${galaxyPopup?.sender || "FERNANDO"} • GALAXY 🌌` : isDonut ? "🔇 EL MUDO • RETO ACTIVO" : isCowboy ? "🤠 RETO CREATIVO • MODO ARTISTA" : isFrozen ? "❄️ MODO CONGELADO" : (roundMvpTitle || "TOP PLAYERS")}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          {!isRoundActive && sortedPlayers.length === 0 ? (
            <div style={{ fontSize: "9px", color: "#ffd166", textAlign: "center", padding: "16px 6px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
              ⏳ ESPERANDO INICIO DE RONDA
            </div>
          ) : sortedPlayers.length === 0 ? (
            <div style={{ fontSize: "8px", color: "#e0a96d", textAlign: "center", padding: "8px" }}>Sin jugadores registrados</div>
          ) : (
            <>
              {!isRoundActive && (
                <div style={{ fontSize: "8px", color: "#ffd166", textAlign: "center", padding: "2px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
                  ⏳ ESPERANDO INICIO DE RONDA
                </div>
              )}
              {sortedPlayers.map((player, idx) => {
                const rank = idx + 1;
                const isFirst = rank === 1;
                const isSecond = rank === 2;
                const isThird = rank === 3;
                const isHighlighted = highlightedPlayerId === player.id || recentScoredPlayerId === player.id;

                const rankBadge = isFirst ? "🥇 🥥" : isSecond ? "🥈 🌴" : isThird ? "🥉 🌊" : `${rank}️⃣`;
                const borderColor = isHighlighted ? "#48cae4" : isFirst ? "#ffd166" : isSecond ? "#90e0ef" : isThird ? "#e0a96d" : "rgba(224, 169, 109, 0.3)";
                const bgGradient = isHighlighted
                  ? "linear-gradient(135deg, rgba(72, 202, 228, 0.35), rgba(14, 65, 105, 0.25))"
                  : isFirst
                  ? "linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 111, 97, 0.2))"
                  : isSecond
                  ? "linear-gradient(135deg, rgba(72, 202, 228, 0.22), rgba(14, 65, 105, 0.15))"
                  : "rgba(255, 255, 255, 0.05)";

                return (
                  <div key={player.id || idx} className={isHighlighted ? "player-win-highlight" : ""} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: bgGradient,
                    border: `1px solid ${borderColor}`,
                    borderRadius: "4px",
                    padding: isFirst ? "3px 6px" : "2px 5px",
                    boxShadow: isHighlighted ? "0 0 25px rgba(72,202,228,0.85), inset 0 0 10px rgba(255,255,255,0.6)" : isFirst ? "0 0 10px rgba(255,209,102,0.3)" : "none",
                    transition: "all 0.3s ease"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontSize: isFirst ? "10px" : "8.5px", fontWeight: 900 }}>{rankBadge}</span>
                      <span style={{ fontSize: isFirst ? "9.5px" : "8px", fontWeight: 900, color: isHighlighted ? "#48cae4" : isFirst ? "#ffd166" : "#ffffff", textTransform: "uppercase" }}>
                        {player.name}
                      </span>
                    </div>
                    <div style={{ fontSize: isFirst ? "11px" : "9px", fontWeight: 900, color: isDamaged ? "#ff4d4d" : isGalaxy ? "#ffd166" : isHighlighted ? "#48cae4" : "#48cae4", textShadow: "0 0 6px rgba(72,202,228,0.6)" }}>
                      {isDamaged ? "0 PTS" : `${player.points || player.wins || 0} PTS`}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Right-Hand Column: Timer Display & Live Activity / Information Rotation Panel */}
      <div className="timer-sidebar-column" style={{ width: "130px", minWidth: "130px", flexShrink: 0, position: "relative" }}>
        <GameTimer timer={timer} />

        {currentEvent ? (
          <div className="timer-feed-compact-card" style={currentEvent.type === "WIN_LIMPIA" ? {
            background: "linear-gradient(135deg, rgba(20, 15, 40, 0.98), rgba(140, 70, 10, 0.98))",
            border: "2px solid #ffd700",
            boxShadow: "0 0 25px rgba(255,215,0,0.8), inset 0 1px 3px rgba(255,255,255,0.9)",
            padding: "8px 6px",
            animation: "epicImpactPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
            borderRadius: "8px",
            minHeight: "102px"
          } : { minHeight: "102px", padding: "6px 4px" }}>
            <div className="compact-header" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", marginBottom: "2px" }}>
              <span className="compact-icon" style={{ width: "48px", height: "48px", display: "inline-block", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.8))" }}>
                <GiftImage giftId={currentEvent.headerTitle} fallbackIcon="🎁" style={{ width: "48px", height: "48px" }} />
              </span>
              <span className="compact-title" style={{ fontSize: "9px", fontWeight: 900, color: "#ffd700", textTransform: "uppercase", letterSpacing: "0.5px" }}>{currentEvent.headerTitle}</span>
            </div>
            <span className="donor-name" style={{ fontSize: "7.5px", fontWeight: 900, color: "#ffffff", margin: "1px 0" }}>{currentEvent.donorName}</span>
            <span className="effect-badge" style={{ fontSize: "7px", fontWeight: 900, padding: "1px 5px", margin: "1px 0" }}>{currentEvent.effectText}</span>
            <span className="ability-badge" style={{ fontSize: "6.5px", fontWeight: 900, marginTop: "1px" }}>{currentEvent.abilityName}</span>
          </div>
        ) : (
          <InformationRotationPanel players={players} />
        )}
        <CocoDanceZone />
      </div>

      {/* Tropical Beach Champion Celebration Modal */}
      {effectiveShowWin && (
        <div className="celebration" style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "linear-gradient(135deg, rgba(255, 238, 140, 0.98) 0%, rgba(255, 183, 3, 0.96) 50%, rgba(255, 111, 97, 0.98) 100%)",
          backdropFilter: "blur(16px)",
          border: "2.5px solid rgba(255, 255, 255, 1)",
          boxShadow: "0 0 80px rgba(255,183,3,1), 0 0 35px rgba(255,255,255,0.9), inset 0 2px 4px rgba(255,255,255,1), inset 0 -6px 15px rgba(189,100,20,0.9)",
          padding: "16px 24px",
          borderRadius: "12px",
          zIndex: 9999,
          maxWidth: "280px",
          width: "90%",
          textAlign: "center",
          animation: "goldenImpact 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          overflow: "hidden"
        }}>
          {/* Sunshine sweep FX */}
          <div style={{
            position: "absolute",
            top: -40,
            left: -100,
            width: "60px",
            height: "250%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)",
            transform: "rotate(25deg)",
            animation: "goldenShineSweep 1.8s infinite ease-in-out",
            pointerEvents: "none",
            zIndex: 3
          }}></div>

          <div style={{ position: "relative", zIndex: 4 }}>
            <div style={{ fontSize: "16px", fontWeight: 900, color: "#ffd700", textShadow: "0 0 6px rgba(0,0,0,0.8)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "2px" }}>🏆 ROUND WINNER</div>
            <div style={{ color: "#1a120b", fontSize: "15px", fontWeight: 900, textShadow: "0 1px 3px rgba(255,255,255,0.9)", margin: "4px 0", textTransform: "uppercase", letterSpacing: "1.2px" }}>
              {winnerName}
            </div>
            <div style={{ fontSize: "7px", fontWeight: 900, color: "#ffffff", background: "rgba(26, 18, 11, 0.95)", padding: "3px 8px", borderRadius: "4px", margin: "3px 0", textTransform: "uppercase", display: "inline-block", letterSpacing: "1px", boxShadow: "0 0 8px rgba(0,0,0,0.5)" }}>
              ¡VICTORIA!
            </div>

            {/* Final Leaderboard Mini Table */}
            <div style={{ marginTop: "8px", borderTop: "1px solid rgba(26,18,11,0.25)", paddingTop: "6px", display: "flex", flexDirection: "column", gap: "2px", textAlign: "left" }}>
              <div style={{ fontSize: "6px", fontWeight: 900, color: "#5c3a21", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center", marginBottom: "2px" }}>PODIO TROPICAL SUPREMO</div>
              {sortedPlayers.slice(0, 3).map((p, idx) => (
                <div key={p.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.25)", padding: "2px 5px", borderRadius: "3px", fontSize: "7.5px", fontWeight: 900, color: "#1a120b" }}>
                  <span>{idx === 0 ? "🥇 🥥" : idx === 1 ? "🥈 🌴" : "🥉 🌊"} {p.name || p.displayName || p.username}</span>
                  <span>{p.points || p.wins || 0} PTS</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
