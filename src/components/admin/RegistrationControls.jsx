import { useState, useEffect, useMemo } from "react";
import { dashboardAPI } from "../../core/dashboardAPI";
import { registrationManager } from "../../core/registrationManager";
import { commandConfigManager } from "../../core/commandConfigManager";
import { eventBus } from "../../core/eventBus";
import { connectorManager } from "../../core/connectors/connectorManager";
import { beginRound, startGameTimer } from "../../core/gameEngine";

const isTeamMode = mode => ["TEAM", "TEAMS", "GENDER_TEAMS"].includes(String(mode || "").toUpperCase());
const isGenderMode = mode => String(mode || "").toUpperCase() === "GENDER_TEAMS";

export function RegistrationControls() {
  const initialConfig = commandConfigManager.getConfig();
  const [dashboard, setDashboard] = useState(dashboardAPI.getLiveDashboard());
  const [config, setConfig] = useState(initialConfig);
  const [connectionStatus, setConnectionStatus] = useState("DISCONNECTED");
  const [activityFeed, setActivityFeed] = useState([]);
  const [configErrors, setConfigErrors] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [gameMode, setGameMode] = useState(dashboardAPI.getGameMode());
  const [individualCommand, setIndividualCommand] = useState(initialConfig.individualCommand || "entrar");
  const [minPlayers, setMinPlayers] = useState(initialConfig.minPlayers ?? 1);
  const [maxPlayers, setMaxPlayers] = useState(initialConfig.maxPlayers ?? 100);
  const [teams, setTeams] = useState(initialConfig.teams || []);
  const [roundDuration, setRoundDuration] = useState(20);
  const [manualNames, setManualNames] = useState({});

  const genderMode = isGenderMode(gameMode);
  const teamMode = isTeamMode(gameMode);

  useEffect(() => {
    const unsubMode = dashboardAPI.subscribeToModeChange(({ mode }) => setGameMode(mode));
    return () => unsubMode?.();
  }, []);

  useEffect(() => {
    if (teams.length && !teams.some(t => t.id === manualNames.__selectedTeam)) {
      setManualNames(prev => ({ ...prev, __selectedTeam: teams[0].id }));
    }
  }, [teams]);

  useEffect(() => {
    const unsubCfg = eventBus.subscribe("config:command_updated", ({ config: newCfg }) => {
      if (!newCfg) return;
      setConfig(newCfg);
      setIndividualCommand(newCfg.individualCommand || "entrar");
      setMinPlayers(newCfg.minPlayers ?? 1);
      setMaxPlayers(newCfg.maxPlayers ?? 100);
      setTeams(newCfg.teams || []);
    });
    const unsubDash = dashboardAPI.subscribe(dash => dash && setDashboard(dash));

    const updateConnectorStatus = () => {
      try {
        const statuses = connectorManager.getStatusAll();
        setConnectionStatus(statuses.tiktok?.status || connectorManager.getConnector("tiktok")?.status || "DISCONNECTED");
      } catch {
        setConnectionStatus("DISCONNECTED");
      }
    };
    updateConnectorStatus();
    const interval = setInterval(updateConnectorStatus, 2000);

    const addActivity = (type, detail) => setActivityFeed(prev => [
      { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), type, detail },
      ...prev.slice(0, 19)
    ]);
    const unsubChat = eventBus.subscribe("normalized:chat", e => addActivity("CHAT", `${e.username || e.displayName || "User"}: "${e.message || ""}"`));
    const unsubAccepted = eventBus.subscribe("chat:command_accepted", ({ event, player, teamId }) => addActivity("SUCCESS", `${player?.displayName || "Player"} registrado${teamId ? ` en ${teamId}` : ` con "${event?.message || ""}"`}`));
    const unsubRejected = eventBus.subscribe("chat:command_rejected", ({ event, reason }) => addActivity(reason || "REJECTED", `${event?.displayName || "User"}: "${event?.message || ""}" (${reason})`));
    const unsubDuplicate = eventBus.subscribe("registration:duplicate_attempt", ({ playerId, player }) => addActivity("ALREADY_REGISTERED", `${player?.displayName || playerId} ya estaba inscrito`));
    const unsubClosed = eventBus.subscribe("registration:closed", () => addActivity("REGISTRATION_CLOSED", "Registro cerrado"));
    const unsubRegistered = eventBus.subscribe("registration:player_registered", ({ player }) => addActivity("REGISTERED", `Jugador inscrito: ${player?.displayName || player?.username}`));
    const unsubRemoved = eventBus.subscribe("registration:player_removed", ({ player }) => addActivity("REMOVED", `Jugador eliminado: ${player?.displayName || player?.username}`));

    return () => {
      unsubCfg?.(); unsubDash?.(); clearInterval(interval);
      unsubChat?.(); unsubAccepted?.(); unsubRejected?.(); unsubDuplicate?.();
      unsubClosed?.(); unsubRegistered?.(); unsubRemoved?.();
    };
  }, []);

  const notify = msg => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 3500);
  };

  const handleSaveConfig = () => {
    dashboardAPI.setGameMode(gameMode);
    const res = commandConfigManager.updateFullConfig({
      gameRegistrationMode: gameMode,
      individualCommand,
      minPlayers: Number(minPlayers),
      maxPlayers: Number(maxPlayers),
      teams
    });
    if (res.success) {
      setConfigErrors([]);
      setConfig(commandConfigManager.getConfig());
      notify("✅ Configuración de inscripción guardada correctamente.");
    } else {
      setConfigErrors(res.errors || []);
      notify("❌ Error en la validación de configuración.");
    }
  };

  const handleAddTeam = () => {
    const index = teams.length + 1;
    const id = `team_${Date.now()}`;
    const newTeam = {
      id,
      name: `Equipo ${index}`,
      color: index === 1 ? "#22a7f0" : index === 2 ? "#ff5ca8" : "#ffd700",
      commands: [`!t${index}`],
      minPlayers: 1,
      maxPlayers: 50,
      gifts: []
    };
    setTeams(prev => [...prev, newTeam]);
    setManualNames(prev => ({ ...prev, __selectedTeam: id }));
  };

  const handleRemoveTeam = teamId => {
    if (teams.length <= 2) return alert("Se requieren al menos 2 equipos.");
    const next = teams.filter(t => t.id !== teamId);
    setTeams(next);
    setManualNames(prev => ({ ...prev, __selectedTeam: next[0]?.id || "" }));
  };

  const handleTeamChange = (teamId, field, value) => {
    setTeams(prev => prev.map(t => t.id === teamId
      ? { ...t, [field]: field === "commands" ? value.split(",").map(v => v.trim()).filter(Boolean) : value }
      : t
    ));
  };

  const setManualName = (teamId, value) => setManualNames(prev => ({ ...prev, [teamId]: value }));

  const addManualPlayer = teamId => {
    const name = String(manualNames[teamId] || "").trim();
    if (!name) return alert("Ingresa un nickname para el jugador.");

    // Manual testing must work even after a round has started in GENDER_TEAMS.
    if (genderMode || registrationManager.status !== "OPEN") registrationManager.openRegistration();

    const playerId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const result = registrationManager.registerPlayer({
      playerId,
      displayName: name,
      username: name,
      teamId: teamId || null,
      source: "MANUAL"
    });

    if (!result?.success) {
      return alert(`No se pudo registrar "${name}": ${result?.reason || "error desconocido"}`);
    }

    setManualName(teamId, "");
    notify(`✅ ${name} agregado a ${teams.find(t => t.id === teamId)?.name || "el equipo"}.`);
  };

  const handleStartRound = () => {
    const readiness = dashboard.registration?.readiness;
    if (!readiness?.ready) return alert(`No se puede iniciar la ronda: ${readiness?.message || "Condiciones no cumplidas"}`);
    try {
      // Gender mode keeps registration open; regular team/individual modes retain their existing lock behavior.
      if (!genderMode) registrationManager.lockRegistration();
      const duration = Number(roundDuration) || 20;
      beginRound({ name: "Ronda Principal", duration, entryGift: "Regalo", prize: "Premio" });
      startGameTimer(duration);
      notify(`🚀 Ronda iniciada (${duration} min).${genderMode ? " Registro de Chicos vs Chicas permanece ABIERTO." : " Registro bloqueado."}`);
    } catch {
      notify("❌ Error al iniciar la ronda.");
    }
  };

  const regState = dashboard.registration || { status: "CLOSED", count: 0, players: [], teamGroups: {}, readiness: { ready: false, message: "Cargando..." } };
  const isConnected = connectionStatus === "CONNECTED";
  const teamGroups = regState.teamGroups || {};

  const teamsWithPlayers = useMemo(() => teams.map(team => ({
    ...team,
    registeredPlayers: teamGroups[team.id]?.players || (regState.players || []).filter(p => p.teamId === team.id)
  })), [teams, teamGroups, regState.players]);

  const playerRow = (player, idx) => (
    <div key={player.playerId || player.id || `${player.displayName}-${idx}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", padding: "5px 7px", borderBottom: "1px solid rgba(255,255,255,.05)", fontSize: "11px" }}>
      <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{idx + 1}. {player.displayName || player.username || "Jugador"}</span>
      <button onClick={() => registrationManager.removePlayer(player.playerId || player.id)} style={{ background: "transparent", color: "#ff5c69", border: 0, cursor: "pointer", fontWeight: 900 }}>✕</button>
    </div>
  );

  const manualTeamCard = (team, idx) => {
    const playersForTeam = team.registeredPlayers || [];
    const isGirls = genderMode && idx === 1;
    const accent = genderMode ? (isGirls ? "#ff65b0" : "#36b9ef") : (team.color || "#00f5ff");
    const title = genderMode ? (isGirls ? "👧 CHICAS" : "👦 CHICOS") : team.name;
    const command = Array.isArray(team.commands) ? team.commands[0] : team.commands;
    return (
      <div key={team.id} style={{ flex: "1 1 280px", minWidth: 0, background: "#0c091a", border: `1px solid ${accent}66`, borderRadius: "9px", padding: "10px", boxShadow: `0 0 14px ${accent}18` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "7px" }}>
          <strong style={{ color: accent, fontSize: "12px", textTransform: "uppercase" }}>{title}</strong>
          <span style={{ fontSize: "10px", color: "#a0aec0" }}>{playersForTeam.length}/{team.maxPlayers || 50}</span>
        </div>
        <div style={{ fontSize: "10px", color: "#a0aec0", marginBottom: "7px" }}>Comando: <b style={{ color: accent }}>{command || "—"}</b></div>
        <div style={{ maxHeight: "120px", overflowY: "auto", background: "#120f1d", borderRadius: "5px", marginBottom: "8px" }}>
          {playersForTeam.length ? playersForTeam.map(playerRow) : <div style={{ padding: "10px", color: "#718096", textAlign: "center", fontSize: "10px" }}>Sin jugadores manuales todavía.</div>}
        </div>
        <div style={{ display: "flex", gap: "5px" }}>
          <input value={manualNames[team.id] || ""} onChange={e => setManualName(team.id, e.target.value)} onKeyDown={e => { if (e.key === "Enter") addManualPlayer(team.id); }} placeholder={`Nickname para ${title}`} style={{ flex: 1, minWidth: 0, background: "#191426", color: "#fff", border: `1px solid ${accent}55`, borderRadius: "5px", padding: "6px 7px", fontSize: "11px" }} />
          <button onClick={() => addManualPlayer(team.id)} style={{ background: accent, color: "#07111a", border: 0, borderRadius: "5px", padding: "6px 9px", fontSize: "10px", fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" }}>+ AGREGAR</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: "linear-gradient(135deg,#191426,#120d22)", border: "1px solid rgba(0,245,255,.2)", borderRadius: "14px", padding: "18px", boxShadow: "0 8px 30px rgba(0,0,0,.6)", color: "white" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "16px", color: "#00f5ff", textTransform: "uppercase", letterSpacing: "1px" }}>📝 Centro Operativo de Inscripciones</h2>
          <div style={{ fontSize: "11px", color: "#a0aec0", marginTop: "3px" }}>Configuración, jugadores inscritos y registro manual separado por equipo.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: isConnected ? "#48bb78" : "#e53e3e", fontSize: "11px", fontWeight: 800 }}>{isConnected ? "🟢 CHAT CONNECTED" : "🔴 CHAT DISCONNECTED"}</span>
          <span style={{ padding: "4px 9px", borderRadius: "6px", background: regState.status === "OPEN" ? "#48bb78" : regState.status === "LOCKED" ? "#ed8936" : "#e53e3e", fontSize: "10px", fontWeight: 900 }}>{genderMode ? "REGISTRO SIEMPRE ABIERTO" : regState.status}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px", background: "#120f1d", padding: "10px", borderRadius: "9px" }}>
        <button onClick={() => registrationManager.openRegistration()} style={{ background: "#48bb78", color: "#fff", border: 0, padding: "7px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, cursor: "pointer" }}>🟢 Abrir Registro</button>
        <button onClick={() => registrationManager.closeRegistration()} disabled={genderMode} style={{ background: genderMode ? "#374151" : "#dd6b20", color: "#fff", border: 0, padding: "7px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, cursor: genderMode ? "not-allowed" : "pointer", opacity: genderMode ? .55 : 1 }}>🔴 Cerrar Registro</button>
        <button onClick={() => registrationManager.lockRegistration()} disabled={genderMode} style={{ background: genderMode ? "#374151" : "#d69e2e", color: "#fff", border: 0, padding: "7px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, cursor: genderMode ? "not-allowed" : "pointer", opacity: genderMode ? .55 : 1 }}>🔒 Bloquear</button>
        <button onClick={() => window.confirm("¿Limpiar todos los inscritos?") && registrationManager.clearRegistration()} style={{ background: "#4a5568", color: "#fff", border: 0, padding: "7px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, cursor: "pointer" }}>🗑️ Limpiar Jugadores</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,1fr) minmax(320px,1.25fr)", gap: "14px", marginBottom: "14px" }}>
        <div style={{ background: "#120f1d", padding: "14px", borderRadius: "9px", border: "1px solid rgba(255,255,255,.08)" }}>
          <h4 style={{ margin: "0 0 10px", fontSize: "12px", color: "#ffd700", textTransform: "uppercase" }}>⚙️ Configuración</h4>
          <label style={{ display: "block", fontSize: "10px", color: "#a0aec0", marginBottom: "4px" }}>Modalidad</label>
          <select value={gameMode} onChange={e => { setGameMode(e.target.value); dashboardAPI.setGameMode(e.target.value); }} style={{ width: "100%", background: "#0c091a", color: "#fff", border: "1px solid rgba(255,255,255,.2)", borderRadius: "6px", padding: "7px", fontSize: "11px", marginBottom: "10px" }}>
            <option value="INDIVIDUAL">INDIVIDUAL</option>
            <option value="TEAM">TEAM (EQUIPOS)</option>
            <option value="TEAMS">TEAMS (EQUIPOS)</option>
            <option value="GENDER_TEAMS">CHICOS VS CHICAS</option>
            <option value="TOURNAMENT">TOURNAMENT</option>
          </select>

          <label style={{ display: "block", fontSize: "10px", color: "#ffd700", marginBottom: "4px" }}>⏱️ Duración</label>
          <select value={roundDuration} onChange={e => setRoundDuration(Number(e.target.value))} style={{ width: "100%", background: "#0c091a", color: "#fff", border: "1px solid rgba(255,255,255,.2)", borderRadius: "6px", padding: "7px", fontSize: "11px", marginBottom: "10px" }}>
            <option value={1}>1 minuto (prueba)</option><option value={5}>5 minutos</option><option value={10}>10 minutos</option><option value={15}>15 minutos</option><option value={20}>20 minutos</option><option value={30}>30 minutos</option>
          </select>

          {gameMode === "INDIVIDUAL" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
              <div><label style={{ display: "block", fontSize: "9px", color: "#a0aec0" }}>Comando</label><input value={individualCommand} onChange={e => setIndividualCommand(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#0c091a", color: "#fff", border: "1px solid rgba(255,255,255,.2)", borderRadius: "5px", padding: "6px", fontSize: "11px" }} /></div>
              <div><label style={{ display: "block", fontSize: "9px", color: "#a0aec0" }}>Mín.</label><input type="number" min="1" value={minPlayers} onChange={e => setMinPlayers(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#0c091a", color: "#fff", border: "1px solid rgba(255,255,255,.2)", borderRadius: "5px", padding: "6px", fontSize: "11px" }} /></div>
              <div><label style={{ display: "block", fontSize: "9px", color: "#a0aec0" }}>Máx.</label><input type="number" min="1" value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#0c091a", color: "#fff", border: "1px solid rgba(255,255,255,.2)", borderRadius: "5px", padding: "6px", fontSize: "11px" }} /></div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "7px" }}><span style={{ fontSize: "10px", color: "#ffd700", fontWeight: 800 }}>Equipos ({teams.length})</span><button onClick={handleAddTeam} style={{ background: "#3182ce", color: "#fff", border: 0, borderRadius: "4px", padding: "4px 7px", fontSize: "9px", fontWeight: 800, cursor: "pointer" }}>+ EQUIPO</button></div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "210px", overflowY: "auto" }}>
                {teams.map((t, idx) => <div key={t.id} style={{ background: "#0c091a", padding: "7px", borderRadius: "6px", border: `1px solid ${t.color || "#444"}55` }}>
                  <div style={{ display: "flex", gap: "5px", alignItems: "center", marginBottom: "5px" }}><input value={t.name} onChange={e => handleTeamChange(t.id, "name", e.target.value)} style={{ flex: 1, background: "#191426", color: "#fff", border: "1px solid rgba(255,255,255,.15)", borderRadius: "4px", padding: "4px", fontSize: "10px" }} /><button onClick={() => handleRemoveTeam(t.id)} style={{ background: "transparent", color: "#e53e3e", border: 0, cursor: "pointer" }}>✕</button></div>
                  <input value={Array.isArray(t.commands) ? t.commands.join(", ") : t.commands || ""} onChange={e => handleTeamChange(t.id, "commands", e.target.value)} placeholder={`Comando equipo ${idx + 1}`} style={{ width: "100%", boxSizing: "border-box", background: "#191426", color: "#fff", border: "1px solid rgba(255,255,255,.15)", borderRadius: "4px", padding: "4px", fontSize: "10px" }} />
                </div>)}
              </div>
            </div>
          )}
          <button onClick={handleSaveConfig} style={{ width: "100%", marginTop: "10px", background: "linear-gradient(135deg,#00f5ff,#0099ff)", color: "#000", border: 0, borderRadius: "6px", padding: "8px", fontSize: "11px", fontWeight: 900, cursor: "pointer" }}>💾 GUARDAR CONFIGURACIÓN</button>
          {configErrors.length > 0 && <div style={{ marginTop: "8px", color: "#fc8181", fontSize: "10px" }}>{configErrors.map((e, i) => <div key={i}>• {e}</div>)}</div>}
        </div>

        <div style={{ background: "#120f1d", padding: "14px", borderRadius: "9px", border: "1px solid rgba(255,255,255,.08)" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: "12px", color: "#00f5ff", textTransform: "uppercase" }}>👥 Jugadores Inscritos ({regState.count})</h4>
          {!teamMode ? (
            <div style={{ background: "#0c091a", borderRadius: "7px", overflow: "hidden" }}>
              <div style={{ maxHeight: "190px", overflowY: "auto" }}>{(regState.players || []).length ? regState.players.map(playerRow) : <div style={{ padding: "15px", color: "#718096", textAlign: "center", fontSize: "10px" }}>Sin jugadores inscritos.</div>}</div>
              <div style={{ padding: "8px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
                <div style={{ display: "flex", gap: "5px" }}><input value={manualNames.__individual || ""} onChange={e => setManualName("__individual", e.target.value)} onKeyDown={e => e.key === "Enter" && addManualPlayer(null)} placeholder="Nickname" style={{ flex: 1, background: "#191426", color: "#fff", border: "1px solid rgba(255,255,255,.2)", borderRadius: "5px", padding: "6px", fontSize: "10px" }} /><button onClick={() => addManualPlayer(null)} style={{ background: "#3182ce", color: "#fff", border: 0, borderRadius: "5px", padding: "6px 9px", fontSize: "10px", fontWeight: 900 }}>+ AGREGAR</button></div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "10px", color: genderMode ? "#ffd700" : "#a0aec0", marginBottom: "8px" }}>{genderMode ? "🟢 Los dos registros están separados y permanecen abiertos durante las rondas." : "Registro manual separado por equipo."}</div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "stretch" }}>
                {teamsWithPlayers.map((team, idx) => manualTeamCard(team, idx))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ background: "#120f1d", padding: "12px", borderRadius: "9px", border: "1px solid rgba(255,255,255,.08)", marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}><span style={{ fontSize: "11px", color: "#ffd700", fontWeight: 900 }}>🎯 ROUND READINESS</span><span style={{ color: regState.readiness?.ready ? "#48bb78" : "#e53e3e", fontSize: "11px", fontWeight: 900 }}>{regState.readiness?.ready ? "🟢 READY" : "🔴 NOT READY"}</span></div>
        <div style={{ fontSize: "10px", color: "#a0aec0" }}>{regState.readiness?.message || "Cargando..."}</div>
      </div>

      <button onClick={handleStartRound} disabled={!regState.readiness?.ready} style={{ width: "100%", background: regState.readiness?.ready ? "linear-gradient(135deg,#48bb78,#38a169)" : "#4a5568", color: "#fff", border: 0, borderRadius: "8px", padding: "11px", fontSize: "12px", fontWeight: 900, cursor: regState.readiness?.ready ? "pointer" : "not-allowed", opacity: regState.readiness?.ready ? 1 : .65 }}>🚀 INICIAR RONDA ({roundDuration} MIN)</button>

      <div style={{ marginTop: "12px", background: "#120f1d", padding: "10px", borderRadius: "9px", border: "1px solid rgba(255,255,255,.08)" }}>
        <h4 style={{ margin: "0 0 6px", fontSize: "11px", color: "#a0aec0", textTransform: "uppercase" }}>📡 Actividad</h4>
        <div style={{ maxHeight: "90px", overflowY: "auto", fontSize: "10px", fontFamily: "monospace" }}>
          {activityFeed.length ? activityFeed.map(item => <div key={item.id} style={{ padding: "2px 0" }}><span style={{ color: "#718096" }}>[{item.time}]</span> <b style={{ color: item.type === "SUCCESS" ? "#48bb78" : "#00f5ff" }}>{item.type}</b> <span style={{ color: "#e2e8f0" }}>{item.detail}</span></div>) : <span style={{ color: "#718096", fontStyle: "italic" }}>Escuchando eventos de inscripción...</span>}
        </div>
      </div>

      {feedback && <div style={{ marginTop: "10px", padding: "9px", borderRadius: "7px", border: "1px solid #48bb78", background: "rgba(72,187,120,.12)", color: "#48bb78", fontSize: "11px", fontWeight: 800, textAlign: "center" }}>{feedback}</div>}
    </div>
  );
}
