import { useState, useEffect } from "react";
import { TeamPanel } from "./TeamPanel";
import { GameTimer } from "./GameTimer";
import { IndividualPanel } from "./IndividualPanel";
import { InformationRotationPanel } from "./InformationRotationPanel";
import { CocoDanceZone } from "./CocoDanceZone";
import { eventBus } from "../../core/eventBus";
import { GIFT_ABILITY_MAP } from "../../config/giftAbilityMap";
import { ABILITY_REGISTRY } from "../../config/abilityRegistry";
import { resolveCanonicalGiftId } from "../../config/canonicalGifts";
import { GiftImage } from "../common/GiftImage";

export function ScoreBoard({ teams, players, timer, round, frozenTeamId, roundMvpTitle, frozenDetails, moneyGunTeamId, galaxyTeamId, galaxyPopup, donutTeamId, hatTeamId, highlightedPlayerId, mode = "team", showWin, winner, onTestWin, liveActive, battleEffects }) {
  const [internalShowWin, setInternalShowWin] = useState(false);

  // Live Activity Queue for Team Mode
  const [activityQueue, setActivityQueue] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);

  const isSessionActive = liveActive !== undefined ? liveActive : true;

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
      enqueueActivity({
        type: "WIN_LIMPIA",
        headerIcon: "✨",
        headerTitle: "WIN LIMPIA",
        donorName: `🥥 ${playerName}`,
        effectText: `+${pointsVal} PTS`,
        abilityName: teamName ? `🏆 ${teamName}` : "¡RESPUESTA CORRECTA!"
      });
    };

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

    return () => {
      unsubAbility();
      unsubDispatched();
      unsubReward();
      unsubWin();
    };
  }, []);

  const activeTeams = (!teams || teams.length < 2) ? [
    { id: "team1", name: "EQUIPO 1", points: 0, wins: 0 },
    { id: "team2", name: "EQUIPO 2", points: 0, wins: 0 }
  ] : teams;

  const effectiveShowWin = showWin || internalShowWin;
  const effectiveWinner = winner || { name: mode === "individual" ? (players?.[0]?.name || "FERNANDO") : activeTeams[0]?.name, points: mode === "individual" ? (players?.[0]?.points || 0) : activeTeams[0]?.points };
  const winnerTitleName = effectiveWinner.name || effectiveWinner.username || "GANADOR";

  const handleTestWinnerClick = () => {
    setInternalShowWin(true);
    if (onTestWin) onTestWin();
    setTimeout(() => setInternalShowWin(false), 5000);
  };



  if (mode === "individual") {
    return (
      <IndividualPanel
        players={players}
        timer={timer}
        round={round}
        roundMvpTitle={roundMvpTitle}
        donutTeamId={donutTeamId}
        hatTeamId={hatTeamId}
        galaxyTeamId={galaxyTeamId}
        galaxyPopup={galaxyPopup}
        moneyGunTeamId={moneyGunTeamId}
        frozenTeamId={frozenTeamId}
        frozenDetails={frozenDetails}
        highlightedPlayerId={highlightedPlayerId}
        showWin={effectiveShowWin}
        winner={effectiveWinner}
        onTestWin={handleTestWinnerClick}
        battleEffects={battleEffects}
      />
    );
  }

  const matchesTeam = (targetTeamId, actualTeamId, defaultIndex) => {
    if (!targetTeamId) return false;
    if (targetTeamId === actualTeamId) return true;
    const resolvedId = (targetTeamId === "team1" || targetTeamId === "team_1" || targetTeamId === "1") 
      ? activeTeams[0]?.id 
      : (targetTeamId === "team2" || targetTeamId === "team_2" || targetTeamId === "2") 
      ? activeTeams[1]?.id 
      : activeTeams[defaultIndex]?.id;
    return actualTeamId === resolvedId;
  };

  const isTeamFrozen = (teamId, defaultIndex) => {
    if (!frozenTeamId) return false;
    if (frozenTeamId === teamId) return true;
    const resolvedId = (frozenTeamId === "team1" || frozenTeamId === "team_1" || frozenTeamId === "1") 
      ? activeTeams[0]?.id 
      : (frozenTeamId === "team2" || frozenTeamId === "team_2" || frozenTeamId === "2") 
      ? activeTeams[1]?.id 
      : activeTeams[defaultIndex]?.id;
    return teamId === resolvedId;
  };

  const getTeamPlayers = (teamId) => {
    return (players || [])
      .filter(p => p.teamId === teamId)
      .sort((a, b) => (b.points || b.wins || 0) - (a.points || a.wins || 0))
      .slice(0, 7);
  };

  const getTeamScore = (teamId) => {
    const team = activeTeams.find(t => t.id === teamId);
    const isDamaged = matchesTeam(moneyGunTeamId, teamId, 1);
    if (isDamaged) return 0; // Destroyed by Money Gun
    if (team && team.points !== undefined) return team.points;
    return (players || [])
      .filter(p => p.teamId === teamId)
      .reduce((total, p) => total + (p.points || p.wins || 0), 0);
  };

  return (
    <div className="scoreboard" style={{ position: "relative" }}>
      <TeamPanel
        team={activeTeams[0]}
        score={getTeamScore(activeTeams[0].id)}
        players={getTeamPlayers(activeTeams[0].id)}
        round={round}
        wrapperClass="team-one"
        isFrozen={isTeamFrozen(activeTeams[0].id, 0)}
        roundMvpTitle={roundMvpTitle}
        frozenDetails={frozenDetails}
        isDamaged={matchesTeam(moneyGunTeamId, activeTeams[0].id, 1)}
        isGalaxyBenefited={matchesTeam(galaxyTeamId, activeTeams[0].id, 0)}
        galaxyPopup={matchesTeam(galaxyTeamId, activeTeams[0].id, 0) ? galaxyPopup : null}
        isDonutActive={matchesTeam(donutTeamId, activeTeams[0].id, 0)}
        isCowboyActive={matchesTeam(hatTeamId, activeTeams[0].id, 0)}
      />

      <div className="center-score" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", minWidth: "104px" }}>
        <GameTimer timer={timer} />

        {/* Live Activity Popup Feed Card or Information Rotation Panel */}
        {currentEvent ? (
          <div className="timer-feed-compact-card" style={currentEvent.type === "WIN_LIMPIA" ? {
            background: "linear-gradient(135deg, rgba(20, 15, 40, 0.98), rgba(140, 70, 10, 0.98))",
            border: "2px solid #ffd700",
            boxShadow: "0 0 25px rgba(255,215,0,0.8), inset 0 1px 3px rgba(255,255,255,0.9)",
            padding: "8px 6px",
            animation: "epicImpactPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
            borderRadius: "8px",
            minHeight: "110px"
          } : { minHeight: "110px", padding: "6px 4px" }}>
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

      <TeamPanel
        team={activeTeams[1]}
        score={getTeamScore(activeTeams[1].id)}
        players={getTeamPlayers(activeTeams[1].id)}
        round={round}
        wrapperClass="team-two"
        isFrozen={isTeamFrozen(activeTeams[1].id, 1)}
        roundMvpTitle={roundMvpTitle}
        frozenDetails={frozenDetails}
        isDamaged={matchesTeam(moneyGunTeamId, activeTeams[1].id, 1)}
        isGalaxyBenefited={matchesTeam(galaxyTeamId, activeTeams[1].id, 0)}
        galaxyPopup={matchesTeam(galaxyTeamId, activeTeams[1].id, 0) ? galaxyPopup : null}
        isDonutActive={matchesTeam(donutTeamId, activeTeams[1].id, 0)}
        isCowboyActive={matchesTeam(hatTeamId, activeTeams[1].id, 0)}
      />

      {/* Guaranteed Highest Z-Index Winner Modal / Victory Banner for Team Mode (Contained within hud-container via position: absolute) */}
      {effectiveShowWin && (
        <div className="celebration" style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "linear-gradient(135deg, rgba(255, 238, 140, 0.98) 0%, rgba(255, 185, 0, 0.96) 50%, rgba(220, 120, 0, 0.98) 100%)",
          backdropFilter: "blur(16px)",
          border: "2.5px solid rgba(255, 255, 255, 1)",
          boxShadow: "0 0 80px rgba(255,215,0,1), 0 0 35px rgba(255,255,255,0.9), inset 0 2px 4px rgba(255,255,255,1), inset 0 -6px 15px rgba(140,65,0,0.9)",
          padding: "16px 24px",
          borderRadius: "12px",
          zIndex: 9999,
          maxWidth: "260px",
          width: "85%",
          textAlign: "center",
          animation: "goldenImpact 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          overflow: "hidden"
        }}>
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
            <div style={{ color: "#0c091a", fontSize: "16px", fontWeight: 900, textShadow: "0 1px 3px rgba(255,255,255,0.9)", margin: "6px 0", textTransform: "uppercase", letterSpacing: "1.5px" }}>
              {winnerTitleName}
            </div>
            <div style={{ fontSize: "8px", fontWeight: 900, color: "#ffffff", background: "rgba(12, 9, 26, 0.95)", padding: "4px 10px", borderRadius: "5px", margin: "4px 0", textTransform: "uppercase", display: "inline-block", letterSpacing: "1.2px", boxShadow: "0 0 10px rgba(0,0,0,0.5)" }}>
              ¡VICTORIA!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
