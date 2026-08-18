import React from "react";
import "./GenderBattleOverlay.css";

const TEAM_KEYS = ["team1", "team2"];

function getTeam(players, teams, key, index) {
  const explicit = teams?.find((t) => String(t?.id) === String(key));
  const fallback = teams?.[index];
  const teamPlayers = (players || []).filter((p) => String(p?.teamId) === String(explicit?.id || key));
  const pointsFromPlayers = teamPlayers.reduce((sum, p) => sum + Number(p?.points || 0), 0);
  return {
    id: explicit?.id || key,
    name: index === 0 ? "CHICOS" : "CHICAS",
    icon: index === 0 ? "👦" : "👧",
    points: Number(explicit?.points ?? fallback?.points ?? pointsFromPlayers ?? 0),
    wins: Number(explicit?.wins ?? fallback?.wins ?? 0),
    players: teamPlayers,
  };
}

function formatTimer(timer) {
  const m = Math.max(0, Number(timer?.minutes || 0));
  const s = Math.max(0, Number(timer?.seconds || 0));
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function GenderBattleOverlay({
  players = [],
  teams = [],
  timer = {},
  alert,
  epicEvent,
  epicGift,
  frozenTeamId,
  frozenDetails,
  highlightedPlayerId,
  showWin,
  winner,
  powerUps = [],
  battleEffects,
  liveActive,
  effectiveDonut,
  effectiveHat,
  effectiveGalaxy,
  effectiveMoneyGun,
}) {
  const boys = getTeam(players, teams, TEAM_KEYS[0], 0);
  const girls = getTeam(players, teams, TEAM_KEYS[1], 1);
  const total = Math.max(1, boys.points + girls.points);
  const boysWidth = Math.max(8, Math.min(92, (boys.points / total) * 100));
  const girlsWidth = 100 - boysWidth;
  const activeEvent = epicEvent || epicGift;
  const eventText = epicEvent?.giftDisplay || epicGift?.giftName || alert || "ESPERANDO EVENTOS";
  const eventUser = epicEvent?.username || epicGift?.username || "";

  const topPlayers = (team) => [...team.players]
    .sort((a, b) => Number(b?.points || 0) - Number(a?.points || 0))
    .slice(0, 3);

  const TeamCard = ({ team, side }) => {
    const frozen = String(frozenTeamId) === String(team.id);
    const highlighted = team.players.some((p) => String(p?.id) === String(highlightedPlayerId) || String(p?.playerId) === String(highlightedPlayerId));
    const abilityActive = [effectiveDonut, effectiveHat, effectiveGalaxy, effectiveMoneyGun].some((id) => String(id) === String(team.id));
    return (
      <section className={`gbo-team gbo-${side} ${frozen ? "is-frozen" : ""} ${highlighted ? "is-highlighted" : ""} ${abilityActive ? "ability-active" : ""}`}>
        <div className="gbo-team-head">
          <span className="gbo-team-icon">{team.icon}</span>
          <div>
            <div className="gbo-team-name">{team.name}</div>
            <div className="gbo-team-meta">{team.players.length} JUGADORES · {team.wins} WINS</div>
          </div>
        </div>
        <div className="gbo-score">{team.points}</div>
        <div className="gbo-label">PUNTOS</div>
        <div className="gbo-roster">
          {topPlayers(team).map((p) => (
            <div className={`gbo-player ${String(p?.id) === String(highlightedPlayerId) || String(p?.playerId) === String(highlightedPlayerId) ? "player-hot" : ""}`} key={p?.id || p?.playerId || p?.username}>
              <span>{p?.displayName || p?.name || p?.username || "Jugador"}</span>
              <b>{Number(p?.points || 0)}</b>
            </div>
          ))}
        </div>
        {frozen && <div className="gbo-status">❄️ CONGELADO · {Math.ceil(Number(frozenDetails?.remainingTime || 0) / 60)} MIN</div>}
        {abilityActive && <div className="gbo-status gbo-ability">⚡ HABILIDAD ACTIVA</div>}
      </section>
    );
  };

  return (
    <div className="gender-battle-overlay" data-live-active={String(Boolean(liveActive))}>
      <div className="gbo-topbar">
        <div className="gbo-brand"><span>🥥</span> COCOLOCO <small>LIVE BATTLE</small></div>
        <div className="gbo-round">CHICOS <strong>VS</strong> CHICAS</div>
      </div>

      <div className="gbo-arena">
        <TeamCard team={boys} side="left" />
        <div className="gbo-center">
          <div className="gbo-vs">VS</div>
          <div className="gbo-timer">{formatTimer(timer)}</div>
          <div className="gbo-live-dot"><i /> {liveActive ? "LIVE" : "READY"}</div>
          <div className="gbo-progress">
            <div className="gbo-progress-boys" style={{ width: `${boysWidth}%` }} />
            <div className="gbo-progress-girls" style={{ width: `${girlsWidth}%` }} />
          </div>
          <div className="gbo-progress-labels"><span>{boys.points}</span><span>VENTAJA</span><span>{girls.points}</span></div>
        </div>
        <TeamCard team={girls} side="right" />
      </div>

      <div className="gbo-eventbar">
        <div className="gbo-event-title">⚡ EVENTO EN VIVO</div>
        <div className={`gbo-event-content ${activeEvent ? "has-event" : ""}`}>
          <strong>{eventText}</strong>
          {eventUser && <span>por {eventUser}</span>}
        </div>
        {powerUps.length > 0 && <div className="gbo-powerups">{powerUps.slice(0, 3).map((p, i) => <span key={p?.id || i}>⚡ {p?.name || p?.type || "POWER-UP"}</span>)}</div>}
      </div>

      {showWin && winner && (
        <div className="gbo-win">
          <div className="gbo-win-card">
            <div className="gbo-win-kicker">🏆 WIN</div>
            <div className="gbo-win-name">{winner.displayName || winner.name || winner.username || "GANADOR"}</div>
            <div className="gbo-win-points">+{winner.points ?? 1} PUNTO</div>
          </div>
        </div>
      )}
    </div>
  );
}
