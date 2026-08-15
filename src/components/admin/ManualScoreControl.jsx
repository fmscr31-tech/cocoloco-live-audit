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

  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [customPlayerName, setCustomPlayerName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  // Amount applied by every manual +/- action. Default 1 preserves the old behavior.
  const [manualAmount, setManualAmount] = useState(1);
  const [feedback, setFeedback] = useState(null);

  const refreshData = () => {
    setGameMode(dashboardAPI.getGameMode());
    const regPlayers = registrationManager.getRegisteredPlayers();
    const corePlayers = getPlayers() || [];
    const map = new Map();

    corePlayers.forEach(p => map.set(p.id, p));
    regPlayers.forEach(p => {
      if (!map.has(p.playerId)) {
        map.set(p.playerId, {
          id: p.playerId,
          name: p.displayName || p.name,
          points: p.points || 0,
          wins: p.wins || 0
        });
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
    const unsubMode = dashboardAPI.subscribeToModeChange(({ mode }) => setGameMode(mode));
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

  const getManualAmount = () => {
    const value = Number.parseInt(manualAmount, 10);
    if (!Number.isFinite(value) || value < 1) return 1;
    return Math.min(value, 99);
  };

  const handleIndividualAction = (type, delta) => {
    let targetPlayer = null;

    if (selectedPlayerId) {
      targetPlayer = players.find(p => p.id === selectedPlayerId || p.playerId === selectedPlayerId);
    }

    if (!targetPlayer && customPlayerName.trim()) {
      targetPlayer = addPlayer({ name: customPlayerName.trim() });
      refreshData();
    }

    if (!targetPlayer) {
      showFeedback("⚠️ Selecciona o ingresa un nombre de jugador válido.", true);
      return;
    }

    const amount = getManualAmount();
    const effectiveDelta = delta * amount;

    if (type === "point") {
      const oldPoints = targetPlayer.points || 0;
      const newPoints = Math.max(0, oldPoints + effectiveDelta);
      const diff = newPoints - oldPoints;

      if (diff !== 0) {
        addPoints(targetPlayer.id || targetPlayer.playerId, diff);
        targetPlayer.points = newPoints;
      }

      showFeedback(`✅ ${diff >= 0 ? "+" : ""}${diff} puntos para ${targetPlayer.name} (${newPoints} pts).`);
    } else if (type === "round") {
      const oldWins = targetPlayer.wins || 0;
      const newWins = Math.max(0, oldWins + effectiveDelta);
      const diff = newWins - oldWins;
      targetPlayer.wins = newWins;

      showFeedback(`✅ ${diff >= 0 ? "+" : ""}${diff} rondas para ${targetPlayer.name} (${newWins} wins).`);
    }

    eventBus.emit("game:score_updated", {
      playerId: targetPlayer.id,
      points: targetPlayer.points,
      wins: targetPlayer.wins,
      manual: true
    });
    eventBus.publish("player:updated", { player: targetPlayer });
    refreshData();
  };

  const handleTeamAction = (type, delta) => {
    const team = teams.find(t => t.id === selectedTeamId);
    if (!team) {
      showFeedback("⚠️ Selecciona un equipo válido.", true);
      return;
    }

    const amount = getManualAmount();
    const effectiveDelta = delta * amount;

    if (type === "point") {
      const oldPoints = team.points || 0;
      const newPoints = Math.max(0, oldPoints + effectiveDelta);
      const diff = newPoints - oldPoints;

      if (diff !== 0) {
        addTeamPoints(team.id, diff);
        team.points = newPoints;
      }

      showFeedback(`✅ ${diff >= 0 ? "+" : ""}${diff} puntos para ${team.name} (${newPoints} pts).`);
    } else if (type === "round") {
      const oldWins = team.wins || 0;
      const newWins = Math.max(0, oldWins + effectiveDelta);
      const diff = newWins - oldWins;
      team.wins = newWins;

      showFeedback(`✅ ${diff >= 0 ? "+" : ""}${diff} rondas para ${team.name} (${newWins} wins).`);
    }

    eventBus.emit("game:score_updated", {
      teamId: team.id,
      points: team.points,
      wins: team.wins,
      manual: true
    });
    eventBus.publish("player:updated", {});
    refreshData();
  };

  const isTeamMode = String(gameMode || "").toUpperCase().includes("TEAM");

  const buttonBase = {
    flex: 1,
    color: "white",
    border: "none",
    padding: "8px",
    borderRadius: "6px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "12px"
  };

  const amountControl = (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      background: "rgba(0,245,255,0.06)",
      border: "1px solid rgba(0,245,255,0.18)",
      borderRadius: "8px",
      padding: "8px 10px"
    }}>
      <label htmlFor="manual-score-amount" style={{ fontSize: "11px", color: "#00f5ff", fontWeight: 900 }}>
        CANTIDAD:
      </label>
      <button
        type="button"
        onClick={() => setManualAmount(value => Math.max(1, Number(value) - 1))}
        style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)", background: "#171126", color: "white", fontWeight: 900, cursor: "pointer" }}
      >−</button>
      <input
        id="manual-score-amount"
        type="number"
        min="1"
        max="99"
        step="1"
        value={manualAmount}
        onChange={(e) => {
          const value = Number.parseInt(e.target.value, 10);
          setManualAmount(Number.isFinite(value) ? Math.min(99, Math.max(1, value)) : 1);
        }}
        style={{ width: "64px", textAlign: "center", background: "#0c091a", color: "white", border: "1px solid rgba(0,245,255,0.4)", borderRadius: "6px", padding: "6px", fontSize: "14px", fontWeight: 900 }}
      />
      <button
        type="button"
        onClick={() => setManualAmount(value => Math.min(99, Number(value) + 1))}
        style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)", background: "#171126", color: "white", fontWeight: 900, cursor: "pointer" }}
      >+</button>
      <span style={{ fontSize: "10px", color: "#a0aec0", fontWeight: 700 }}>por acción</span>
    </div>
  );

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

          {amountControl}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "4px" }}>
            <div style={{ background: "#0c091a", padding: "12px", borderRadius: "10px", border: "1px solid rgba(0,245,255,0.2)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "#00f5ff", fontWeight: 900, textAlign: "center" }}>🪙 PUNTOS (POINTS)</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => handleIndividualAction("point", 1)} style={{ ...buttonBase, background: "linear-gradient(135deg, #48bb78, #38a169)" }}>
                  + PUNTOS (+{getManualAmount()})
                </button>
                <button onClick={() => handleIndividualAction("point", -1)} style={{ ...buttonBase, background: "linear-gradient(135deg, #e53e3e, #c53030)" }}>
                  - PUNTOS (-{getManualAmount()})
                </button>
              </div>
            </div>

            <div style={{ background: "#0c091a", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,215,0,0.2)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "#ffd700", fontWeight: 900, textAlign: "center" }}>🏆 RONDAS (WINS)</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => handleIndividualAction("round", 1)} style={{ ...buttonBase, background: "linear-gradient(135deg, #d69e2e, #b7791f)" }}>
                  + RONDAS (+{getManualAmount()})
                </button>
                <button onClick={() => handleIndividualAction("round", -1)} style={{ ...buttonBase, background: "linear-gradient(135deg, #c53030, #9b2c2c)" }}>
                  - RONDAS (-{getManualAmount()})
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
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

          {amountControl}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "4px" }}>
            <div style={{ background: "#0c091a", padding: "12px", borderRadius: "10px", border: "1px solid rgba(0,245,255,0.2)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "#00f5ff", fontWeight: 900, textAlign: "center" }}>🪙 PUNTOS DE EQUIPO</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => handleTeamAction("point", 1)} style={{ ...buttonBase, background: "linear-gradient(135deg, #48bb78, #38a169)" }}>
                  + PUNTOS (+{getManualAmount()})
                </button>
                <button onClick={() => handleTeamAction("point", -1)} style={{ ...buttonBase, background: "linear-gradient(135deg, #e53e3e, #c53030)" }}>
                  - PUNTOS (-{getManualAmount()})
                </button>
              </div>
            </div>

            <div style={{ background: "#0c091a", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,215,0,0.2)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "#ffd700", fontWeight: 900, textAlign: "center" }}>🏆 RONDAS DE EQUIPO</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => handleTeamAction("round", 1)} style={{ ...buttonBase, background: "linear-gradient(135deg, #d69e2e, #b7791f)" }}>
                  + RONDAS (+{getManualAmount()})
                </button>
                <button onClick={() => handleTeamAction("round", -1)} style={{ ...buttonBase, background: "linear-gradient(135deg, #c53030, #9b2c2c)" }}>
                  - RONDAS (-{getManualAmount()})
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
