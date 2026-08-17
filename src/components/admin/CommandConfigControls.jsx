import { useState, useEffect } from "react";
import { dashboardAPI } from "../../core/dashboardAPI";
import { commandConfigManager } from "../../core/commandConfigManager";

const DEFAULT_GIFT_ASSETS = [
  "Amped Up.webp",
  "Coconut.webp",
  "Doughnut.webp",
  "Galaxy.webp",
  "Hat and Mustache.webp",
  "Ice Cream Cone.webp",
  "Money Gun.webp",
  "Twinkling Star.webp"
];

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "#120f1d",
  color: "white",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "6px",
  padding: "7px 8px",
  fontSize: "11px",
  fontWeight: 700
};

export function CommandConfigControls() {
  const [config, setConfig] = useState(commandConfigManager.getConfig());
  const [winEnabled, setWinEnabled] = useState(true);
  const [winPoints, setWinPoints] = useState(1);
  const [individualMethod, setIndividualMethod] = useState("command");
  const [individualCommand, setIndividualCommand] = useState("entrar");
  const [individualGift, setIndividualGift] = useState("");
  const [individualGiftAsset, setIndividualGiftAsset] = useState("");
  const [individualGiftImage, setIndividualGiftImage] = useState("");
  const [giftAssets, setGiftAssets] = useState(DEFAULT_GIFT_ASSETS);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const apply = (next) => {
      if (!next) return;
      setConfig(next);
      setWinEnabled(next.winLimpia?.enabled !== false);
      setWinPoints(next.winLimpia?.points || 1);
      setIndividualMethod(next.individualRegistrationMethod === "gift" ? "gift" : "command");
      setIndividualCommand(next.individualCommand || "entrar");
      setIndividualGift(next.individualRegistrationGift || "");
      setIndividualGiftAsset(next.individualRegistrationGiftAsset || "");
      setIndividualGiftImage(next.individualRegistrationGiftImage || "");
    };

    const unsubscribe = dashboardAPI.subscribe((dashboard) => apply(dashboard?.commandConfig || commandConfigManager.getConfig()));
    apply(commandConfigManager.getConfig());

    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadGiftAssets = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/gifts");
        if (!response.ok) throw new Error("gift endpoint unavailable");
        const payload = await response.json();
        if (!cancelled && Array.isArray(payload.files)) {
          const files = payload.files.filter(Boolean);
          setGiftAssets(Array.from(new Set([...files, ...DEFAULT_GIFT_ASSETS])).sort((a, b) => a.localeCompare(b)));
        }
      } catch {
        if (!cancelled) setGiftAssets(DEFAULT_GIFT_ASSETS);
      }
    };
    loadGiftAssets();
    const interval = setInterval(loadGiftAssets, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const notify = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const saveIndividualRegistration = () => {
    const current = commandConfigManager.getConfig();
    const giftAsset = individualMethod === "gift" ? individualGiftAsset : "";
    const giftName = individualMethod === "gift"
      ? (individualGift || individualGiftAsset.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "))
      : "";
    const giftImage = individualMethod === "gift"
      ? (individualGiftImage || (giftAsset ? `/gifts/${encodeURIComponent(giftAsset)}` : ""))
      : "";

    const result = commandConfigManager.updateFullConfig({
      ...current,
      individualRegistrationMethod: individualMethod,
      individualCommand: individualCommand.trim().toLowerCase() || "entrar",
      individualRegistrationGift: giftName,
      individualRegistrationGiftAsset: giftAsset,
      individualRegistrationGiftImage: giftImage
    });

    if (!result.success) {
      notify(`❌ ${result.errors?.join(" ") || "No se pudo guardar."}`);
      return;
    }

    setConfig(commandConfigManager.getConfig());
    notify("✅ Método de inscripción individual guardado.");
  };

  const handleModeChange = (e) => {
    const next = e.target.value;
    const current = commandConfigManager.getConfig();
    const result = commandConfigManager.updateFullConfig({ ...current, gameRegistrationMode: next });
    if (!result.success) notify(`❌ ${result.errors?.join(" ") || "No se pudo cambiar el modo."}`);
    else setConfig(commandConfigManager.getConfig());
  };

  const handleSaveWinLimpia = (e) => {
    e.preventDefault();
    const current = commandConfigManager.getConfig();
    const res = commandConfigManager.updateFullConfig({
      ...current,
      winLimpia: { enabled: winEnabled, points: Number(winPoints) || 1 }
    });
    notify(res.success ? "✅ Configuración de Win Limpia guardada correctamente." : "❌ Error guardando Win Limpia.");
  };

  const handleTeamUpdate = (teamId, field, value) => {
    const currentCfg = commandConfigManager.getConfig();
    const updatedTeams = currentCfg.teams.map(t => t.id === teamId
      ? { ...t, [field]: field === "commands" || field === "gifts" ? value.split(",").map(s => s.trim()).filter(Boolean) : value }
      : t
    );
    commandConfigManager.updateFullConfig({ ...currentCfg, teams: updatedTeams });
  };

  const selectGiftAsset = (asset) => {
    setIndividualGiftAsset(asset);
    setIndividualGift(asset.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
    setIndividualGiftImage(asset ? `/gifts/${encodeURIComponent(asset)}` : "");
  };

  return (
    <div style={{ background: "rgba(25,20,38,.94)", border: "1px solid rgba(255,255,255,.15)", borderRadius: "10px", padding: "16px", boxShadow: "0 4px 15px rgba(0,0,0,.4)", display: "flex", flexDirection: "column", gap: "14px" }}>
      <h3 style={{ margin: 0, fontSize: "14px", color: "#00f5ff", textTransform: "uppercase", letterSpacing: ".5px" }}>⚙️ Configuración de Comandos & Win Limpia</h3>

      <div style={{ background: "rgba(12,10,20,.85)", border: "1px solid rgba(255,215,0,.28)", borderRadius: "8px", padding: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ fontSize: "12px", fontWeight: 900, color: "#ffd700", textTransform: "uppercase" }}>🏆 Configuración de Win Limpia</span>
          <span style={{ fontSize: "10px", fontWeight: 800, color: winEnabled ? "#48bb78" : "#e53e3e" }}>{winEnabled ? "ON" : "OFF"}</span>
        </div>
        <form onSubmit={handleSaveWinLimpia} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px", alignItems: "end" }}>
          <label style={{ fontSize: "10px", color: "#a0aec0", fontWeight: 700 }}>Estado<select value={winEnabled ? "ON" : "OFF"} onChange={e => setWinEnabled(e.target.value === "ON")} style={{ ...fieldStyle, marginTop: "3px" }}><option value="ON">ON</option><option value="OFF">OFF</option></select></label>
          <label style={{ fontSize: "10px", color: "#a0aec0", fontWeight: 700 }}>Puntos por Win<input type="number" min="1" value={winPoints} onChange={e => setWinPoints(e.target.value)} style={{ ...fieldStyle, marginTop: "3px" }} /></label>
          <button type="submit" style={{ background: "linear-gradient(135deg,#48bb78,#38a169)", color: "white", border: 0, padding: "8px 12px", borderRadius: "6px", fontWeight: 900, cursor: "pointer", fontSize: "10px" }}>GUARDAR</button>
        </form>
      </div>

      <div style={{ background: "rgba(12,10,20,.88)", border: "1px solid rgba(0,245,255,.32)", borderRadius: "8px", padding: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "12px", color: "#00f5ff", fontWeight: 900, textTransform: "uppercase" }}>👤 Inscripción del Modo Individual</div>
            <div style={{ fontSize: "10px", color: "#a0aec0", marginTop: "3px" }}>Elige si los espectadores entran escribiendo un comando o enviando un regalo.</div>
          </div>
          <span style={{ fontSize: "9px", color: "#48bb78", fontWeight: 900, background: "rgba(72,187,120,.12)", padding: "4px 7px", borderRadius: "5px" }}>CONFIGURACIÓN PERSISTENTE</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: "9px", alignItems: "end" }}>
          <label style={{ fontSize: "10px", color: "#a0aec0", fontWeight: 700 }}>Método de inscripción<select value={individualMethod} onChange={e => setIndividualMethod(e.target.value)} style={{ ...fieldStyle, marginTop: "3px" }}><option value="command">COMANDO</option><option value="gift">REGALO</option></select></label>

          {individualMethod === "command" ? (
            <label style={{ fontSize: "10px", color: "#a0aec0", fontWeight: 700 }}>Comando para entrar<input value={individualCommand} onChange={e => setIndividualCommand(e.target.value)} placeholder="entrar" style={{ ...fieldStyle, marginTop: "3px", textTransform: "lowercase" }} /></label>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "8px" }}>
              <label style={{ fontSize: "10px", color: "#a0aec0", fontWeight: 700 }}>Regalo de inscripción<select value={individualGiftAsset} onChange={e => selectGiftAsset(e.target.value)} style={{ ...fieldStyle, marginTop: "3px" }}><option value="">Selecciona un regalo…</option>{giftAssets.map(asset => <option key={asset} value={asset}>{asset}</option>)}</select></label>
              <div style={{ minHeight: "58px", border: "1px solid rgba(255,255,255,.12)", borderRadius: "6px", background: "#120f1d", display: "flex", alignItems: "center", justifyContent: "center" }}>{individualGiftImage ? <img src={individualGiftImage} alt={individualGift || "Regalo"} style={{ width: "48px", height: "48px", objectFit: "contain" }} /> : <span style={{ color: "#718096", fontSize: "9px", textAlign: "center" }}>Vista previa<br />del regalo</span>}</div>
            </div>
          )}
        </div>

        {individualMethod === "gift" && <div style={{ marginTop: "8px", fontSize: "9px", color: "#718096" }}>Se muestran los archivos encontrados en <b>public/gifts</b>. La lista se actualiza automáticamente mientras el panel está abierto.</div>}
        <button onClick={saveIndividualRegistration} style={{ marginTop: "10px", width: "100%", background: "linear-gradient(135deg,#00bfff,#0088ff)", color: "white", border: 0, padding: "8px", borderRadius: "6px", fontWeight: 900, cursor: "pointer", fontSize: "10px" }}>💾 GUARDAR MÉTODO DE INSCRIPCIÓN INDIVIDUAL</button>
      </div>

      <div>
        <label style={{ fontSize: "11px", color: "#a0aec0", display: "block", marginBottom: "4px", fontWeight: 700 }}>Modo de Inscripción del Juego:</label>
        <select value={config.gameRegistrationMode || "INDIVIDUAL"} onChange={handleModeChange} style={fieldStyle}>
          <option value="INDIVIDUAL">INDIVIDUAL</option>
          <option value="TEAMS">EQUIPOS</option>
          <option value="GENDER_TEAMS">CHICOS VS CHICAS</option>
        </select>
      </div>

      <div style={{ fontSize: "11px", color: "#a0aec0", textTransform: "uppercase", fontWeight: 700 }}>Equipos y Reglas de Inscripción:</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {config.teams?.map(team => (
          <div key={team.id} style={{ background: "rgba(12,10,20,.6)", border: `1px solid ${team.color || "rgba(255,255,255,.1)"}`, borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "12px", fontWeight: 900, color: team.color || "#fff", marginBottom: "6px" }}>{team.name} ({team.id})</div>
            <label style={{ display: "block", fontSize: "10px", color: "#a0aec0", marginBottom: "5px" }}>Comandos (separados por coma):<input type="text" defaultValue={(team.commands || []).join(", ")} onBlur={e => handleTeamUpdate(team.id, "commands", e.target.value)} style={{ ...fieldStyle, marginTop: "2px" }} /></label>
            <label style={{ display: "block", fontSize: "10px", color: "#a0aec0" }}>Regalos (separados por coma):<input type="text" defaultValue={(team.gifts || []).join(", ")} onBlur={e => handleTeamUpdate(team.id, "gifts", e.target.value)} style={{ ...fieldStyle, marginTop: "2px" }} /></label>
          </div>
        ))}
      </div>

      {feedback && <div style={{ fontSize: "11px", color: feedback.startsWith("❌") ? "#fc8181" : "#48bb78", fontWeight: 800, textAlign: "center" }}>{feedback}</div>}
    </div>
  );
}
