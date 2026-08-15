import { useState, useEffect } from "react";
import { getPlayers, addPlayer, addPoints } from "../../core/playerManager";
import { getTeams, addTeamPoints } from "../../core/TeamManager";
import { dashboardAPI } from "../../core/dashboardAPI";
import { registrationManager } from "../../core/registrationManager";
import { eventBus } from "../../core/eventBus";

export function ManualScoreControl() {
  const [gameMode, setGameMode] = useState(dashboardAPI.getGameMode());
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);

  // Individual Selection & Custom Input
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [customPlayerName, setCustomPlayerName] = useState("");

  // Team Selection
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const [feedback, setFeedback] = useState(null);

  const refreshData = () => {
    setGameMode(dashboardAPI.getGameMode());
    const regPlayers = registrationManager.getRegisteredPlayers();
    const corePlayers = getPlayers() || [];
    // Combine unique players
    const map = new Map();
    corePlayers.forEach(p => map.set(p.id, p));
    regPlayers.forEach(p => {
      if (!map.has(p.playerId)) {
        map.set(p.playerId, { id: p.playerId, name: p.displayName || p.name, points: p.points || 0, wins: p.wins || 0 });
      }
    });
    setPlayers(Array.from(map.values()));
    const loadedTeams = getTeams() || [];
    setTeams(loadedTeams);
    if (loadedTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(loadedTeams[0].id);
    }
  };

  useEffect(() => {
    refreshData();
    const unsubMode = dashboardAPI.subscribeToModeChange(({ mode }) => {
      setGameMode(mode);
    });
    const unsubReg = eventBus.subscribe("registration:updated", refreshData);
    const unsubScore = eventBus.subscribe("game:score_updated", refreshData);
    const unsubPlayer = eventBus.subscribe("player:updated", refreshData);

    return () => {
      unsubMode && unsubMode();
      unsubReg && unsubReg();
      unsubScore && unsubScore();
      unsubPlayer && unsubPlayer();
    };
  }, []);

  const showFeedback = (msg, isError = false) => {
    setFeedback({ msg, isError });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleIndividualAction = (type, delta) => {
    let targetPlayer = null;
    if (selectedPlayerId) {
      targetPlayer = players.find(p => p.id === selectedPlayerId || p.playerId === selectedPlayerId);
    }
    if (!targetPlayer && customPlayerName.trim()) {
      // Ensure player exists or create
      targetPlayer = addPlayer({ name: customPlayerName.trim() });
      refreshData();
    }
    if (!targetPlayer) {
      showFeedback("⚠️ Selecciona o ingresa un nombre de jugador válido.", true);
      return;
    }

    if (type === "point") {
      const newPoints = Math.max(0, (targetPlayer.points || 0) + delta);
      const diff = newPoints - (targetPlayer.points || 0);
      if (diff !== 0) {
        addPoints(targetPlayer.id || targetPlayer.playerId, diff);
        targetPlayer.points = newPoints;
      }
      showFeedback(`✅ Puntos de ${targetPlayer.name} actualizados (${newPoints} pts).`);
    } else if (type === "round") {
      const newWins = Math.max(0, (targetPlayer.wins || 0) + delta);
      targetPlayer.wins = newWins;
      showFeedback(`✅ Rondas de ${targetPlayer.name} actualizadas (${newWins} wins).`);
    }

    eventBus.emit("game:score_updated", { playerId: targetPlayer.id, points: targetPlayer.points, wins: targetPlayer.wins, manual: true });
    eventBus.publish("player:updated", { player: targetPlayer });
    refreshData();
  };

  const handleTeamAction = (type, delta) => {
    const team = teams.find(t => t.id === selectedTeamId);
    if (!team) {
      showFeedback("⚠️ Selecciona un equipo válido.", true);
      return;
    }

    if (type === "point") {
      const newPoints = Math.max(0, (team.points || 0) + delta);
      const diff = newPoints - (team.points || 0);
      if (diff !== 0) {
        addTeamPoints(team.id, diff);
        team.points = newPoints;
      }
      showFeedback(`✅ Puntos del equipo ${team.name} actualizados (${newPoints} pts).`);
    } else if (type === "round") {
      const newWins = Math.max(0, (team.wins || 0) + delta);
      team.wins = newWins;
      showFeedback(`✅ Rondas del equipo ${team.name} actualizadas (${newWins} wins).`);
    }

    eventBus.emit("game:score_updated", { teamId: team.id, points: team.points, wins: team.wins, manual: true });
    eventBus.publish("player:updated", {});
    refreshData();
  };

  const isTeamMode = String(gameMode || "").toUpperCase().includes("TEAM");

  return (
    <div style={{
      background: "linear-gradient(135deg, #1b1429, #120d22)",
      border: "2px solid rgba(255, 215, 0, 0.4)",
      borderRadius: "14px",
      padding: "20px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
      color: "white",
      display: "flex",
      flexDirection: "column",
      gap: "16px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#ffd700", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 900 }}>
          🎛️ MANUAL SCORE & ROUND CONTROL
        </h3>
        <span style={{ fontSize: "11px", color: "#00f5ff", background: "rgba(0,245,255,0.1)", padding: "3px 8px", borderRadius: "6px", fontWeight: 800 }}>
          Mode: {isTeamMode ? "TEAM (EQUIPOS)" : "INDIVIDUAL"}
        </span>
      </div>

      {feedback && (
        <div style={{
          background: feedback.isError ? "rgba(229, 62, 62, 0.2)" : "rgba(72, 187, 120, 0.2)",
          border: `1px solid ${feedback.isError ? "#e53e3e" : "#48bb78"}`,
          color: feedback.isError ? "#feb2b2" : "#9ae6b4",
          padding: "8px 12px",
          borderRadius: "8px",
          fontSize: "12px",
          fontWeight: 800,
          textAlign: "center"
        }}>
          {feedback.msg}
        </div>
      )}

      {!isTeamMode ? (
        // INDIVIDUAL CONTROLS
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", color: "#a0aec0", fontWeight: 800 }}>Seleccionar Jugador:</label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                style={{ background: "#0c091a", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", padding: "8px", fontSize: "12px", fontWeight: 700 }}
              >
                <option value="">-- Seleccionar de lista --</option>
                {players.map(p => (
                  <option key={p.id || p.playerId} value={p.id || p.playerId}>
                    {p.name || p.displayName} ({p.points || 0} pts)
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", color: "#a0aec0", fontWeight: 800 }}>O Ingresar Nombre Manual:</label>
              <input
                type="text"
                placeholder="Ej. Fernando"
                value={customPlayerName}
                onChange={(e) => setCustomPlayerName(e.target.value)}
                style={{ background: "#0c091a", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", padding: "8px", fontSize: "12px", fontWeight: 700 }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "4px" }}>
            {/* Puntos */}
            <div style={{ background: "#0c091a", padding: "12px", borderRadius: "10px", border: "1px solid rgba(0,245,255,0.2)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "#00f5ff", fontWeight: 900, textAlign: "center" }}>🪙 PUNTOS (POINTS)</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handleIndividualAction("point", 1)}
                  style={{ flex: 1, background: "linear-gradient(135deg, #48bb78, #38a169)", color: "white", border: "none", padding: "8px", borderRadius: "6px", fontWeight: 900, cursor: "pointer", fontSize: "12px" }}
                >
                  + PUNTOS (+1)
                </button>
                <button
                  onClick={() => handleIndividualAction("point", -1)}
                  style={{ flex: 1, background: "linear-gradient(135deg, #e53e3e, #c53030)", color: "white", border: "none", padding: "8px", borderRadius: "6px", fontWeight: 900, cursor: "pointer", fontSize: "12px" }}
                >
                  - PUNTOS (-1)
                </button>
              </div>
            </div>

            {/* Rondas */}
            <div style={{ background: "#0c091a", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,215,0,0.2)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "#ffd700", fontWeight: 900, textAlign: "center" }}>🏆 RONDAS (WINS)</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handleIndividualAction("round", 1)}
                  style={{ flex: 1, background: "linear-gradient(135deg, #d69e2e, #b7791f)", color: "white", border: "none", padding: "8px", borderRadius: "6px", fontWeight: 900, cursor: "pointer", fontSize: "12px" }}
                >
                  + RONDAS (+1)
                </button>
                <button
                  onClick={() => handleIndividualAction("round", -1)}
                  style={{ flex: 1, background: "linear-gradient(135deg, #c53030, #9b2c2c)", color: "white", border: "none", padding: "8px", borderRadius: "6px", fontWeight: 900, cursor: "pointer", fontSize: "12px" }}
                >
                  - RONDAS (-1)
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // TEAM CONTROLS
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", color: "#a0aec0", fontWeight: 800 }}>Seleccionar Equipo:</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              style={{ background: "#0c091a", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", padding: "8px", fontSize: "13px", fontWeight: 900 }}
            >
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.icon || "🛡️"} {t.name} ({t.points || 0} pts, {t.wins || 0} wins)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "4px" }}>
            {/* Puntos Equipo */}
            <div style={{ background: "#0c091a", padding: "12px", borderRadius: "10px", border: "1px solid rgba(0,245,255,0.2)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "#00f5ff", fontWeight: 900, textAlign: "center" }}>🪙 PUNTOS DE EQUIPO</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handleTeamAction("point", 1)}
                  style={{ flex: 1, background: "linear-gradient(135deg, #48bb78, #38a169)", color: "white", border: "none", padding: "8px", borderRadius: "6px", fontWeight: 900, cursor: "pointer", fontSize: "12px" }}
                >
                  + PUNTOS (+1)
                </button>
                <button
                  onClick={() => handleTeamAction("point", -1)}
                  style={{ flex: 1, background: "linear-gradient(135deg, #e53e3e, #c53030)", color: "white", border: "none", padding: "8px", borderRadius: "6px", fontWeight: 900, cursor: "pointer", fontSize: "12px" }}
                >
                  - PUNTOS (-1)
                </button>
              </div>
            </div>

            {/* Rondas Equipo */}
            <div style={{ background: "#0c091a", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,215,0,0.2)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "#ffd700", fontWeight: 900, textAlign: "center" }}>🏆 RONDAS DE EQUIPO</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handleTeamAction("round", 1)}
                  style={{ flex: 1, background: "linear-gradient(135deg, #d69e2e, #b7791f)", color: "white", border: "none", padding: "8px", borderRadius: "6px", fontWeight: 900, cursor: "pointer", fontSize: "12px" }}
                >
                  + RONDAS (+1)
                </button>
                <button
                  onClick={() => handleTeamAction("round", -1)}
                  style={{ flex: 1, background: "linear-gradient(135deg, #c53030, #9b2c2c)", color: "white", border: "none", padding: "8px", borderRadius: "6px", fontWeight: 900, cursor: "pointer", fontSize: "12px" }}
                >
                  - RONDAS (-1)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManualScoreControl;
