import { useState, useEffect } from "react";
import { dashboardAPI } from "../../core/dashboardAPI";
import { registrationManager } from "../../core/registrationManager";
import { commandConfigManager } from "../../core/commandConfigManager";
import { eventBus } from "../../core/eventBus";
import { connectorManager } from "../../core/connectors/connectorManager";
import { beginRound, startGameTimer } from "../../core/gameEngine";

export function RegistrationControls() {
  const [dashboard, setDashboard] = useState(dashboardAPI.getLiveDashboard());
  const [config, setConfig] = useState(commandConfigManager.getConfig());
  const [connectionStatus, setConnectionStatus] = useState("DISCONNECTED");
  const [activityFeed, setActivityFeed] = useState([]);
  const [configErrors, setConfigErrors] = useState([]);
  const [feedback, setFeedback] = useState(null);

  // Local form state for configuration editing initialized from commandConfigManager
  const [gameMode, setGameMode] = useState(dashboardAPI.getGameMode());
  const [individualCommand, setIndividualCommand] = useState(config.individualCommand || "a");
  const [minPlayers, setMinPlayers] = useState(config.minPlayers !== undefined ? config.minPlayers : 1);
  const [maxPlayers, setMaxPlayers] = useState(config.maxPlayers !== undefined ? config.maxPlayers : 100);
  const [teams, setTeams] = useState(config.teams || []);
  const [roundDuration, setRoundDuration] = useState(20); // INCIDENT 023: Configurable round duration in minutes

  // Manual player input state
  const [manualPlayerName, setManualPlayerName] = useState("");
  const [manualTeamId, setManualTeamId] = useState("");

  useEffect(() => {
    const unsubMode = dashboardAPI.subscribeToModeChange(({ mode }) => {
      setGameMode(mode);
    });
    return () => unsubMode && unsubMode();
  }, []);

  useEffect(() => {
    if (teams.length > 0 && !manualTeamId) {
      setManualTeamId(teams[0].id);
    }
  }, [teams]);

  useEffect(() => {
    // Listen exclusively to explicit command config updates so timer ticks never overwrite form state
    const unsubCfgUpdate = eventBus.subscribe("config:command_updated", ({ config: newCfg }) => {
      if (newCfg) {
        setConfig(newCfg);
        setIndividualCommand(newCfg.individualCommand || "a");
        setMinPlayers(newCfg.minPlayers !== undefined ? newCfg.minPlayers : 1);
        setMaxPlayers(newCfg.maxPlayers !== undefined ? newCfg.maxPlayers : 100);
        setTeams(newCfg.teams || []);
        if (newCfg.teams && newCfg.teams.length > 0 && !manualTeamId) {
          setManualTeamId(newCfg.teams[0].id);
        }
      }
    });

    const updateDashboard = (dash) => {
      if (dash) {
        setDashboard(dash);
      }
    };

    const unsubscribeDashboard = dashboardAPI.subscribe(updateDashboard);
    updateDashboard(dashboardAPI.getLiveDashboard());

    const updateConnectorStatus = () => {
      try {
        const statuses = connectorManager.getStatusAll();
        const tiktokStatus = statuses.tiktok?.status || connectorManager.getConnector("tiktok")?.status || "DISCONNECTED";
        setConnectionStatus(tiktokStatus);
      } catch (e) {
        setConnectionStatus("DISCONNECTED");
      }
    };
    updateConnectorStatus();
    const statusInterval = setInterval(updateConnectorStatus, 2000);

    const addActivity = (type, detail) => {
      setActivityFeed(prev => [
        { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), type, detail },
        ...prev.slice(0, 19)
      ]);
    };

    const unsubChat = eventBus.subscribe("normalized:chat", (event) => {
      addActivity("CHAT", `${event.username || event.displayName || "User"}: "${event.message || ""}"`);
    });

    const unsubAccepted = eventBus.subscribe("chat:command_accepted", ({ event, player, teamId }) => {
      addActivity("SUCCESS", `${player?.displayName || "Player"} registered (${teamId ? `Team: ${teamId}` : `"${event?.message || "a"}"`})`);
    });

    const unsubRejected = eventBus.subscribe("chat:command_rejected", ({ event, reason }) => {
      addActivity(reason || "REJECTED", `${event?.displayName || "User"}: "${event?.message || ""}" (${reason})`);
    });

    const unsubDuplicate = eventBus.subscribe("registration:duplicate_attempt", ({ playerId, player }) => {
      addActivity("ALREADY_REGISTERED", `${player?.displayName || playerId} duplicate attempt`);
    });

    const unsubClosed = eventBus.subscribe("registration:closed", () => {
      addActivity("REGISTRATION_CLOSED", "Registration closed");
    });

    const unsubPlayerReg = eventBus.subscribe("registration:player_registered", ({ player }) => {
      addActivity("REGISTERED", `Jugador inscrito: ${player?.displayName || player?.username}`);
    });

    const unsubPlayerRem = eventBus.subscribe("registration:player_removed", ({ player }) => {
      addActivity("REMOVED", `Jugador eliminado: ${player?.displayName || player?.username}`);
    });

    return () => {
      unsubCfgUpdate && unsubCfgUpdate();
      unsubscribeDashboard && unsubscribeDashboard();
      clearInterval(statusInterval);
      unsubChat && unsubChat();
      unsubAccepted && unsubAccepted();
      unsubRejected && unsubRejected();
      unsubDuplicate && unsubDuplicate();
      unsubClosed && unsubClosed();
      unsubPlayerReg && unsubPlayerReg();
      unsubPlayerRem && unsubPlayerRem();
    };
  }, []);

  const notify = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleSaveConfig = () => {
    dashboardAPI.setGameMode(gameMode);
    const newCfg = {
      gameRegistrationMode: gameMode,
      individualCommand,
      minPlayers: Number(minPlayers),
      maxPlayers: Number(maxPlayers),
      teams
    };

    const res = commandConfigManager.updateFullConfig(newCfg);
    if (res.success) {
      setConfigErrors([]);
      notify("✅ Configuración de inscripción guardada correctamente.");
    } else {
      setConfigErrors(res.errors || []);
      notify("❌ Error en la validación de configuración.");
    }
  };

  const handleAddTeam = () => {
    const newTeamId = `team_${Date.now()}`;
    const updatedTeams = [...teams, {
      id: newTeamId,
      name: `Equipo ${teams.length + 1}`,
      color: "#ffd700",
      commands: [`!t${teams.length + 1}`],
      minPlayers: 1,
      maxPlayers: 50,
      gifts: []
    }];
    setTeams(updatedTeams);
    if (!manualTeamId) setManualTeamId(newTeamId);
  };

  const handleRemoveTeam = (teamId) => {
    if (teams.length <= 2) {
      alert("Se requieren al menos 2 equipos.");
      return;
    }
    const updatedTeams = teams.filter(t => t.id !== teamId);
    setTeams(updatedTeams);
    if (manualTeamId === teamId && updatedTeams.length > 0) {
      setManualTeamId(updatedTeams[0].id);
    }
  };

  const handleTeamChange = (teamId, field, value) => {
    setTeams(teams.map(t => {
      if (t.id === teamId) {
        if (field === "commands") {
          return { ...t, commands: value.split(",").map(c => c.trim()) };
        }
        return { ...t, [field]: value };
      }
      return t;
    }));
  };

  const handleAddManualPlayer = () => {
    const name = (manualPlayerName || "").trim();
    if (!name) {
      alert("Por favor ingresa un nombre o nickname para el jugador.");
      return;
    }

    if (registrationManager.status !== "OPEN") {
      registrationManager.openRegistration();
    }

    const playerId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const result = registrationManager.registerPlayer({
      playerId,
      displayName: name,
      username: name,
      teamId: (gameMode === "TEAMS" || gameMode === "TEAM") ? manualTeamId : null,
      source: "MANUAL"
    });

    if (result.success) {
      setManualPlayerName("");
      notify(`✅ Jugador manual "${name}" registrado correctamente.`);
    } else {
      alert(`No se pudo registrar: ${result.reason}`);
    }
  };

  const handleStartRound = () => {
    const readiness = dashboard.registration?.readiness;
    if (!readiness || !readiness.ready) {
      alert(`No se puede iniciar la ronda: ${readiness?.message || "Condiciones no cumplidas"}`);
      return;
    }

    try {
      registrationManager.lockRegistration();
      const durMinutes = Number(roundDuration) || 20;
      beginRound({
        name: "Ronda Principal",
        duration: durMinutes,
        entryGift: "Regalo",
        prize: "Premio"
      });
      startGameTimer(durMinutes);
      notify(`🚀 ¡Ronda iniciada con éxito (${durMinutes} min)! Registro bloqueado.`);
    } catch (e) {
      notify("❌ Error al iniciar la ronda.");
    }
  };

  const regState = dashboard.registration || { status: "CLOSED", count: 0, players: [], teamGroups: {}, readiness: { ready: false, message: "Cargando..." } };
  const isConnected = connectionStatus === "CONNECTED";

  return (
    <div style={{
      background: "linear-gradient(135deg, #191426, #120d22)",
      border: "1px solid rgba(0, 245, 255, 0.2)",
      borderRadius: "14px",
      padding: "20px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
      color: "white"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "16px", color: "#00f5ff", textTransform: "uppercase", letterSpacing: "1px" }}>
            📝 Centro Operativo de Inscripciones & Mirror Chat
          </h2>
          <div style={{ fontSize: "11px", color: "#a0aec0", marginTop: "2px" }}>
            Configuración, control de ciclo de vida, registro manual de jugadores, feed de chat en vivo y preparación de ronda
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "11px", color: isConnected ? "#48bb78" : "#e53e3e", fontWeight: 700 }}>
            {isConnected ? "🟢 CHAT CONNECTED" : "🔴 CHAT DISCONNECTED"}
          </span>
          <span style={{
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 800,
            background: regState.status === "OPEN" ? "#48bb78" : regState.status === "LOCKED" ? "#ed8936" : "#e53e3e",
            color: "#fff"
          }}>
            {regState.status}
          </span>
        </div>
      </div>

      {/* Lifecycle Actions */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px", background: "#120f1d", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
        <button
          onClick={() => registrationManager.openRegistration()}
          style={{ background: "#48bb78", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
        >
          🟢 Abrir Registro
        </button>
        <button
          onClick={() => registrationManager.closeRegistration()}
          style={{ background: "#dd6b20", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
        >
          🔴 Cerrar Registro
        </button>
        <button
          onClick={() => registrationManager.lockRegistration()}
          style={{ background: "#d69e2e", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
        >
          🔒 Bloquear
        </button>
        <button
          onClick={() => {
            if (window.confirm("¿Estás seguro de limpiar todos los inscritos?")) {
              registrationManager.clearRegistration();
            }
          }}
          style={{ background: "#4a5568", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
        >
          🗑️ Limpiar Jugadores
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", marginBottom: "16px" }}>
        
        {/* CONFIGURATION PANEL */}
        <div style={{ background: "#120f1d", padding: "16px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#ffd700", textTransform: "uppercase" }}>
            ⚙️ Configuración de Inscripción & Duración
          </h4>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "11px", color: "#a0aec0", marginBottom: "4px" }}>Modalidad:</label>
            <select
              value={gameMode}
              onChange={(e) => {
                const newMode = e.target.value;
                setGameMode(newMode);
                dashboardAPI.setGameMode(newMode);
              }}
              style={{ width: "100%", background: "#0c091a", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", padding: "8px", fontSize: "12px" }}
            >
              <option value="INDIVIDUAL">INDIVIDUAL</option>
              <option value="TEAM">TEAM (EQUIPOS)</option>
              <option value="TEAMS">TEAMS (EQUIPOS)</option>
              <option value="TOURNAMENT">TOURNAMENT</option>
            </select>
          </div>

          {/* INCIDENT 023: Configurable Round Duration Control */}
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "11px", color: "#ffd700", marginBottom: "4px", fontWeight: 700 }}>
              ⏱️ Duración de Ronda (Round Duration):
            </label>
            <select
              value={roundDuration}
              onChange={(e) => setRoundDuration(Number(e.target.value))}
              style={{ width: "100%", background: "#0c091a", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", padding: "8px", fontSize: "12px", fontWeight: 700 }}
            >
              <option value={1}>1 Minuto (Prueba rápida)</option>
              <option value={5}>5 Minutos (5:00)</option>
              <option value={10}>10 Minutos (10:00)</option>
              <option value={15}>15 Minutos (15:00)</option>
              <option value={20}>20 Minutos (20:00)</option>
              <option value={30}>30 Minutos (30:00)</option>
            </select>
          </div>

          {gameMode === "INDIVIDUAL" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "10px", color: "#a0aec0", marginBottom: "4px" }}>Comando:</label>
                <input
                  type="text"
                  value={individualCommand}
                  onChange={(e) => setIndividualCommand(e.target.value)}
                  style={{ width: "100%", background: "#0c091a", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", padding: "6px", fontSize: "12px", textAlign: "center" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "10px", color: "#a0aec0", marginBottom: "4px" }}>Mín Jugadores:</label>
                <input
                  type="number"
                  min="1"
                  value={minPlayers}
                  onChange={(e) => setMinPlayers(e.target.value)}
                  style={{ width: "100%", background: "#0c091a", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", padding: "6px", fontSize: "12px", textAlign: "center" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "10px", color: "#a0aec0", marginBottom: "4px" }}>Máx Jugadores:</label>
                <input
                  type="number"
                  min="1"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(e.target.value)}
                  style={{ width: "100%", background: "#0c091a", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", padding: "6px", fontSize: "12px", textAlign: "center" }}
                />
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", color: "#ffd700", fontWeight: 700 }}>Equipos Configurados ({teams.length}):</span>
                <button
                  onClick={handleAddTeam}
                  style={{ background: "#3182ce", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, cursor: "pointer" }}
                >
                  + Agregar Equipo
                </button>
              </div>
              <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                {teams.map((t, idx) => (
                  <div key={t.id || idx} style={{ background: "#0c091a", padding: "8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: t.color || "#00f5ff" }}>Equipo {idx + 1}</span>
                      <button onClick={() => handleRemoveTeam(t.id)} style={{ background: "transparent", color: "#e53e3e", border: "none", fontSize: "11px", cursor: "pointer", fontWeight: 800 }}>✕</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "4px" }}>
                      <input
                        type="text"
                        placeholder="Nombre"
                        value={t.name}
                        onChange={(e) => handleTeamChange(t.id, "name", e.target.value)}
                        style={{ background: "#191426", color: "white", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", padding: "4px 6px", fontSize: "11px" }}
                      />
                      <input
                        type="text"
                        placeholder="Comandos (ej: !esp)"
                        value={Array.isArray(t.commands) ? t.commands.join(", ") : t.commands}
                        onChange={(e) => handleTeamChange(t.id, "commands", e.target.value)}
                        style={{ background: "#191426", color: "white", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", padding: "4px 6px", fontSize: "11px" }}
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                      <div style={{ fontSize: "10px", color: "#a0aec0" }}>
                        Min: <input type="number" min="1" value={t.minPlayers} onChange={(e) => handleTeamChange(t.id, "minPlayers", e.target.value)} style={{ width: "45px", background: "#191426", color: "white", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", padding: "2px", textAlign: "center" }} />
                      </div>
                      <div style={{ fontSize: "10px", color: "#a0aec0" }}>
                        Max: <input type="number" min="1" value={t.maxPlayers} onChange={(e) => handleTeamChange(t.id, "maxPlayers", e.target.value)} style={{ width: "45px", background: "#191426", color: "white", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", padding: "2px", textAlign: "center" }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {configErrors.length > 0 && (
            <div style={{ background: "rgba(229,62,62,0.15)", border: "1px solid #e53e3e", padding: "8px", borderRadius: "6px", marginBottom: "10px", fontSize: "11px", color: "#fc8181" }}>
              {configErrors.map((err, i) => <div key={i}>• {err}</div>)}
            </div>
          )}

          <button
            onClick={handleSaveConfig}
            style={{ width: "100%", background: "linear-gradient(135deg, #00f5ff, #0099ff)", color: "#000", border: "none", padding: "8px", borderRadius: "6px", fontWeight: 800, cursor: "pointer", fontSize: "12px" }}
          >
            💾 GUARDAR CONFIGURACIÓN
          </button>
        </div>

        {/* REGISTERED PLAYERS & MANUAL REGISTRATION & READINESS PANEL */}
        <div style={{ background: "#120f1d", padding: "16px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#00f5ff", textTransform: "uppercase" }}>
              👥 Jugadores Inscritos ({regState.count})
            </h4>

            {gameMode === "INDIVIDUAL" ? (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "#a0aec0", marginBottom: "6px" }}>
                  Total: <strong style={{ color: "#ffd700" }}>{regState.count} / {maxPlayers}</strong> (Mín: {minPlayers})
                </div>
                <div style={{ maxHeight: "120px", overflowY: "auto", background: "#0c091a", padding: "6px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "8px" }}>
                  {regState.players && regState.players.length === 0 ? (
                    <div style={{ fontSize: "11px", color: "#718096", fontStyle: "italic", textAlign: "center", padding: "10px" }}>
                      No hay jugadores inscritos aún. Envía "{individualCommand}" en el chat o regístralos manualmente abajo.
                    </div>
                  ) : (
                    regState.players.map((p, idx) => (
                      <div key={p.playerId || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", padding: "3px 6px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{idx + 1}. {p.displayName}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: "#00f5ff", fontSize: "10px" }}>{p.source}</span>
                          <button
                            onClick={() => registrationManager.removePlayer(p.playerId || p.id)}
                            style={{ background: "transparent", color: "#e53e3e", border: "none", fontSize: "11px", cursor: "pointer", fontWeight: 800 }}
                            title="Eliminar jugador"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* MANUAL PLAYER INPUT */}
                <div style={{ background: "#0c091a", padding: "8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#ffd700", marginBottom: "4px", textTransform: "uppercase" }}>➕ Registro Manual:</div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="text"
                      placeholder="Nickname del jugador"
                      value={manualPlayerName}
                      onChange={(e) => setManualPlayerName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddManualPlayer(); }}
                      style={{ flex: 1, background: "#191426", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", padding: "5px 8px", fontSize: "11px" }}
                    />
                    <button
                      onClick={handleAddManualPlayer}
                      style={{ background: "linear-gradient(135deg, #3182ce, #2b6cb0)", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 800, cursor: "pointer" }}
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "160px", overflowY: "auto", marginBottom: "12px" }}>
                {Object.values(regState.teamGroups || {}).map((team) => {
                  const minReached = team.count >= team.minPlayers;
                  return (
                    <div key={team.id} style={{ background: "#0c091a", padding: "8px", borderRadius: "6px", border: `1px solid ${team.color || "#444"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 800, color: team.color || "#fff" }}>{team.name}</span>
                        <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: minReached ? "rgba(72,187,120,0.2)" : "rgba(229,62,62,0.2)", color: minReached ? "#48bb78" : "#e53e3e", fontWeight: 700 }}>
                          {team.count} / {team.maxPlayers} {minReached ? "🟢 MIN" : "🔴 MIN"}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "#a0aec0", fontStyle: "italic", marginBottom: "4px" }}>
                        {team.players.length === 0 ? "Sin jugadores" : team.players.map(p => (
                          <span key={p.playerId || p.id} style={{ display: "inline-flex", alignItems: "center", marginRight: "6px", background: "rgba(255,255,255,0.06)", padding: "1px 4px", borderRadius: "3px" }}>
                            {p.displayName}
                            <button onClick={() => registrationManager.removePlayer(p.playerId || p.id)} style={{ background: "transparent", color: "#e53e3e", border: "none", fontSize: "9px", cursor: "pointer", marginLeft: "3px", fontWeight: 800 }}>✕</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* MANUAL TEAM PLAYER INPUT */}
                <div style={{ background: "#0c091a", padding: "8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#ffd700", marginBottom: "4px", textTransform: "uppercase" }}>➕ Registro Manual por Equipo:</div>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                    <input
                      type="text"
                      placeholder="Nickname"
                      value={manualPlayerName}
                      onChange={(e) => setManualPlayerName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddManualPlayer(); }}
                      style={{ flex: 1, background: "#191426", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", padding: "5px 8px", fontSize: "11px" }}
                    />
                    <select
                      value={manualTeamId}
                      onChange={(e) => setManualTeamId(e.target.value)}
                      style={{ background: "#191426", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", padding: "5px", fontSize: "11px" }}
                    >
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleAddManualPlayer}
                    style={{ width: "100%", background: "linear-gradient(135deg, #3182ce, #2b6cb0)", color: "white", border: "none", padding: "5px", borderRadius: "4px", fontSize: "11px", fontWeight: 800, cursor: "pointer" }}
                  >
                    Agregar Jugador a Equipo
                  </button>
                </div>
              </div>
            )}

            {/* ROUND READINESS */}
            <div style={{ background: "#0c091a", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#ffd700", marginBottom: "4px", textTransform: "uppercase" }}>
                🎯 Round Readiness
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 800, color: regState.readiness?.ready ? "#48bb78" : "#e53e3e" }}>
                <span>{regState.readiness?.ready ? "🟢 READY" : "🔴 NOT READY"}</span>
                <span style={{ fontSize: "11px", fontWeight: 400, color: "#a0aec0" }}>{regState.readiness?.message}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleStartRound}
            disabled={!regState.readiness?.ready}
            style={{
              width: "100%",
              background: regState.readiness?.ready ? "linear-gradient(135deg, #48bb78, #38a169)" : "#4a5568",
              color: "white",
              border: "none",
              padding: "12px",
              borderRadius: "8px",
              fontWeight: 800,
              cursor: regState.readiness?.ready ? "pointer" : "not-allowed",
              fontSize: "13px",
              boxShadow: regState.readiness?.ready ? "0 0 15px rgba(72,187,120,0.4)" : "none",
              textTransform: "uppercase"
            }}
          >
            🚀 START ROUND ({roundDuration} MIN)
          </button>
        </div>

      </div>

      {/* ACTIVITY FEED */}
      <div style={{ background: "#120f1d", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
        <h4 style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#a0aec0", textTransform: "uppercase" }}>
          📡 Feed de Activity en Vivo (EventBus) - Mirror Chat
        </h4>
        <div style={{ maxHeight: "100px", overflowY: "auto", fontSize: "11px", fontFamily: "monospace" }}>
          {activityFeed.length === 0 ? (
            <div style={{ color: "#718096", fontStyle: "italic" }}>Escuchando eventos de chat e inscripciones...</div>
          ) : (
            activityFeed.map(item => (
              <div key={item.id} style={{ display: "flex", gap: "8px", padding: "2px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <span style={{ color: "#718096" }}>[{item.time}]</span>
                <span style={{ color: item.type === "SUCCESS" ? "#48bb78" : item.type === "CHAT" ? "#00f5ff" : item.type === "ALREADY_REGISTERED" ? "#ed8936" : "#00f5ff", fontWeight: 700 }}>{item.type}:</span>
                <span style={{ color: "#e2e8f0" }}>{item.detail}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {feedback && (
        <div style={{ marginTop: "14px", background: "rgba(72,187,120,0.15)", border: "1px solid #48bb78", padding: "10px", borderRadius: "8px", fontSize: "12px", color: "#48bb78", fontWeight: 700, textAlign: "center" }}>
          {feedback}
        </div>
      )}
    </div>
  );
}
