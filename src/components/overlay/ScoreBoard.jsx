import { useState, useEffect } from "react";
import { TeamPanel } from "./TeamPanel";
import { GameTimer } from "./GameTimer";
import { IndividualPanel } from "./IndividualPanel";
import { InformationRotationPanel } from "./InformationRotationPanel";
import { CocoDanceZone } from "./CocoDanceZone";
import { eventBus } from "../../core/eventBus";
import { dashboardAPI } from "../../core/dashboardAPI";

export function ScoreBoard({ teams, players, timer, round, frozenTeamId, roundMvpTitle, frozenDetails, moneyGunTeamId, galaxyTeamId, galaxyPopup, donutTeamId, hatTeamId, highlightedPlayerId, mode = "team", showWin, winner, onTestWin, liveActive, battleEffects }) {
  const [internalShowWin, setInternalShowWin] = useState(false);
  const [activityQueue, setActivityQueue] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);

  useEffect(() => {
    if (activityQueue.length > 0 && !currentEvent) {
      const next = activityQueue[0];
      setCurrentEvent(next);
      const timerId = setTimeout(() => {
        setActivityQueue(prev => prev.slice(1));
        setCurrentEvent(null);
      }, 4000);
      return () => clearTimeout(timerId);
    }
    return undefined;
  }, [activityQueue, currentEvent]);

  const enqueueActivity = eventData => setActivityQueue(prev => [...prev, { id: Date.now() + Math.random(), ...eventData }]);

  useEffect(() => {
    const handleWinNotification = data => {
      const playerName = (data?.name || data?.username || data?.player?.name || "JUGADOR").toUpperCase();
      const pointsVal = data?.points || data?.player?.points || 1;
      const teamName = data?.teamName || data?.team || "";
      enqueueActivity({ type: "WIN_LIMPIA", headerIcon: "✨", headerTitle: "WIN LIMPIA", donorName: `🥥 ${playerName}`, effectText: `+${pointsVal} PTS`, abilityName: teamName ? `🏆 ${teamName}` : "¡RESPUESTA CORRECTA!" });
    };
    const handleRoundWinner = data => {
      const winnerName = data?.winningTeamName || data?.winner?.name || "GANADOR";
      if (mode === "individual") { setInternalShowWin(true); setTimeout(() => setInternalShowWin(false), 5000); return; }
      enqueueActivity({ type: "ROUND_WINNER", headerIcon: "🏆", headerTitle: "EQUIPO GANADOR", donorName: winnerName, effectText: "+1 RONDA", abilityName: "¡FELICIDADES!" });
    };
    const unsubWin = eventBus.subscribe("win:correct", handleWinNotification);
    const unsubRoundWinner = eventBus.subscribe("round:winner_popup", handleRoundWinner);
    return () => { unsubWin?.(); unsubRoundWinner?.(); };
  }, [mode]);

  const activeTeams = (!teams || teams.length < 2)
    ? [{ id: "team1", name: "EQUIPO 1", points: 0, wins: 0 }, { id: "team2", name: "EQUIPO 2", points: 0, wins: 0 }]
    : teams;

  const effectiveShowWin = showWin || internalShowWin;
  const effectiveWinner = winner || { name: mode === "individual" ? (players?.[0]?.name || "FERNANDO") : activeTeams[0]?.name, points: mode === "individual" ? (players?.[0]?.points || 0) : activeTeams[0]?.points };
  const winnerTitleName = effectiveWinner.name || effectiveWinner.username || "GANADOR";
  const handleTestWinnerClick = () => { setInternalShowWin(true); onTestWin?.(); setTimeout(() => setInternalShowWin(false), 5000); };

  if (mode === "individual") {
    return <IndividualPanel players={players} timer={timer} round={round} roundMvpTitle={roundMvpTitle} donutTeamId={donutTeamId} hatTeamId={hatTeamId} galaxyTeamId={galaxyTeamId} galaxyPopup={galaxyPopup} moneyGunTeamId={moneyGunTeamId} frozenTeamId={frozenTeamId} frozenDetails={frozenDetails} highlightedPlayerId={highlightedPlayerId} showWin={effectiveShowWin} winner={effectiveWinner} onTestWin={handleTestWinnerClick} battleEffects={battleEffects} />;
  }

  const matchesTeam = (targetTeamId, actualTeamId, defaultIndex) => {
    if (!targetTeamId) return false;
    if (targetTeamId === actualTeamId) return true;
    const resolvedId = (targetTeamId === "team1" || targetTeamId === "team_1" || targetTeamId === "1") ? activeTeams[0]?.id : (targetTeamId === "team2" || targetTeamId === "team_2" || targetTeamId === "2") ? activeTeams[1]?.id : activeTeams[defaultIndex]?.id;
    return actualTeamId === resolvedId;
  };

  const isTeamFrozen = (teamId, defaultIndex) => {
    if (!frozenTeamId) return false;
    if (frozenTeamId === teamId) return true;
    const resolvedId = (frozenTeamId === "team1" || frozenTeamId === "team_1" || frozenTeamId === "1") ? activeTeams[0]?.id : (frozenTeamId === "team2" || frozenTeamId === "team_2" || frozenTeamId === "2") ? activeTeams[1]?.id : activeTeams[defaultIndex]?.id;
    return teamId === resolvedId;
  };

  const getTeamPlayers = teamId => (players || []).filter(p => p.teamId === teamId).sort((a, b) => (b.points || b.wins || 0) - (a.points || a.wins || 0)).slice(0, 7);
  const getTeamScore = teamId => {
    const team = activeTeams.find(t => t.id === teamId);
    if (matchesTeam(moneyGunTeamId, teamId, 1)) return 0;
    if (team && team.points !== undefined) return team.points;
    return (players || []).filter(p => p.teamId === teamId).reduce((total, p) => total + (p.points || p.wins || 0), 0);
  };

  // The parent Overlay currently normalizes CHICOS_VS_CHICAS to "team".
  // Recover the authoritative raw mode here so TeamPanel can activate its visual gender theme.
  const rawGameMode = String(dashboardAPI.getGameMode?.() || mode || "").toUpperCase();
  const isGenderMode = rawGameMode.includes("GENDER") || rawGameMode.includes("CHICOS") || rawGameMode.includes("CHICAS") || rawGameMode.includes("HOMBRES") || rawGameMode.includes("MUJERES");
  const overlayTeam = (team, index) => {
    if (!isGenderMode) return team;
    const configuredCommands = Array.isArray(team.commands) ? team.commands.filter(Boolean) : [];
    return {
      ...team,
      mode: "GENDER_TEAMS",
      gameMode: "GENDER_TEAMS",
      gender: index === 0 ? "male" : "female",
      commands: configuredCommands.length ? configuredCommands : [index === 0 ? "CHICOS" : "CHICAS"]
    };
  };

  return (
    <div className="scoreboard" style={{ position: "relative" }}>
      <TeamPanel team={overlayTeam(activeTeams[0], 0)} score={getTeamScore(activeTeams[0].id)} players={getTeamPlayers(activeTeams[0].id)} round={round} wrapperClass="team-one" isFrozen={isTeamFrozen(activeTeams[0].id, 0)} roundMvpTitle={roundMvpTitle} frozenDetails={frozenDetails} isDamaged={matchesTeam(moneyGunTeamId, activeTeams[0].id, 1)} isGalaxyBenefited={matchesTeam(galaxyTeamId, activeTeams[0].id, 0)} galaxyPopup={matchesTeam(galaxyTeamId, activeTeams[0].id, 0) ? galaxyPopup : null} isDonutActive={matchesTeam(donutTeamId, activeTeams[0].id, 0)} isCowboyActive={matchesTeam(hatTeamId, activeTeams[0].id, 0)} />

      <div className="center-score" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", minWidth: "104px" }}>
        <GameTimer timer={timer} />
        <InformationRotationPanel players={players} />
        <CocoDanceZone />
        {currentEvent && <div className="timer-feed-compact-card" style={{ minHeight: "62px", minWidth: "92px", maxWidth: "118px", padding: "5px", borderRadius: "7px", background: currentEvent.type === "WIN_LIMPIA" ? "linear-gradient(135deg,rgba(20,15,40,.98),rgba(140,70,10,.98))" : "linear-gradient(135deg,rgba(255,238,140,.98),rgba(255,185,0,.96))", border: "1.5px solid #fff", boxShadow: currentEvent.type === "WIN_LIMPIA" ? "0 0 18px rgba(255,215,0,.7)" : "0 0 22px rgba(255,215,0,.75)", textAlign: "center" }}>
          <div style={{ fontSize: "7.5px", fontWeight: 950, color: currentEvent.type === "WIN_LIMPIA" ? "#ffd700" : "#3a2500", textTransform: "uppercase" }}>{currentEvent.headerIcon} {currentEvent.headerTitle}</div>
          <div style={{ fontSize: "7px", fontWeight: 950, color: currentEvent.type === "WIN_LIMPIA" ? "#fff" : "#0c091a", margin: "2px 0" }}>{currentEvent.donorName}</div>
          <div style={{ fontSize: "6.5px", fontWeight: 950, color: currentEvent.type === "WIN_LIMPIA" ? "#fff" : "#0c091a" }}>{currentEvent.effectText}</div>
        </div>}
      </div>

      <TeamPanel team={overlayTeam(activeTeams[1], 1)} score={getTeamScore(activeTeams[1].id)} players={getTeamPlayers(activeTeams[1].id)} round={round} wrapperClass="team-two" isFrozen={isTeamFrozen(activeTeams[1].id, 1)} roundMvpTitle={roundMvpTitle} frozenDetails={frozenDetails} isDamaged={matchesTeam(moneyGunTeamId, activeTeams[1].id, 1)} isGalaxyBenefited={matchesTeam(galaxyTeamId, activeTeams[1].id, 0)} galaxyPopup={matchesTeam(galaxyTeamId, activeTeams[1].id, 0) ? galaxyPopup : null} isDonutActive={matchesTeam(donutTeamId, activeTeams[1].id, 0)} isCowboyActive={matchesTeam(hatTeamId, activeTeams[1].id, 0)} />

      {effectiveShowWin && <div className="celebration" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "linear-gradient(135deg,rgba(255,238,140,.98),rgba(255,185,0,.96),rgba(220,120,0,.98))", border: "2px solid #fff", boxShadow: "0 0 55px rgba(255,215,0,.9)", padding: "12px 18px", borderRadius: "10px", zIndex: 9999, maxWidth: "220px", width: "80%", textAlign: "center" }}>
        <div style={{ fontSize: "14px", fontWeight: 950, color: "#ffd700" }}>🏆 ROUND WINNER</div>
        <div style={{ color: "#0c091a", fontSize: "14px", fontWeight: 950, textTransform: "uppercase", margin: "5px 0" }}>{winnerTitleName}</div>
        <div style={{ fontSize: "7px", fontWeight: 900, color: "#fff", background: "rgba(12,9,26,.95)", padding: "3px 8px", borderRadius: "4px", display: "inline-block" }}>¡VICTORIA!</div>
      </div>}
    </div>
  );
}
