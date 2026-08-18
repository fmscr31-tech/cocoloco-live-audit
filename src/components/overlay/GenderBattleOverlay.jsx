import React, { useEffect, useMemo, useState } from "react";
import "./GenderBattleOverlay.css";
import { InformationRotationPanel } from "./InformationRotationPanel";
import { CocoDanceZone } from "./CocoDanceZone";
import { eventBus } from "../../core/eventBus";
import { dashboardAPI } from "../../core/dashboardAPI";
import { getMvpLeaderboard } from "../../core/mvpLeaderboardManager";

const TEAM_KEYS = ["team1", "team2"];

function getTeam(players, teams, key, index) {
  const explicit = teams?.find((t) => String(t?.id) === String(key));
  const fallback = teams?.[index];
  const resolvedId = explicit?.id || fallback?.id || key;
  const teamPlayers = (players || []).filter((p) => String(p?.teamId) === String(resolvedId));
  const pointsFromPlayers = teamPlayers.reduce((sum, p) => sum + Number(p?.points || 0), 0);

  // IMPORTANT: in GENDER_TEAMS the gender controls the mechanics, not the
  // visible label. The configured team name must be what the overlay renders.
  const configuredName = String(explicit?.name || fallback?.name || "").trim();
  const fallbackName = index === 0 ? "CHICOS" : "CHICAS";

  return {
    id: resolvedId,
    name: configuredName || fallbackName,
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

function identityKeys(player = {}) {
  return [player.id, player.playerId, player.tiktokId, player.username, player.uniqueId]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
}

function getTeamMvpRows(teamPlayers, leaderboard) {
  return (teamPlayers || [])
    .map((player) => {
      const keys = identityKeys(player);
      const record = (leaderboard || []).find((entry) => {
        const entryKeys = identityKeys(entry);
        return keys.some((key) => entryKeys.includes(key));
      });
      return {
        ...player,
        contributionPoints: Number(record?.contributionPoints || 0),
        mvpRounds: Number(record?.mvpRounds || 0),
      };
    })
    .sort((a, b) =>
      Number(b.contributionPoints || 0) - Number(a.contributionPoints || 0) ||
      Number(b.mvpRounds || 0) - Number(a.mvpRounds || 0) ||
      Number(b.points || 0) - Number(a.points || 0) ||
      Number(b.wins || 0) - Number(a.wins || 0)
    )
    .slice(0, 10);
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
  const [mvpRevision, setMvpRevision] = useState(0);
  const [liveDashboard, setLiveDashboard] = useState(() => dashboardAPI.getLiveDashboard());

  useEffect(() => {
    const unsubscribeDashboard = dashboardAPI.subscribe((dashboard) => {
      setLiveDashboard(dashboard);
      setMvpRevision((value) => value + 1);
    });

    const auxiliaryEvents = [
      "ability:started",
      "ability:finished",
      "cocazo:trigger",
    ];

    const unsubs = auxiliaryEvents.map((name) =>
      eventBus.subscribe(name, () => setMvpRevision((value) => value + 1))
    );

    return () => {
      unsubscribeDashboard?.();
      unsubs.forEach((unsubscribe) => unsubscribe && unsubscribe());
    };
  }, []);

  const liveGame = liveDashboard?.game || {};
  const livePlayers = Array.isArray(liveGame.players) ? liveGame.players : players;
  const liveTeams = Array.isArray(liveGame.teams) ? liveGame.teams : teams;
  const liveTimer = liveGame.timer || timer;
  const liveMode = liveDashboard?.gameMode || "GENDER_TEAMS";
  const liveRound = liveGame.round;
  const liveFrozenTeamId = liveDashboard?.battleEffects?.frozenTeamId ?? frozenTeamId;
  const liveFrozenDetails = liveDashboard?.battleEffects?.frozenDetails ?? frozenDetails;
  const liveLiveActive = liveDashboard?.liveActive ?? liveActive;

  const leaderboard = useMemo(() => getMvpLeaderboard(), [livePlayers, liveTeams, mvpRevision]);
  const boys = getTeam(livePlayers, liveTeams, TEAM_KEYS[0], 0);
  const girls = getTeam(livePlayers, liveTeams, TEAM_KEYS[1], 1);
  const boysMvp = getTeamMvpRows(boys.players, leaderboard);
  const girlsMvp = getTeamMvpRows(girls.players, leaderboard);

  const TeamCard = ({ team, side, mvpRows }) => {
    const frozen = String(liveFrozenTeamId) === String(team.id);
    const highlighted = team.players.some((p) =>
      String(p?.id) === String(highlightedPlayerId) || String(p?.playerId) === String(highlightedPlayerId)
    );
    const abilityActive = [effectiveDonut, effectiveHat, effectiveGalaxy, effectiveMoneyGun].some(
      (id) => String(id) === String(team.id)
    );

    return (
      <div className={`gbo-team-column gbo-${side}`}>
        <section className={`gbo-team ${frozen ? "is-frozen" : ""} ${highlighted ? "is-highlighted" : ""} ${abilityActive ? "ability-active" : ""}`}>
          <div className="gbo-team-head">
            <span className="gbo-team-icon" aria-hidden="true">{team.icon}</span>
            <div className="gbo-team-title-wrap">
              <div className="gbo-team-name">{team.name}</div>
            </div>
          </div>

          <div className="gbo-team-score">{team.points}</div>

          <div className="gbo-round-badge">
            <span>RONDA</span>
            <strong>{team.wins}</strong>
          </div>

          {frozen && (
            <div className="gbo-status">
              ❄️ CONGELADO · {Math.ceil(Number(liveFrozenDetails?.remainingTime || 0) / 60)} MIN
            </div>
          )}
          {abilityActive && <div className="gbo-status gbo-ability">⚡ HABILIDAD ACTIVA</div>}
        </section>

        <section className="gbo-mvp-panel" aria-label={`MVP ${team.name}`}>
          <div className="gbo-mvp-title">🏆 MVPS (TOP 10)</div>
          {mvpRows.length === 0 ? (
            <div className="gbo-mvp-empty">ESPERANDO JUGADORES</div>
          ) : (
            mvpRows.map((player, index) => {
              const playerName = player.displayName || player.name || player.username || "JUGADOR";
              const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}º`;
              return (
                <div className="gbo-mvp-row" key={`${player.id || player.playerId || player.username}-${index}`}>
                  <span className="gbo-mvp-rank">{medal}</span>
                  <span className="gbo-mvp-name" title={playerName}>{playerName}</span>
                  <span className="gbo-mvp-points">{Number(player.contributionPoints || 0)} pts</span>
                </div>
              );
            })
          )}
        </section>
      </div>
    );
  };

  return (
    <div className="gender-battle-overlay" data-live-active={String(Boolean(liveLiveActive))} data-game-mode={String(liveMode)} data-round={String(liveRound?.number ?? "")}>
      <div className="gbo-arena">
        <TeamCard team={boys} side="left" mvpRows={boysMvp} />

        <div className="gbo-center">
          <div className="gbo-timer-frame">
            <div className="gbo-timer-icon">⏱</div>
            <div className="gbo-timer">{formatTimer(liveTimer)}</div>
          </div>

          <div className="gbo-info-shell">
            <InformationRotationPanel players={livePlayers} />
          </div>

          <div className="gbo-cocazo-shell">
            <CocoDanceZone />
          </div>
        </div>

        <TeamCard team={girls} side="right" mvpRows={girlsMvp} />
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
