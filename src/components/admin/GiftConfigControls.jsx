import { useState } from "react";
import { configManager } from "../../core/configManager";
import { audioManager } from "../../core/audioManager";
import { CANONICAL_GIFTS, resolveCanonicalGiftId } from "../../config/canonicalGifts";
import { ABILITY_REGISTRY } from "../../config/abilityRegistry";
import { GiftImage } from "../common/GiftImage";

/**
 * Gift Control Center v4 — P5 Hardening & Canonical Registry Integration
 * Operator-friendly production console using CANONICAL_GIFTS source of truth.
 * Ensures 100% safe audio/visual preview (zero scoring) and persistent configuration.
 */
export function GiftConfigControls() {
  const [selectedMode, setSelectedMode] = useState("context");

  // Get supported canonical gifts list
  const supportedGiftsList = Object.values(CANONICAL_GIFTS).filter(g => g.supported);

  // Initialize rules by mode from configManager with fail-safe fallback
  const [rulesByMode, setRulesByMode] = useState(() => {
    try {
      const saved = configManager.get("giftRules");
      if (saved && typeof saved === "object") {
        return saved;
      }
    } catch (e) {
      console.warn("[GiftControlCenter] Failed to load giftRules:", e);
    }
    return {
      context: [
        { giftId: "doughnut", displayName: "Doughnut 🍩", action: "Special event", value: 30, active: true, sound: "/mudo.mp3", animation: "silent_challenge" },
        { giftId: "hat_and_mustache", displayName: "Hat and Mustache 🤠", action: "Add points", value: 99, active: true, sound: "/Sounds/Sombrero Vaquero.mp3", animation: "creative_challenge" }
      ]
    };
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [previewNotification, setPreviewNotification] = useState(null);

  const [formState, setFormState] = useState({
    giftId: "doughnut",
    displayName: "Doughnut 🍩",
    pointsEnabled: true,
    value: 30,
    soundEnabled: true,
    sound: "/mudo.mp3",
    animationEnabled: true,
    animation: "silent_challenge",
    active: true
  });

  const currentRules = rulesByMode[selectedMode] || [];

  const persistRules = (newRulesByMode) => {
    setRulesByMode(newRulesByMode);
    try {
      configManager.set("giftRules", newRulesByMode);
    } catch (e) {
      console.warn("[GiftControlCenter] Failed to persist giftRules:", e);
    }
  };

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setFormState({
      giftId: "doughnut",
      displayName: "Doughnut 🍩",
      pointsEnabled: true,
      value: 30,
      soundEnabled: true,
      sound: "/mudo.mp3",
      animationEnabled: true,
      animation: "silent_challenge",
      active: true
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (index, rule) => {
    setEditingIndex(index);
    const resolved = resolveCanonicalGiftId(rule.giftId);
    setFormState({
      giftId: resolved ? resolved.canonicalId : (rule.giftId || "doughnut"),
      displayName: rule.displayName || (resolved ? resolved.displayName : rule.giftId),
      pointsEnabled: rule.pointsEnabled !== false && (rule.value > 0 || rule.action === "Add points"),
      value: rule.value ?? 30,
      soundEnabled: rule.soundEnabled !== false && !!rule.sound,
      sound: rule.sound || resolved?.sound || "",
      animationEnabled: rule.animationEnabled !== false && !!rule.animation,
      animation: rule.animation || resolved?.animation || "none",
      active: rule.active !== false
    });
    setShowAddModal(true);
  };

  const handleGiftSelect = (e) => {
    const selectedId = e.target.value;
    const resolved = resolveCanonicalGiftId(selectedId);
    if (resolved) {
      setFormState({
        ...formState,
        giftId: resolved.canonicalId,
        displayName: resolved.displayName,
        value: resolved.defaultPoints || 30,
        sound: resolved.sound || "",
        animation: resolved.animation || "none"
      });
    }
  };

  const handleSaveRule = (e) => {
    e.preventDefault();
    const rulePayload = {
      giftId: formState.giftId,
      displayName: formState.displayName,
      action: formState.pointsEnabled ? "Add points" : "Special event",
      value: formState.pointsEnabled ? Number(formState.value) || 0 : 0,
      soundEnabled: formState.soundEnabled,
      sound: formState.soundEnabled ? formState.sound : null,
      animationEnabled: formState.animationEnabled,
      animation: formState.animationEnabled ? formState.animation : null,
      active: formState.active
    };

    let updated;
    if (editingIndex !== null) {
      updated = currentRules.map((r, i) => i === editingIndex ? rulePayload : r);
    } else {
      updated = [...currentRules, rulePayload];
    }

    const newRulesByMode = { ...rulesByMode, [selectedMode]: updated };
    persistRules(newRulesByMode);
    setShowAddModal(false);
  };

  const handleDeleteRule = (index) => {
    const updated = currentRules.filter((_, i) => i !== index);
    const newRulesByMode = { ...rulesByMode, [selectedMode]: updated };
    persistRules(newRulesByMode);
  };

  const handleToggleActive = (index) => {
    const updated = currentRules.map((r, i) => i === index ? { ...r, active: r.active === false ? true : false } : r);
    const newRulesByMode = { ...rulesByMode, [selectedMode]: updated };
    persistRules(newRulesByMode);
  };

  // Safe Preview — AUDIO & VISUAL ONLY. ZERO SCORING. ZERO STATE MUTATION.
  const handleSafePreview = (rule) => {
    if (rule.sound) {
      try {
        audioManager.playSound(rule.sound, { source: "SAFE_PREVIEW" });
      } catch (err) {
        console.warn("[GiftControlCenter] Audio preview note:", err);
      }
    }
    setPreviewNotification(`▶ PREVIEW: ${rule.displayName || rule.giftId} (Audio/Visual Only - Zero Scoring)`);
    setTimeout(() => setPreviewNotification(null), 3500);
  };

  return (
    <div style={{
      background: "rgba(25, 20, 38, 0.95)",
      border: "1px solid rgba(0, 245, 255, 0.3)",
      borderRadius: "12px",
      padding: "18px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
      display: "flex",
      flexDirection: "column",
      gap: "16px"
    }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.12)", paddingBottom: "12px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#00f5ff", textTransform: "uppercase", letterSpacing: "1px" }}>
            🎁 Gift Control Center (Canonical P5)
          </h3>
          <div style={{ fontSize: "11px", color: "#a0aec0", marginTop: "2px" }}>
            Configuración determinista por Gift respaldada por el Canonical Gift Registry
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "11px", color: "#ffd700", fontWeight: 800 }}>Mode:</span>
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            style={{
              background: "#120f1d",
              color: "#00f5ff",
              border: "1px solid rgba(0,245,255,0.4)",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 800,
              cursor: "pointer",
              textTransform: "uppercase"
            }}
          >
            <option value="context">Context / Standard</option>
            <option value="vs_battle">VS Battle</option>
            <option value="tournament">Tournament</option>
          </select>
        </div>
      </div>

      {/* ACTION BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "12px", color: "#e2e8f0" }}>
          Gifts operativos configurados para <strong style={{ color: "#ffd700", textTransform: "uppercase" }}>{selectedMode}</strong> ({currentRules.length} gifts)
        </div>
        <button
          onClick={handleOpenAdd}
          style={{
            background: "linear-gradient(135deg, #00f5ff, #0077ff)",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: "0 2px 10px rgba(0,245,255,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}
        >
          + Agregar Gift Operativo
        </button>
      </div>

      {/* PREVIEW NOTIFICATION BANNER */}
      {previewNotification && (
        <div style={{
          background: "linear-gradient(135deg, rgba(255,215,0,0.95), rgba(255,140,0,0.95))",
          color: "#0c091a",
          borderRadius: "8px",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 0 25px rgba(255,215,0,0.8)",
          fontWeight: 900,
          fontSize: "11px",
          textTransform: "uppercase"
        }}>
          <span>{previewNotification}</span>
          <span style={{ background: "#0c091a", color: "#ffd700", padding: "2px 6px", borderRadius: "4px", fontSize: "9px" }}>ZERO SCORING</span>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showAddModal && (
        <form onSubmit={handleSaveRule} style={{
          background: "rgba(18, 15, 29, 0.98)",
          border: "1.5px solid #00f5ff",
          borderRadius: "10px",
          padding: "18px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.8)"
        }}>
          <div style={{ fontSize: "13px", fontWeight: 900, color: "#00f5ff", textTransform: "uppercase" }}>
            {editingIndex !== null ? "Editar Comportamiento de Gift" : "Agregar Gift Operativo Soportado"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "10px", color: "#ffd700", display: "block", marginBottom: "3px", fontWeight: 900 }}>Gift Canónico:</label>
              <select
                value={formState.giftId}
                onChange={handleGiftSelect}
                style={{ width: "100%", background: "#120f1d", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", padding: "8px", fontSize: "11px", fontWeight: 800 }}
              >
                {supportedGiftsList.map(g => (
                  <option key={g.canonicalId} value={g.canonicalId}>{g.displayName} (ID: {g.canonicalId})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: "10px", color: "#a0aec0", display: "block", marginBottom: "3px", fontWeight: 800 }}>Nombre Visible:</label>
              <input
                type="text"
                value={formState.displayName}
                onChange={(e) => setFormState({ ...formState, displayName: e.target.value })}
                style={{ width: "100%", background: "#120f1d", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", padding: "8px", fontSize: "11px" }}
                required
              />
            </div>
          </div>

          {/* Behavior Toggles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px" }}>
            {/* Points Config */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 900, color: "#00f5ff", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={formState.pointsEnabled}
                  onChange={(e) => setFormState({ ...formState, pointsEnabled: e.target.checked })}
                />
                Otorga Puntaje
              </label>
              {formState.pointsEnabled && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "10px", color: "#a0aec0" }}>Puntos:</span>
                  <input
                    type="number"
                    value={formState.value}
                    onChange={(e) => setFormState({ ...formState, value: parseInt(e.target.value) || 0 })}
                    style={{ width: "80px", background: "#120f1d", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", padding: "4px", fontSize: "11px", fontWeight: 900 }}
                  />
                </div>
              )}
            </div>

            {/* Sound Config */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 900, color: "#ffd700", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={formState.soundEnabled}
                  onChange={(e) => setFormState({ ...formState, soundEnabled: e.target.checked })}
                />
                Reproducir Sonido
              </label>
              {formState.soundEnabled && (
                <select
                  value={formState.sound}
                  onChange={(e) => setFormState({ ...formState, sound: e.target.value })}
                  style={{ background: "#120f1d", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", padding: "4px", fontSize: "10.5px" }}
                >
                  <option value="/mudo.mp3">mudo.mp3 (Doughnut)</option>
                  <option value="/Sounds/Sombrero Vaquero.mp3">Sombrero Vaquero.mp3 (Hat)</option>
                  <option value="/Sounds/Kamehameha.mp3">Kamehameha.mp3 (Galaxy)</option>
                  <option value="/Sounds/Reinicio.mp3">Reinicio.mp3 (Money Gun)</option>
                  <option value="pop">pop</option>
                  <option value="epic">epic</option>
                </select>
              )}
            </div>

            {/* Animation / Ability Config */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 900, color: "#ff6b6b", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={formState.animationEnabled}
                  onChange={(e) => setFormState({ ...formState, animationEnabled: e.target.checked })}
                />
                Activar Animación / Ability
              </label>
              {formState.animationEnabled && (
                <select
                  value={formState.animation}
                  onChange={(e) => setFormState({ ...formState, animation: e.target.value })}
                  style={{ background: "#120f1d", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", padding: "4px", fontSize: "10.5px" }}
                >
                  <option value="silent_challenge">El Mudo (silent_challenge)</option>
                  <option value="creative_challenge">Reto Creativo (creative_challenge)</option>
                  <option value="ultimate_galaxy">Galaxy Ultimate (ultimate_galaxy)</option>
                  <option value="epic_impact">Epic Impact (epic_impact)</option>
                  <option value="freeze">Freeze / Castigo (Freeze)</option>
                  <option value="none">Ninguna</option>
                </select>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
            <button
              type="submit"
              style={{ background: "#48bb78", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "11px", fontWeight: 900, cursor: "pointer" }}
            >
              Guardar Configuración
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              style={{ background: "#4a5568", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "11px", fontWeight: 900, cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* GIFT CARDS GRID */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
        gap: "14px",
        maxHeight: "500px",
        overflowY: "auto",
        paddingRight: "4px"
      }}>
        {currentRules.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", color: "#a0aec0", padding: "40px", fontSize: "12px", fontStyle: "italic" }}>
            No hay gifts operativos configurados en este modo. Pulsa "+ Agregar Gift Operativo" para comenzar.
          </div>
        ) : (
          currentRules.map((rule, index) => {
            const isActive = rule.active !== false;
            const pointsText = rule.pointsEnabled !== false && rule.value > 0 ? `+${rule.value} Puntos` : "Sin Puntaje";
            const soundText = rule.soundEnabled !== false && rule.sound ? rule.sound : "Sin Sonido";
            const animText = rule.animationEnabled !== false && rule.animation ? rule.animation : "Sin Animación";

            return (
              <div key={index} style={{
                background: isActive ? "linear-gradient(145deg, rgba(32, 26, 48, 0.95), rgba(18, 14, 30, 0.98))" : "rgba(20, 16, 28, 0.6)",
                border: isActive ? "1.5px solid rgba(0, 245, 255, 0.4)" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "10px",
                boxShadow: isActive ? "0 4px 15px rgba(0,0,0,0.5)" : "none",
                opacity: isActive ? 1 : 0.65
              }}>
                {/* Top Row: Name & Status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "24px", height: "24px", display: "inline-block", flexShrink: 0 }}>
                      <GiftImage giftId={rule.giftId} style={{ width: "24px", height: "24px" }} />
                    </span>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 900, color: "#fff", textTransform: "uppercase" }}>
                        {rule.displayName || rule.giftId}
                      </div>
                      <div style={{ fontSize: "9px", color: "#ffd700", fontFamily: "monospace" }}>
                        Canonical ID: {rule.giftId}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "8.5px",
                    fontWeight: 900,
                    background: isActive ? "rgba(72, 187, 120, 0.2)" : "rgba(229, 62, 62, 0.2)",
                    color: isActive ? "#48bb78" : "#e53e3e",
                    textTransform: "uppercase"
                  }}>
                    {isActive ? "ACTIVE" : "DISABLED"}
                  </span>
                </div>

                {/* Behavior Summary */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", background: "rgba(0,0,0,0.3)", padding: "8px", borderRadius: "6px", fontSize: "10.5px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#a0aec0" }}>Puntaje:</span>
                    <strong style={{ color: "#00f5ff" }}>{pointsText}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#a0aec0" }}>Sonido:</span>
                    <strong style={{ color: "#ffd700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }}>{soundText}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#a0aec0" }}>Animación:</span>
                    <strong style={{ color: "#ff6b6b" }}>{animText}</strong>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                  <button
                    onClick={() => handleSafePreview(rule)}
                    style={{
                      background: "linear-gradient(135deg, #ffd700, #ff8c00)",
                      color: "#0c091a",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: "5px",
                      fontSize: "10px",
                      fontWeight: 900,
                      cursor: "pointer",
                      flex: 1,
                      textTransform: "uppercase"
                    }}
                  >
                    ▶ Preview
                  </button>
                  <button
                    onClick={() => handleOpenEdit(index, rule)}
                    style={{
                      background: "#0099ff",
                      color: "#fff",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: "5px",
                      fontSize: "10px",
                      fontWeight: 800,
                      cursor: "pointer"
                    }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteRule(index)}
                    style={{
                      background: "#e53e3e",
                      color: "#fff",
                      border: "none",
                      padding: "6px 8px",
                      borderRadius: "5px",
                      fontSize: "10px",
                      fontWeight: 800,
                      cursor: "pointer"
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
