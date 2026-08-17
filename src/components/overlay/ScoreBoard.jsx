import { useState, useEffect } from "react";
import { TeamPanel } from "./TeamPanel";
import { GameTimer } from "./GameTimer";
import { IndividualPanel } from "./IndividualPanel";
import { IndividualJoinPrompt } from "./IndividualJoinPrompt";
import { InformationRotationPanel } from "./InformationRotationPanel";
import { CocoDanceZone } from "./CocoDanceZone";
import { eventBus } from "../../core/eventBus";
import { dashboardAPI } from "../../core/dashboardAPI";

const normalizeWinnerTeamName = (data, activeTeams) => {
  const explicit = data?.winningTeamName || data?.winnerTeamName || data?.teamName || data?.winningTeam?.name || data?.team?.name;
  if (explicit) return String(explicit);

  const teamId = data?.winningTeamId || data?.teamId || data?.winningTeam?.id || data?.team?.id;
  if (teamId) {
    const found = activeTeams.find(team => String(team?.id) === String(teamId));
    if (found?.name) return String(found.name);
  }

  const winner = data?.winner;
  if (winner?.teamName) return String(winner.teamName);
  if (winner?.team?.name) return String(winner.team.name);

  return "EQUIPO GANADOR";
};

const getGenderWinnerTheme = name => {
  const value = String(name || "").toLowerCase();
  const girls = /\b(chica|chicas|mujer|mujeres|femenina|femenino|female|women|girls)\b/.test(value);
  const boys = /\b(chico|chicos|hombre|hombres|masculino|masculino|male|men|boys)\b/.test(value);

  if (girls) {
    return {
      shape: "heart",
      background: "linear-gradient(145deg,#ff4f9a 0%,#ff7fbe 42%,#8edcff 100%)",
      accent: "#ff2f8b",
      edge: "#ffe7f4",
      glow: "rgba(255,61,151,.82)",
      icon: "♥",
      confetti: ["#ff4f9a", "#8edcff", "#ffe66d", "#ffffff"]
    };
  }

  if (boys) {
    return {
      shape: "star",
      background: "linear-gradient(145deg,#0759b8 0%,#27b7e9 48%,#6fa95a 100%)",
      accent: "#168fe2",
      edge: "#d7f6ff",
      glow: "rgba(32,161,239,.82)",
      icon: "★",
      confetti: ["#168fe2", "#7bdff5", "#9bc77b", "#ffffff"]
    };
  }

  return {
    shape: "star",
    background: "linear-gradient(145deg,#0d5da8 0%,#20a8dc 50%,#ffd84a 100%)",
    accent: "#20a8dc",
    edge: "#ffffff",
    glow: "rgba(32,168,220,.78)",
    icon: "★",
    confetti: ["#20a8dc", "#ffd84a", "#ffffff", "#ff8c42"]
  };
};

const confettiPieces = Array.from({ length: 22 }, (_, index) => ({
  id: index,
  left: `${8 + ((index * 37) % 84)}%`,
  delay: `${(index % 7) * 0.08}s`,
  duration: `${1.15 + (index % 5) * 0.12}s`,
  rotation: `${(index * 47) % 360}deg`,
  size: `${3 + (index % 3)}px`
}));

