import { useMemo } from "react";
import "./GenderVsOverlay.css";

const TEAM_IDS = {
  chicos: "gender_male",
  chicas: "gender_female"
};

function getScore(team, players) {
  const explicit = Number(team?.points);
  if (Number.isFinite(explicit)) return explicit;
  return players
    .filter((player) => player.teamId === team?.id)
    .reduce((sum, player) => sum + (Number(player.points) || 0), 0);
}

export function GenderVsOverlay({ teams = [], players = [], timer = { minutes: 0, seconds: 0 }, liveActive = false }) {
  const data = useMemo(() => {
    const chicos = teams.find((team) => team.id === TEAM_IDS.chicos) || {
      id: TEAM_IDS.chicos,
      name: "CHICOS",
      color: "#3182ce"
    };
    const chicas = teams.find((team) => team.id === TEAM_IDS.chicas) || {
      id: TEAM_IDS.chicas,
      name: "CHICAS",
      color: "#e83e8c"
    };

    return {
      chicos: {
        ...chicos,
        score: getScore(chicos, players),
        count: players.filter((player) => player.teamId === TEAM_IDS.chicos).length
      },
      chicas: {
        ...chicas,
        score: getScore(chicas, players),
        count: players.filter((player) => player.teamId === TEAM_IDS.chicas).length
      }
    };
  }, [teams, players]);

  const minutes = String(Number(timer?.minutes) || 0).padStart(2, "0");
  const seconds = String(Number(timer?.seconds) || 0).padStart(2, "0");

  return (
    <div className="gender-vs-overlay">
      <div className="gender-vs-title">CHICAS VS CHICOS</div>

      <div className="gender-vs-scoreboard">
        <section className="gender-vs-team gender-vs-chicas">
          <div className="gender-vs-team-name">{data.chicas.name || "CHICAS"}</div>
          <div className="gender-vs-score">{data.chicas.score}</div>
          <div className="gender-vs-players">{data.chicas.count} JUGADOR{data.chicas.count === 1 ? "" : "ES"}</div>
        </section>

        <div className="gender-vs-center">
          <div className="gender-vs-vs">VS</div>
          <div className="gender-vs-timer">{minutes}:{seconds}</div>
          <div className={`gender-vs-status ${liveActive ? "active" : ""}`}>
            {liveActive ? "LIVE" : "ESPERANDO"}
          </div>
        </div>

        <section className="gender-vs-team gender-vs-chicos">
          <div className="gender-vs-team-name">{data.chicos.name || "CHICOS"}</div>
          <div className="gender-vs-score">{data.chicos.score}</div>
          <div className="gender-vs-players">{data.chicos.count} JUGADOR{data.chicos.count === 1 ? "" : "ES"}</div>
        </section>
      </div>
    </div>
  );
}

export default GenderVsOverlay;
