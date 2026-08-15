import { useState, useEffect } from "react";
import { dashboardAPI } from "../../core/dashboardAPI";
import { commandConfigManager } from "../../core/commandConfigManager";

/**
 * Command Config Controls v2 (Including dedicated Win Limpia operational UI section)
 */
export function CommandConfigControls() {
  const [config, setConfig] = useState({
    registrationMode: "MIXED",
    teams: [],
    winLimpia: { enabled: true, correctAnswer: "clase", points: 1 }
  });

  const [winEnabled, setWinEnabled] = useState(true);
  const [correctAnswer, setCorrectAnswer] = useState("clase");
  const [winPoints, setWinPoints] = useState(1);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const updateConfig = (dashboard) => {
      if (dashboard && dashboard.commandConfig) {
        setConfig(dashboard.commandConfig);
        if (dashboard.commandConfig.winLimpia) {
          setWinEnabled(dashboard.commandConfig.winLimpia.enabled !== false);
          setCorrectAnswer(dashboard.commandConfig.winLimpia.correctAnswer || "clase");
          setWinPoints(dashboard.commandConfig.winLimpia.points || 1);
        }
      }
    };

    const unsubscribe = dashboardAPI.subscribe(updateConfig);
    updateConfig(dashboardAPI.getLiveDashboard());

    return () => {
      unsubscribe && unsubscribe();
    };
  }, []);

  const notify = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleModeChange = (e) => {
    commandConfigManager.setRegistrationMode(e.target.value);
  };

  const handleSaveWinLimpia = (e) => {
    e.preventDefault();
    const updatedWin = {
      enabled: winEnabled,
      correctAnswer: (correctAnswer || "").trim().toLowerCase(),
      points: Number(winPoints) || 1
    };

    const fullCfg = commandConfigManager.getConfig();
    fullCfg.winLimpia = updatedWin;
    const res = commandConfigManager.updateFullConfig(fullCfg);
    if (res.success) {
      notify("✅ Configuración de Win Limpia guardada correctamente.");
    } else {
      notify("❌ Error guardando Win Limpia.");
    }
  };

  const handleTeamUpdate = (teamId, field, value) => {
    const currentCfg = commandConfigManager.getConfig();
    const updatedTeams = currentCfg.teams.map(t => {
      if (t.id === teamId) {
        const parsedValue = field === "commands" || field === "gifts"
          ? value.split(",").map(s => s.trim()).filter(Boolean)
          : value;
        return { ...t, [field]: parsedValue };
      }
      return t;
    });
    commandConfigManager.updateFullConfig({ ...currentCfg, teams: updatedTeams });
  };

  return (
    <div style={{
      background: "rgba(25, 20, 38, 0.9)",
      border: "1px solid rgba(255, 255, 255, 0.15)",
      borderRadius: "10px",
      padding: "16px",
      boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
      display: "flex",
      flexDirection: "column",
      gap: "16px"
    }}>
      <h3 style={{ margin: "0", fontSize: "14px", color: "#00f5ff", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        ⚙️ Configuración de Comandos & Win Limpia
      </h3>

      {/* DEDICATED WIN LIMPIA CONFIGURATION SECTION */}
      <form onSubmit={handleSaveWinLimpia} style={{
        background: "rgba(12, 10, 20, 0.85)",
        border: "1px solid rgba(0, 245, 255, 0.3)",
        borderRadius: "8px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "10px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: 800, color: "#ffd700", textTransform: "uppercase" }}>
            🏆 Configuración de Win Limpia
          </span>
          <span style={{
            fontSize: "10px",
            fontWeight: 800,
            padding: "2px 6px",
            borderRadius: "4px",
            background: winEnabled ? "rgba(72,187,120,0.2)" : "rgba(229,62,62,0.2)",
            color: winEnabled ? "#48bb78" : "#e53e3e"
          }}>
            {winEnabled ? "WIN LIMPIA: ON" : "WIN LIMPIA: OFF"}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div>
            <label style={{ fontSize: "10px", color: "#a0aec0", display: "block", marginBottom: "2px", fontWeight: 700 }}>Estado:</label>
            <select
              value={winEnabled ? "ON" : "OFF"}
              onChange={(e) => setWinEnabled(e.target.value === "ON")}
              style={{ width: "100%", background: "#120f1d", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", padding: "6px", fontSize: "11px", fontWeight: 700 }}
            >
              <option value="ON">ON (Activado)</option>
              <option value="OFF">OFF (Desactivado)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "10px", color: "#a0aec0", display: "block", marginBottom: "2px", fontWeight: 700 }}>Puntos por Win:</label>
            <input
              type="number"
              min="1"
              value={winPoints}
              onChange={(e) => setWinPoints(e.target.value)}
              style={{ width: "100%", background: "#120f1d", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", padding: "6px", fontSize: "11px", fontWeight: 700, boxSizing: "border-box" }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: "10px", color: "#a0aec0", display: "block", marginBottom: "2px", fontWeight: 700 }}>Palabra / Respuesta correcta:</label>
          <input
            type="text"
            placeholder="Ej: clase, palabra, adivinanza"
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            style={{ width: "100%", background: "#120f1d", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", padding: "6px", fontSize: "11px", boxSizing: "border-box", fontWeight: 700 }}
          />
        </div>

        <button
          type="submit"
          style={{ background: "linear-gradient(135deg, #48bb78, #38a169)", color: "white", border: "none", padding: "8px", borderRadius: "6px", fontWeight: 800, cursor: "pointer", fontSize: "11px", textTransform: "uppercase" }}
        >
          Guardar Win Limpia
        </button>

        {feedback && (
          <div style={{ fontSize: "11px", color: "#48bb78", fontWeight: 700, textAlign: "center" }}>
            {feedback}
          </div>
        )}
      </form>

      {/* REGISTRATION MODE */}
      <div style={{ marginBottom: "8px" }}>
        <label style={{ fontSize: "11px", color: "#a0aec0", display: "block", marginBottom: "4px" }}>
          Modo de Inscripción:
        </label>
        <select
          value={config.registrationMode}
          onChange={handleModeChange}
          style={{
            width: "100%",
            background: "#120f1d",
            color: "white",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "6px",
            padding: "6px",
            fontSize: "12px",
            fontWeight: 700
          }}
        >
          <option value="CHAT">CHAT (Comandos)</option>
          <option value="GIFT">GIFT (Regalos)</option>
          <option value="MANUAL">MANUAL (Admin)</option>
          <option value="MIXED">MIXED (Chat + Gift)</option>
        </select>
      </div>

      <div style={{ fontSize: "11px", color: "#a0aec0", marginBottom: "6px", textTransform: "uppercase", fontWeight: 700 }}>
        Equipos y Reglas de Inscripción:
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {config.teams && config.teams.map((team) => (
          <div key={team.id} style={{
            background: "rgba(12, 10, 20, 0.6)",
            border: `1px solid ${team.color || "rgba(255,255,255,0.1)"}`,
            borderRadius: "6px",
            padding: "8px"
          }}>
            <div style={{ fontSize: "12px", fontWeight: 900, color: team.color || "#fff", marginBottom: "6px" }}>
              {team.name} ({team.id})
            </div>

            <div style={{ marginBottom: "4px" }}>
              <span style={{ fontSize: "10px", color: "#a0aec0" }}>Comandos (separados por coma):</span>
              <input
                type="text"
                defaultValue={team.commands.join(", ")}
                onBlur={(e) => handleTeamUpdate(team.id, "commands", e.target.value)}
                style={{
                  width: "100%",
                  background: "#181528",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "4px",
                  padding: "4px",
                  fontSize: "11px",
                  marginTop: "2px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div>
              <span style={{ fontSize: "10px", color: "#a0aec0" }}>Regalos (separados por coma):</span>
              <input
                type="text"
                defaultValue={team.gifts.join(", ")}
                onBlur={(e) => handleTeamUpdate(team.id, "gifts", e.target.value)}
                style={{
                  width: "100%",
                  background: "#181528",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "4px",
                  padding: "4px",
                  fontSize: "11px",
                  marginTop: "2px",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