export function ScoreBoard({ teams, players, timer, round, frozenTeamId, roundMvpTitle, frozenDetails, moneyGunTeamId, galaxyTeamId, galaxyPopup, donutTeamId, hatTeamId, highlightedPlayerId, mode = "team", showWin, winner, onTestWin, liveActive, battleEffects }) {
  const [internalShowWin, setInternalShowWin] = useState(false);
  const [teamWinnerCelebration, setTeamWinnerCelebration] = useState(null);
  const [activityQueue, setActivityQueue] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);

  const activeTeams = (!teams || teams.length < 2)
    ? [{ id: "team1", name: "EQUIPO 1", points: 0, wins: 0 }, { id: "team2", name: "EQUIPO 2", points: 0, wins: 0 }]
    : teams;

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
      if (mode === "individual") {
        setInternalShowWin(true);
        setTimeout(() => setInternalShowWin(false), 5000);
        return;
      }

      const teamName = normalizeWinnerTeamName(data, activeTeams);
      const teamId = data?.winningTeamId || data?.teamId || data?.winningTeam?.id || data?.team?.id || activeTeams.find(team => String(team?.name).toLowerCase() === teamName.toLowerCase())?.id || null;
      setTeamWinnerCelebration({ teamId, teamName, round: data?.round ?? data?.roundNumber ?? round?.number ?? null, createdAt: Date.now() });
    };

    const unsubWin = eventBus.subscribe("win:correct", handleWinNotification);
    const unsubRoundWinner = eventBus.subscribe("round:winner_popup", handleRoundWinner);
    return () => { unsubWin?.(); unsubRoundWinner?.(); };
  }, [mode, activeTeams, round?.number]);

  const effectiveShowWin = showWin || internalShowWin;
  const effectiveWinner = winner || { name: mode === "individual" ? (players?.[0]?.name || "FERNANDO") : activeTeams[0]?.name, points: mode === "individual" ? (players?.[0]?.points || 0) : activeTeams[0]?.points };
  const winnerTitleName = effectiveWinner.name || effectiveWinner.username || "GANADOR";
  const handleTestWinnerClick = () => { setInternalShowWin(true); onTestWin?.(); setTimeout(() => setInternalShowWin(false), 5000); };

  if (mode === "individual") {
    return (
      <div className="scoreboard individual-scoreboard-shell" style={{ position: "relative" }}>
        <IndividualJoinPrompt />
        <IndividualPanel players={players} timer={timer} round={round} roundMvpTitle={roundMvpTitle} donutTeamId={donutTeamId} hatTeamId={hatTeamId} galaxyTeamId={galaxyTeamId} galaxyPopup={galaxyPopup} moneyGunTeamId={moneyGunTeamId} frozenTeamId={frozenTeamId} frozenDetails={frozenDetails} highlightedPlayerId={highlightedPlayerId} showWin={effectiveShowWin} winner={effectiveWinner} onTestWin={handleTestWinnerClick} battleEffects={battleEffects} />
      </div>
    );
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

  const rawGameMode = String(dashboardAPI.getGameMode?.() || mode || "").toUpperCase();
  const isGenderMode = rawGameMode.includes("GENDER") || rawGameMode.includes("CHICOS") || rawGameMode.includes("CHICAS") || rawGameMode.includes("HOMBRES") || rawGameMode.includes("MUJERES");
  const overlayTeam = (team, index) => {
    const configuredCommands = Array.isArray(team.commands) ? team.commands.filter(Boolean) : [];
    const command = configuredCommands[0] || team.command || team.joinCommand || team.registrationCommand || team.entryCommand || "";
    if (!isGenderMode) return command ? { ...team, command, commands: configuredCommands.length ? configuredCommands : [command] } : team;
    return {
      ...team,
      mode: "GENDER_TEAMS",
      gameMode: "GENDER_TEAMS",
      gender: index === 0 ? "male" : "female",
      command,
      commands: configuredCommands.length ? configuredCommands : [command || (index === 0 ? "CHICOS" : "CHICAS")]
    };
  };

  const winnerTheme = teamWinnerCelebration ? getGenderWinnerTheme(teamWinnerCelebration.teamName) : null;

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

      {teamWinnerCelebration && winnerTheme && (
        <div
          className={`team-winner-celebration team-winner-${winnerTheme.shape}`}
          role="status"
          aria-live="assertive"
          style={{
            position: "absolute",
            left: "50%",
            top: "18%",
            transform: "translate(-50%,-50%)",
            width: "188px",
            height: "154px",
            zIndex: 12000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "18px 24px",
            boxSizing: "border-box",
            background: winnerTheme.background,
            color: "#fff",
            clipPath: winnerTheme.shape === "heart"
              ? "polygon(50% 92%, 7% 51%, 5% 32%, 10% 17%, 23% 10%, 36% 14%, 50% 27%, 64% 14%, 77% 10%, 90% 17%, 95% 32%, 93% 51%)"
              : "polygon(50% 0%, 61% 25%, 88% 12%, 76% 39%, 100% 50%, 76% 61%, 88% 88%, 61% 75%, 50% 100%, 39% 75%, 12% 88%, 24% 61%, 0% 50%, 24% 39%, 12% 12%, 39% 25%)",
            boxShadow: `0 0 34px ${winnerTheme.glow}`,
            animation: "teamWinnerBurst .72s cubic-bezier(.16,1.25,.35,1) both, teamWinnerFloat 2.8s ease-in-out .72s infinite"
          }}
        >
          <div style={{ position: "absolute", inset: "8px", border: `2px solid ${winnerTheme.edge}`, opacity: .82, clipPath: "inherit", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "-8px", fontSize: "30px", lineHeight: 1, color: winnerTheme.edge, textShadow: `0 0 14px ${winnerTheme.glow}`, animation: "teamWinnerIcon 1s ease-in-out infinite" }}>{winnerTheme.icon}</div>
          <div style={{ marginTop: "20px", fontSize: "8px", fontWeight: 1000, letterSpacing: "1.1px", textTransform: "uppercase", textShadow: "0 2px 5px rgba(0,0,0,.55)" }}>🏆 EQUIPO GANADOR</div>
          <div style={{ marginTop: "3px", maxWidth: "145px", fontSize: "15px", lineHeight: 1.05, fontWeight: 1000, textTransform: "uppercase", textShadow: "0 2px 7px rgba(0,0,0,.65)" }}>{teamWinnerCelebration.teamName}</div>
          <div style={{ marginTop: "5px", fontSize: "7px", fontWeight: 950, letterSpacing: ".5px", textTransform: "uppercase", background: "rgba(0,0,0,.28)", border: `1px solid ${winnerTheme.edge}`, padding: "3px 8px", borderRadius: "999px" }}>
            {teamWinnerCelebration.round ? `RONDA ${teamWinnerCelebration.round} • VICTORIA` : "VICTORIA • +1 RONDA"}
          </div>

          {confettiPieces.map(piece => (
            <span
              key={piece.id}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: piece.left,
                top: "32%",
                width: piece.size,
                height: `${Number.parseInt(piece.size, 10) + 3}px`,
                borderRadius: "1px",
                background: winnerTheme.confetti[piece.id % winnerTheme.confetti.length],
                transform: `rotate(${piece.rotation})`,
                animation: `winnerConfetti ${piece.duration}ms ease-out ${piece.delay} infinite`,
                pointerEvents: "none"
              }}
            />
          ))}

          <style>{`@keyframes teamWinnerBurst{0%{opacity:0;transform:translate(-50%,-50%) scale(.18) rotate(-18deg)}55%{opacity:1;transform:translate(-50%,-50%) scale(1.08) rotate(4deg)}100%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(0)}}@keyframes teamWinnerFloat{0%,100%{margin-top:0}50%{margin-top:-4px}}@keyframes teamWinnerIcon{0%,100%{transform:scale(1) rotate(-4deg)}50%{transform:scale(1.13) rotate(5deg)}}@keyframes winnerConfetti{0%{opacity:0;transform:translateY(-8px) rotate(0deg)}15%{opacity:1}100%{opacity:0;transform:translateY(82px) rotate(230deg)}}`}</style>
        </div>
      )}
    </div>
  );
}
