import { useState, useEffect, useRef } from "react";
import { getPlayers, addPlayer, addPoints } from "../../core/playerManager";
import { getTeams, addTeamPoints, adjustTeamWins, syncConfiguredTeams } from "../../core/TeamManager";
import { dashboardAPI } from "../../core/dashboardAPI";
import { registrationManager } from "../../core/registrationManager";
import { commandConfigManager } from "../../core/commandConfigManager";
import { eventBus } from "../../core/eventBus";

const getAmount = value => Math.min(99, Math.max(1, Math.abs(Number(value)) || 1));

function samePlayer(core, registered) {
  const coreIds = [core.id, core.playerId, core.tiktokId, core.username].filter(Boolean).map(String);
  const regIds = [registered.playerId, registered.id, registered.username].filter(Boolean).map(String);
  if (coreIds.some(id => regIds.includes(id))) return true;
  const a = String(core.displayName || core.name || "").trim().toLowerCase();
  const b = String(registered.displayName || registered.name || registered.username || "").trim().toLowerCase();
  return Boolean(a && b && a === b);
}

function buildCanonicalPlayers() {
  const core = getPlayers() || [];
  const registered = registrationManager.getRegisteredPlayers() || [];
  const result = [];
  const seen = new Set();

  core.forEach(player => {
    if (!player) return;
    const key = String(player.id || player.playerId || player.tiktokId || player.username || player.name || "");
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push({ ...player });
  });

  registered.forEach(reg => {
    if (!reg) return;
    const existing = result.find(player => samePlayer(player, reg));
    if (existing) {
      existing.playerId = existing.playerId || reg.playerId;
      existing.tiktokId = existing.tiktokId || reg.playerId;
      existing.username = existing.username || reg.username;
      existing.displayName = existing.displayName || reg.displayName;
      existing.name = existing.name || reg.displayName || reg.name;
      existing.teamId = existing.teamId || reg.teamId || null;
      return;
    }

    const id = reg.playerId || reg.id || reg.username;
    if (!id || seen.has(String(id))) return;
    seen.add(String(id));
    result.push({
      id,
      playerId: id,
      tiktokId: id,
      username: reg.username || reg.displayName || id,
      name: reg.displayName || reg.name || reg.username || id,
      displayName: reg.displayName || reg.name || reg.username || id,
      points: Number(reg.points) || 0,
      wins: Number(reg.wins) || 0,
      teamId: reg.teamId || null
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

  // React state is asynchronous. EventBus callbacks registered once on mount
  // can otherwise keep the initial selectedTeamId (usually "") and fall back
  // to the first team after every score event. The refs below are the runtime
  // truth for the current manual selector and are updated synchronously when
  // the user changes the dropdown.
  const selectedTeamIdRef = useRef("");
  const selectedPlayerIdRef = useRef("");

  const setSelectedTeam = value => {
    const normalized = String(value || "");
    selectedTeamIdRef.current = normalized;
    setSelectedTeamId(normalized);
  };

  const setSelectedPlayer = value => {
    const normalized = String(value || "");
    selectedPlayerIdRef.current = normalized;
    setSelectedPlayerId(normalized);
  };

  // Configuration synchronization is only performed when configuration changes
  // or when no runtime teams exist. A score event must NEVER recreate the team
  // list, because doing so can overwrite a just-applied manual score.
  const refreshData = (forceTeamSync = false) => {
    const mode = dashboardAPI.getGameMode();
    setGameMode(mode);

    const nextPlayers = buildCanonicalPlayers();
    setPlayers(nextPlayers);

    const configTeams = commandConfigManager.getConfig().teams || [];
    const runtimeTeams = getTeams();
    const nextTeams = forceTeamSync || runtimeTeams.length === 0
      ? syncConfiguredTeams(configTeams)
      : runtimeTeams;
    setTeams(nextTeams);

    const currentPlayerId = selectedPlayerIdRef.current;
    if (currentPlayerId && !nextPlayers.some(p => String(p.id || p.playerId) === currentPlayerId)) {
      selectedPlayerIdRef.current = "";
      setSelectedPlayerId("");
    }

    const currentTeamId = selectedTeamIdRef.current;
    if (nextTeams.length) {
      const selectedStillExists = currentTeamId && nextTeams.some(t => String(t.id) === currentTeamId);
      if (!selectedStillExists) {
        const fallback = String(nextTeams[0].id);
        selectedTeamIdRef.current = fallback;
        setSelectedTeamId(fallback);
      }
    } else if (currentTeamId) {
      selectedTeamIdRef.current = "";
      setSelectedTeamId("");
    }
  };

  useEffect(() => {
    refreshData(true);
    const subscriptions = [
      dashboardAPI.subscribeToModeChange(({ mode }) => {
        setGameMode(mode);
        refreshData(false);
      }),
      eventBus.subscribe("registration:updated", () => refreshData(false)),
      eventBus.subscribe("config:command_updated", () => refreshData(true)),
      eventBus.subscribe("game:score_updated", () => refreshData(false)),
      eventBus.subscribe("player:updated", () => refreshData(false)),
      eventBus.subscribe("player:created", () => refreshData(false)),
      eventBus.subscribe("registration:player_removed", () => refreshData(false))
    ];
    return () => subscriptions.forEach(unsub => unsub && unsub());
  }, []);

  const showFeedback = (message, isError = false) => {
    setFeedback({ message, isError });
    window.setTimeout(() => setFeedback(null), 2500);
  };

  const targetPlayer = () => {
    const currentPlayerId = selectedPlayerIdRef.current;
    if (currentPlayerId) return players.find(p => String(p.id || p.playerId) === currentPlayerId) || null;
    if (customPlayerName.trim()) return addPlayer({ name: customPlayerName.trim() });
    return null;
  };

  const handleIndividualAction = (type, delta) => {
    const player = targetPlayer();
    if (!player) {
      showFeedback("⚠️ Selecciona un jugador antes de aplicar el ajuste.", true);
      return;
    }

    const amount = getAmount(delta);
    const signedDelta = delta < 0 ? -amount : amount;
    const current = Number(type === "point" ? player.points : player.wins) || 0;
    const next = Math.max(0, current + signedDelta);
    const actualDelta = next - current;

    if (actualDelta !== 0) {
      if (type === "point") {
        addPoints(player.id || player.playerId, actualDelta);
        player.points = next;
      } else {
        player.wins = next;
        eventBus.emit("game:score_updated", {
          playerId: player.id || player.playerId,
          points: player.points || 0,
          wins: player.wins,
          manual: true,
          playerSnapshot: { ...player }
        });
      }
    }

    showFeedback(`✅ ${type === "point" ? "Puntos" : "Rondas"}: ${actualDelta >= 0 ? "+" : ""}${actualDelta} → ${player.name || player.displayName} (${next}).`);
    eventBus.publish("player:updated", { player: { ...player } });
    refreshData(false);
  };

  const handleTeamAction = (type, delta) => {
    const currentTeamId = selectedTeamIdRef.current;
    const team = teams.find(t => String(t.id) === currentTeamId);
    if (!team) {
      showFeedback("⚠️ Selecciona un equipo válido.", true);
      refreshData(false);
      return;
    }

    const amount = getAmount(delta);
    const signedDelta = delta < 0 ? -amount : amount;
    const current = Number(type === "point" ? team.points : team.wins) || 0;
    const next = Math.max(0, current + signedDelta);
    const actualDelta = next - current;

    if (actualDelta === 0) {
      showFeedback(`ℹ️ El ajuste dejaría ${type === "point" ? "los puntos" : "las rondas"} de ${team.name} en 0.`, false);
      return;
    }

    const updated = type === "point"
      ? addTeamPoints(currentTeamId, actualDelta)
      : adjustTeamWins(currentTeamId, actualDelta);

    if (!updated) {
      showFeedback(`❌ No se pudo actualizar ${team.name}. El equipo ya no existe en el registro canónico.`, true);
      refreshData(true);
      return;
    }

    // Keep the selector locked to the exact team the user chose. The score event
    // can trigger refreshData immediately, but refreshData now reads the ref and
    // therefore cannot silently switch the selection to team1/teamA.
    selectedTeamIdRef.current = currentTeamId;
    setSelectedTeamId(currentTeamId);

    const updatedPoints = Number(updated.points) || 0;
    const updatedWins = Number(updated.wins) || 0;

    showFeedback(`✅ ${type === "point" ? "Puntos" : "Rondas"}: ${actualDelta >= 0 ? "+" : ""}${actualDelta} → ${team.name} (${type === "point" ? updatedPoints : updatedWins}).`);
    eventBus.emit("game:score_updated", {
      teamId: currentTeamId,
      teamName: team.name,
      points: updatedPoints,
      wins: updatedWins,
      manual: true,
      targetType: type,
      delta: actualDelta,
      timestamp: Date.now()
    });

    refreshData(false);
  };

  const isTeamMode = String(gameMode || "").toUpperCase().includes("TEAM");
  const buttonBase = { color: "white", border: "none", padding: "9px 6px", borderRadius: "6px", fontWeight: 900, cursor: "pointer", fontSize: "12px" };

  const ActionButtons = ({ type, onAction }) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr) 1fr repeat(3, 1fr)", gap: "5px" }}>
      {[1, 5, 10].map(amount => <button key={`plus-${amount}`} onClick={() => onAction(type, amount)} style={{ ...buttonBase, background: "linear-gradient(135deg, #48bb78, #38a169)" }}>+{amount}</button>)}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#718096", fontSize: "10px", fontWeight: 900 }}>AJUSTE</div>
      {[1, 5, 10].map(amount => <button key={`minus-${amount}`} onClick={() => onAction(type, -amount)} style={{ ...buttonBase, background: "linear-gradient(135deg, #e53e3e, #c53030)" }}>−{amount}</button>)}
    </div>
  );

  const modeHelp = "CADA BOTÓN ES UNA ACCIÓN INDEPENDIENTE · NO QUEDA NINGUNA CANTIDAD GUARDADA";

  return (
    <div style={{ background: "linear-gradient(135deg, #1b1429, #120d22)", border: "2px solid rgba(255,215,0,.4)", borderRadius: "14px", padding: "20px", boxShadow: "0 10px 30px rgba(0,0,0,.6)", color: "white", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,.1)", paddingBottom: "10px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#ffd700", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 900 }}>🎛️ MANUAL SCORE & ROUND CONTROL</h3>
        <span style={{ fontSize: "11px", color: "#00f5ff", background: "rgba(0,245,255,.1)", padding: "3px 8px", borderRadius: "6px", fontWeight: 800 }}>Mode: {isTeamMode ? "TEAM (EQUIPOS)" : "INDIVIDUAL"}</span>
      </div>

      {feedback && <div style={{ background: feedback.isError ? "rgba(229,62,62,.2)" : "rgba(72,187,120,.2)", border: `1px solid ${feedback.isError ? "#e53e3e" : "#48bb78"}`, color: feedback.isError ? "#feb2b2" : "#9ae6b4", padding: "8px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 800, textAlign: "center" }}>{feedback.message}</div>}

      {!isTeamMode ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", color: "#a0aec0", fontWeight: 800 }}>Seleccionar Jugador:</label>
              <select value={selectedPlayerId} onChange={e => { setSelectedPlayer(e.target.value); setCustomPlayerName(""); }} style={{ background: "#0c091a", color: "white", border: "1px solid rgba(255,255,255,.2)", borderRadius: "6px", padding: "8px", fontSize: "12px", fontWeight: 700 }}>
                <option value="">-- Seleccionar de lista --</option>
                {players.map(p => { const id = p.id || p.playerId; return <option key={String(id)} value={String(id)}>{p.name || p.displayName} ({Number(p.points) || 0} pts)</option>; })}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", color: "#a0aec0", fontWeight: 800 }}>O crear/usar nombre manual:</label>
              <input type="text" placeholder="Ej. Fernando" value={customPlayerName} onChange={e => { setCustomPlayerName(e.target.value); setSelectedPlayer(""); }} style={{ background: "#0c091a", color: "white", border: "1px solid rgba(255,255,255,.2)", borderRadius: "6px", padding: "8px", fontSize: "12px", fontWeight: 700 }} />
            </div>
          </div>
          <div style={{ padding: "8px 10px", background: "rgba(0,245,255,.05)", border: "1px solid rgba(0,245,255,.15)", borderRadius: "8px", color: "#a0aec0", fontSize: "11px", textAlign: "center", fontWeight: 800 }}>{modeHelp}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ background: "#0c091a", padding: "12px", borderRadius: "10px", border: "1px solid rgba(0,245,255,.2)", display: "flex", flexDirection: "column", gap: "10px" }}><span style={{ fontSize: "11px", color: "#00f5ff", fontWeight: 900, textAlign: "center" }}>🪙 PUNTOS</span><ActionButtons type="point" onAction={handleIndividualAction} /></div>
            <div style={{ background: "#0c091a", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,215,0,.2)", display: "flex", flexDirection: "column", gap: "10px" }}><span style={{ fontSize: "11px", color: "#ffd700", fontWeight: 900, textAlign: "center" }}>🏆 RONDAS (WINS)</span><ActionButtons type="round" onAction={handleIndividualAction} /></div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", color: "#a0aec0", fontWeight: 800 }}>Seleccionar Equipo:</label>
            <select value={selectedTeamId} onChange={e => setSelectedTeam(e.target.value)} style={{ background: "#0c091a", color: "white", border: "1px solid rgba(255,255,255,.2)", borderRadius: "6px", padding: "8px", fontSize: "13px", fontWeight: 900 }}>
              {teams.length === 0 ? <option value="">-- No hay equipos configurados --</option> : teams.map(t => <option key={t.id} value={String(t.id)}>{t.name} ({Number(t.points) || 0} pts)</option>)}
            </select>
          </div>
          <div style={{ padding: "8px 10px", background: "rgba(0,245,255,.05)", border: "1px solid rgba(0,245,255,.15)", borderRadius: "8px", color: "#a0aec0", fontSize: "11px", textAlign: "center", fontWeight: 800 }}>{modeHelp}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ background: "#0c091a", padding: "12px", borderRadius: "10px", border: "1px solid rgba(0,245,255,.2)", display: "flex", flexDirection: "column", gap: "10px" }}><span style={{ fontSize: "11px", color: "#00f5ff", fontWeight: 900, textAlign: "center" }}>🪙 PUNTOS</span><ActionButtons type="point" onAction={handleTeamAction} /></div>
            <div style={{ background: "#0c091a", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,215,0,.2)", display: "flex", flexDirection: "column", gap: "10px" }}><span style={{ fontSize: "11px", color: "#ffd700", fontWeight: 900, textAlign: "center" }}>🏆 RONDAS (WINS)</span><ActionButtons type="round" onAction={handleTeamAction} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
