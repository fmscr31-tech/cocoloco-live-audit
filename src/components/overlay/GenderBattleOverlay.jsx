import React from "react";
import "./GenderBattleOverlay.css";
import { InformationRotationPanel } from "./InformationRotationPanel";

const TEAM_KEYS = ["team1", "team2"];

function getTeam(players, teams, key, index) {
  const explicit = teams?.find((t) => String(t?.id) === String(key));
  const fallback = teams?.[index];
  const teamPlayers = (players || []).filter((p) => String(p?.teamId) === String(explicit?.id || key));
  const pointsFromPlayers = teamPlayers.reduce((sum, p) => sum + Number(p?.points || 0), 0);
  return {
    id: explicit?.id || key,
    name: index === 0 ? "CHICOS" : "CHICAS",
    icon: index === 0 ? "♂" : "♀",
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
  liveActive,
  effectiveDonut,
  effectiveHat,
  effectiveGalaxy,
  effectiveMoneyGun,
}) {
  const boys = getTeam(players, teams, TEAM_KEYS[0], 0);
  const girls = getTeam(players, teams, TEAM_KEYS[1], 1);

  const TeamCard = ({ team, side }) => {
    const frozen = String(frozenTeamId) === String(team.id);
    const highlighted = team.players.some((p) => String(p?.id) === String(highlightedPlayerId) || String(p?.playerId) === String(highlightedPlayerId));
    const abilityActive = [effectiveDonut, effectiveHat, effectiveGalaxy, effectiveMoneyGun].some((id) => String(id) === String(team.id));

    return (
      <section className={`gbo-team gbo-${side} ${frozen ? "is-frozen" : ""} ${highlighted ? "is-highlighted" : ""} ${abilityActive ? "ability-active" : ""}`}>
        <div className="gbo-team-head">
          <span className="gbo-team-icon" aria-hidden="true">{team.icon}</span>
          <div className="gbo-team-title-wrap">
            <div className="gbo-team-name">{team.name}</div>
            <div className="gbo-team-meta">{team.players.length} JUGADORES · {team.wins} WINS</div>
          </div>
        </div>
        <div className="gbo-team-score-label">PUNTOS</div>
        <div className="gbo-team-score">{team.points}</div>
        {frozen && <div className="gbo-status">❄️ CONGELADO · {Math.ceil(Number(frozenDetails?.remainingTime || 0) / 60)} MIN</div>}
        {abilityActive && <div className="gbo-status gbo-ability">⚡ HABILIDAD ACTIVA</div>}
      </section>
    );
  };

  return (
    <div className="gender-battle-overlay" data-live-active={String(Boolean(liveActive))}>
      <div className="gbo-brand-plaque">
        <div className="gbo-brand-main">🥥 COCOLOCO</div>
        <div className="gbo-brand-sub">LIVE BATTLE</div>
      </div>

      <div className="gbo-arena">
        <TeamCard team={boys} side="left" />

        <div className="gbo-center">
          <div className="gbo-timer-frame">
            <div className="gbo-timer-icon">⏱</div>
            <div className="gbo-timer">{formatTimer(timer)}</div>
          </div>

          <div className="gbo-center-vs">VS</div>
          <div className="gbo-center-scoreline">
            <div className="gbo-center-score boys-score"><span>CHICOS</span><strong>{boys.points}</strong></div>
            <div className="gbo-center-divider">•</div>
            <div className="gbo-center-score girls-score"><span>CHICAS</span><strong>{girls.points}</strong></div>
          </div>

          <div className="gbo-info-shell">
            <InformationRotationPanel />
          </div>
        </div>

        <TeamCard team={girls} side="right" />
      </div>

      <div className="gbo-live-strip">
        <span className="gbo-live-dot" />
        <strong>{epicEvent?.giftDisplay || epicGift?.giftName || alert || "COCOLOCO LIVE"}</strong>
        {(epicEvent?.username || epicGift?.username) && <span>por {epicEvent?.username || epicGift?.username}</span>}
        {powerUps.length > 0 && <span className="gbo-powerups">⚡ {powerUps.slice(0, 2).map((p) => p?.name || p?.type || "POWER-UP").join(" · ")}</span>}
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
