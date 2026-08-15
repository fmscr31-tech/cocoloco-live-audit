import { useState, useEffect } from "react";
import { getPlayers, addPlayer, addPoints } from "../../core/playerManager";
import { getTeams, addTeamPoints } from "../../core/TeamManager";
import { dashboardAPI } from "../../core/dashboardAPI";
import { registrationManager } from "../../core/registrationManager";
import { eventBus } from "../../core/eventBus";

const clampAmount = (value) => Math.max(1, Math.min(99, Number(value) || 1));

function playerIdentityMatches(core, registered) {
  const ids = [core.id, core.playerId, core.tiktokId, core.username].filter(Boolean).map(String);
  const registeredIds = [registered.playerId, registered.id, registered.username].filter(Boolean).map(String);
  if (ids.some(id => registeredIds.includes(id))) return true;

  const coreName = String(core.displayName || core.name || "").trim().toLowerCase();
  const registeredName = String(registered.displayName || registered.name || registered.username || "").trim().toLowerCase();
  return Boolean(coreName && registeredName && coreName === registeredName);
}

function buildCanonicalPlayers() {
  const corePlayers = getPlayers() || [];
  const registeredPlayers = registrationManager.getRegisteredPlayers() || [];
  const result = [];
  const seenIds = new Set();

  corePlayers.forEach(player => {
    if (!player) return;
    const key = String(player.id || player.playerId || player.tiktokId || player.username || player.name || "").trim();
    if (!key || seenIds.has(key)) return;
    seenIds.add(key);
    result.push({ ...player });
  });

  registeredPlayers.forEach(registered => {
    if (!registered) return;
    const existing = result.find(player => playerIdentityMatches(player, registered));

    if (existing) {
      existing.playerId = existing.playerId || registered.playerId;
      existing.tiktokId = existing.tiktokId || registered.playerId;
      existing.username = existing.username || registered.username;
      existing.displayName = existing.displayName || registered.displayName;
      existing.name = existing.name || registered.displayName || registered.name;
      existing.teamId = existing.teamId || registered.teamId || null;
      return;
    }

    const fallbackId = registered.playerId || registered.id || registered.username;
    if (!fallbackId || seenIds.has(String(fallbackId))) return;
    seenIds.add(String(fallbackId));
    result.push({
      id: fallbackId,
      playerId: fallbackId,
      tiktokId: fallbackId,
      username: registered.username || registered.displayName || fallbackId,
      name: registered.displayName || registered.name || registered.username || fallbackId,
      displayName: registered.displayName || registered.name || registered.username || fallbackId,
      points: Number(registered.points) || 0,
      wins: Number(registered.wins) || 0,
      teamId: registered.teamId || null
    });
  });

  return result;
}

export function ManualScoreControl() {
  const [gameMode, setGameMode] = useState(dashboardAPI.getGameMode());
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [customPlayerName, setCustomPlayerName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [feedback, setFeedback] = useState(null);

  const refreshData = () => {
    setGameMode(dashboardAPI.getGameMode());
    const nextPlayers = buildCanonicalPlayers();
    const nextTeams = getTeams() || [];
    setPlayers(nextPlayers);
    setTeams(nextTeams);

    if (selectedPlayerId && !nextPlayers.some(p => String(p.id || p.playerId) === String(selectedPlayerId))) {
      setSelectedPlayerId("");
    }
    if (selectedTeamId && !nextTeams.some(t => String(t.id) === String(selectedTeamId))) {
      setSelectedTeamId(nextTeams[0]?.id || "");
    }
    if (!selectedTeamId && nextTeams.length) setSelectedTeamId(nextTeams[0].id);
  };

  useEffect(() => {
    refreshData();
    const unsubMode = dashboardAPI.subscribeToModeChange(({ mode }) => setGameMode(mode));
    const unsubReg = eventBus.subscribe("registration:updated", refreshData);
    const unsubScore = eventBus.subscribe("game:score_updated", refreshData);
    const unsubPlayer = eventBus.subscribe("player:updated", refreshData);
    const unsubCreated = eventBus.subscribe("player:created", refreshData);
    const unsubRemoved = eventBus.subscribe("registration:player_removed", refreshData);

    return () => {
      unsubMode && unsubMode();
      unsubReg && unsubReg();
      unsubScore && unsubScore();
      unsubPlayer && unsubPlayer();
      unsubCreated && unsubCreated();
      unsubRemoved && unsubRemoved();
    };
  }, []);

  const showFeedback = (message, isError = false) => {
    setFeedback({ message, isError });
    window.setTimeout(() => setFeedback(null), 2500);
  };

  const getSelectedPlayer = () => {
    if (selectedPlayerId) {
      return players.find(p => String(p.id || p.playerId) === String(selectedPlayerId)) || null;
    }

    if (customPlayerName.trim()) {
      return addPlayer({ name: customPlayerName.trim() });
    }

    return null;
  };

  const handleIndividualAction = (type, delta) => {
    const target = getSelectedPlayer();
    if (!target) {
      showFeedback("⚠️ Selecciona un jugador antes de aplicar el ajuste.", true);
      return;
    }

    const amount = clampAmount(delta);
    const signedAmount = type === "point" ? amount : amount;
    const current = Number(type === "point" ? target.points : target.wins) || 0;
    const next = Math.max(0, current + signedAmount);
    const actualDelta = next - current;

    if (actualDelta !== 0) {
      if (type === "point") {
        addPoints(target.id || target.playerId, actualDelta);
        target.points = next;
      } else {
        target.wins = next;
        eventBus.emit("game:score_updated", {
          playerId: target.id || target.playerId,
          points: target.points || 0,
          wins: target.wins,
          manual: true,
          playerSnapshot: { ...target }
        });
      }
    }

    showFeedback(`✅ ${type === "point" ? "Puntos" : "Rondas"}: ${actualDelta >= 0 ? "+" : ""}${actualDelta} → ${target.name || target.displayName} (${next}).`);
    eventBus.publish("player:updated", { player: { ...target } });
    refreshData();
  };

  const handleTeamAction = (type, delta) => {
    const team = teams.find(t => String(t.id) === String(selectedTeamId));
    if (!team) {
      showFeedback("⚠️ Selecciona un equipo válido.", true);
      return;
    }

    const amount = clampAmount(delta);
    const current = Number(type === "point" ? team.points : team.wins) || 0;
    const next = Math.max(0, current + amount);
    const actualDelta = next - current;

    if (type === "point" && actualDelta !== 0) {
      addTeamPoints(team.id, actualDelta);
      team.points = next;
    } else if (type === "round") {
      team.wins = next;
    }

    showFeedback(`✅ ${type === "point" ? "Puntos" : "Rondas"}: ${actualDelta >= 0 ? "+" : ""}${actualDelta} → ${team.name} (${next}).`);
    eventBus.emit("game:score_updated", {
      teamId: team.id,
      points: team.points || 0,
      wins: team.wins || 0,
      manual: true
    });
    refreshData();
  };

  const isTeamMode = String(gameMode || "").toUpperCase().includes("TEAM");

  const buttonBase = {
    flex: 1,
    color: "white",
    border: "none",
    padding: "9px 6px",
    borderRadius: "6px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "12px"
  };

  const ActionButtons = ({ type, onAction, positiveLabel, negativeLabel }) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr) 1fr repeat(3, 1fr)", gap: "5px" }}>
      {[1, 5, 10].map(amount => (
        <button key={`plus-${amount}`} onClick={() => onAction(type, amount)} style={{ ...buttonBase, background: "linear-gradient(135deg, #48bb78, #38a169)" }}>
          +{amount}
        </button>
      ))}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#718096", fontSize: "10px", fontWeight: 900 }}>AJUSTE</div>
      {[1, 5, 10].map(amount => (
        <button key={`minus-${amount}`} onClick={() => onAction(type, -amount)} style={{ ...buttonBase, background: "linear-gradient(135deg, #e53e3e, #c53030)" }}>
          −{amount}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ background: "linear-gradient(135deg, #1b1429, #120d22)", border: "2px solid rgba(255, 215, 0, 0.4)", borderRadius: "14px", padding: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.6)", color: "white", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#ffd700", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 900 }}>🎛️ MANUAL SCORE & ROUND CONTROL</h3>
        <span style={{ fontSize: "11px", color: "#00f5ff", background: "rgba(0,245,255,0.1)", padding: "3px 8px", borderRadius: "6px", fontWeight: 800 }}>Mode: {isTeamMode ? "TEAM (EQUIPOS)" : "INDIVIDUAL"}</span>
      </div>

      {feedback && (
        <div style={{ background: feedback.isError ? "rgba(229,62,62,.2)" : "rgba(72,187,120,.2)", border: `1px solid ${feedback.isError ? "#e53e3e" : "#48bb78"}`, color: feedback.isError ? "#feb2b2" : "#9ae6b4", padding: "8px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 800, textAlign: "center" }}>
          {feedback.message}
        </div>
      )}

      {!isTeamMode ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", color: "#a0aec0", fontWeight: 800 }}>Seleccionar Jugador:</label>
              <select value={selectedPlayerId} onChange={e => { setSelectedPlayerId(e.target.value); setCustomPlayerName(""); }} style={{ background: "#0c091a", color: "white", border: "1px solid rgba(255,255,255,.2)", borderRadius: "6px", padding: "8px", fontSize: "12px", fontWeight: 700 }}>
                <option value="">-- Seleccionar de lista --</option>
                {players.map(p => {
                  const id = p.id || p.playerId;
                  return <option key={String(id)} value={String(id)}>{p.name || p.displayName} ({Number(p.points) || 0} pts)</option>;
                })}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", color: "#a0aec0", fontWeight: 800 }}>O crear/usar nombre manual:</label>
              <input type="text" placeholder="Ej. Fernando" value={customPlayerName} onChange={e => { setCustomPlayerName(e.target.value); setSelectedPlayerId(""); }} style={{ background: "#0c091a", color: "white", border: "1px solid rgba(255,255,255,.2)", borderRadius: "6px", padding: "8px", fontSize: "12px", fontWeight: 700 }} />
            </div>
          </div>

          <div style={{ padding: "8px 10px", background: "rgba(0,245,255,.05)", border: "1px solid rgba(0,245,255,.15)", borderRadius: "8px", color: "#a0aec0", fontSize: "11px", textAlign: "center", fontWeight: 800 }}>
            CADA BOTÓN ES UNA ACCIÓN INDEPENDIENTE · NO QUEDA NINGUNA CANTIDAD GUARDADA
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ background: "#0c091a", padding: "12px", borderRadius: "10px", border: "1px solid rgba(0,245,255,.2)", display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "11px", color: "#00f5ff", fontWeight: 900, textAlign: "center" }}>🪙 PUNTOS</span>
              <ActionButtons type="point" onAction={handleIndividualAction} />
            </div>
            <div style={{ background: "#0c091a", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,215,0,.2)", display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "11px", color: "#ffd700", fontWeight: 900, textAlign: "center" }}>🏆 RONDAS (WINS)</span>
              <ActionButtons type="round" onAction={handleIndividualAction} />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", color: "#a0aec0", fontWeight: 800 }}>Seleccionar Equipo:</label>
            <select value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} style={{ background: "#0c091a", color: "white", border: "1px solid rgba(255,255,255,.2)", borderRadius: "6px", padding: "8px", fontSize: "13px", fontWeight: 900 }}>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({Number(t.points) || 0} pts)</option>)}
            </select>
          </div>
          <div style={{ padding: "8px 10px", background: "rgba(0,245,255,.05)", border: "1px solid rgba(0,245,255,.15)", borderRadius: "8px", color: "#a0aec0", fontSize: "11px", textAlign: "center", fontWeight: 800 }}>
            CADA BOTÓN ES UNA ACCIÓN INDEPENDIENTE · NO QUEDA NINGUNA CANTIDAD GUARDADA
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ background: "#0c091a", padding: "12px", borderRadius: "10px", border: "1px solid rgba(0,245,255,.2)", display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "11px", color: "#00f5ff", fontWeight: 900, textAlign: "center" }}>🪙 PUNTOS</span>
              <ActionButtons type="point" onAction={handleTeamAction} />
            </div>
            <div style={{ background: "#0c091a", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,215,0,.2)", display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontSize: "11px", color: "#ffd700", fontWeight: 900, textAlign: "center" }}>🏆 RONDAS (WINS)</span>
              <ActionButtons type="round" onAction={handleTeamAction} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
