import { useMemo, useState } from "react";
import { ABILITY_REGISTRY } from "../../config/abilityRegistry";
import { GIFT_ABILITY_MAP } from "../../config/giftAbilityMap";
import { abilityEventQueue } from "../../core/abilityEventQueue";
import { configManager } from "../../core/configManager";
import { audioManager } from "../../core/audioManager";
import { AVAILABLE_SOUNDS } from "../../config/soundCatalog";

const FREEZE_GIFTS = [{ id: "twinkling_star", name: "Twinkling Star" }];
const DEFAULT_FREEZE = {
  duration: 300,
  scope: "TEAM",
  activationGift: "Twinkling Star",
  activationGiftId: "twinkling_star",
  sound: "/Sounds/5-4-3-2-1-are-you-ready.mp3",
  rescueCount: 2
};

function normalizeSound(sound) {
  if (!sound) return "";
  if (typeof sound === "string") return sound;
  if (typeof sound === "object") {
    return sound.path || sound.url || sound.src || sound.file || sound.value || sound.name || "";
  }
  return String(sound);
}

function soundLabel(sound) {
  const value = normalizeSound(sound);
  if (!value) return "— Sin sonido —";
  return value.split(/[\\/]/).pop() || value;
}

function loadAbilities() {
  const saved = configManager.get("abilities") || {};
  return Object.fromEntries(Object.entries(ABILITY_REGISTRY).map(([id, base]) => {
    const current = saved[id];
    const merged = current ? {
      ...base,
      ...current,
      display: { ...base.display, ...current.display },
      gameAction: { ...base.gameAction, ...current.gameAction },
      scoreAction: { ...base.scoreAction, ...current.scoreAction }
    } : { ...base };
    return [id, { ...merged, sound: normalizeSound(merged.sound) || null }];
  }));
}

function loadGiftMap() {
  const saved = configManager.get("abilityGiftMap");
  return Array.isArray(saved) ? saved : GIFT_ABILITY_MAP;
}

function loadGiftSounds() {
  const saved = configManager.get("giftSounds");
  return Array.isArray(saved) ? saved : [];
}

function loadFreeze() {
  const saved = configManager.get("battleEffects.freeze") || {};
  const merged = {
    ...DEFAULT_FREEZE,
    ...saved,
    activationGift: saved.activationGift === "STAR" ? "Twinkling Star" : (saved.activationGift || DEFAULT_FREEZE.activationGift),
    activationGiftId: saved.activationGiftId === "star" ? "twinkling_star" : (saved.activationGiftId || DEFAULT_FREEZE.activationGiftId)
  };
  return { ...merged, sound: normalizeSound(merged.sound) };
}

const inputStyle = {
  background: "#100d18",
  color: "#fff",
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: "7px",
  padding: "7px 9px",
  fontSize: "11px",
  width: "100%",
  boxSizing: "border-box"
};

const selectStyle = { ...inputStyle, cursor: "pointer" };

const buttonStyle = {
  background: "rgba(255,255,255,.07)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: "7px",
  padding: "6px 9px",
  fontSize: "10px",
  fontWeight: 800,
  cursor: "pointer"
};

const labelStyle = {
  display: "block",
  color: "#8f9bb3",
  fontSize: "9px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: ".06em",
  marginBottom: "5px"
};

const sectionStyle = {
  background: "rgba(12,10,20,.72)",
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: "12px",
  padding: "14px"
};

export function AbilityManagerControls() {
  const [abilities, setAbilities] = useState(loadAbilities);
  const [abilityGiftMap, setAbilityGiftMap] = useState(loadGiftMap);
  const [giftSounds, setGiftSounds] = useState(loadGiftSounds);
  const [freezeConfig, setFreezeConfig] = useState(loadFreeze);

  const soundOptions = useMemo(() => {
    const values = [
      ...Object.values(abilities).map(a => normalizeSound(a.sound)).filter(Boolean),
      normalizeSound(freezeConfig.sound),
      ...(AVAILABLE_SOUNDS || []).map(normalizeSound).filter(Boolean)
    ];
    return [...new Set(values.filter(Boolean))];
  }, [abilities, freezeConfig.sound]);

  const saveAbility = (id, patch) => {
    const latestAbilities = configManager.get("abilities") || {};
    const current = latestAbilities[id] || abilities[id] || ABILITY_REGISTRY[id];
    const nextAbility = {
      ...current,
      ...patch,
      sound: patch.sound !== undefined ? normalizeSound(patch.sound) || null : normalizeSound(current.sound) || null,
      display: patch.display ? { ...(current.display || {}), ...patch.display } : current.display,
      gameAction: patch.gameAction ? { ...(current.gameAction || {}), ...patch.gameAction } : current.gameAction,
      scoreAction: patch.scoreAction ? { ...(current.scoreAction || {}), ...patch.scoreAction } : current.scoreAction
    };

    configManager.set(`abilities.${id}`, nextAbility);
    setAbilities({ ...abilities, [id]: { ...abilities[id], ...nextAbility } });
  };

  const saveFreeze = patch => {
    const latest = configManager.get("battleEffects.freeze") || {};
    const next = {
      ...DEFAULT_FREEZE,
      ...latest,
      ...patch,
      sound: normalizeSound(patch.sound !== undefined ? patch.sound : (latest.sound ?? freezeConfig.sound))
    };
    setFreezeConfig(next);
    configManager.set("battleEffects.freeze", next);
  };

  const preview = sound => {
    const playableSound = normalizeSound(sound);
    if (playableSound) audioManager.previewSound(playableSound);
  };

  const changeGift = (abilityId, giftName) => {
    const latest = loadGiftMap();
    const next = latest.map(item => item.abilityId === abilityId
      ? { ...item, giftName, giftId: giftName.toLowerCase().replace(/\s+/g, "_") }
      : item);
    setAbilityGiftMap(next);
    configManager.set("abilityGiftMap", next);
  };

  const changeAliases = (abilityId, value) => {
    const aliases = value.split(",").map(v => v.trim()).filter(Boolean);
    const latest = loadGiftMap();
    const next = latest.map(item => item.abilityId === abilityId ? { ...item, aliases } : item);
    setAbilityGiftMap(next);
    configManager.set("abilityGiftMap", next);
  };

  const changeGiftSound = (index, field, value) => {
    const latest = loadGiftSounds();
    const next = latest.map((item, i) => i === index ? { ...item, [field]: value } : item);
    setGiftSounds(next);
    configManager.set("giftSounds", next);
  };

  const addGiftSound = () => {
    const latest = loadGiftSounds();
    const next = [...latest, { giftName: "New Gift", giftId: "new_gift", sound: "", enabled: true }];
    setGiftSounds(next);
    configManager.set("giftSounds", next);
  };

  const deleteGiftSound = index => {
    const latest = loadGiftSounds();
    const next = latest.filter((_, i) => i !== index);
    setGiftSounds(next);
    configManager.set("giftSounds", next);
  };

  const runPreview = ability => {
    const playableSound = normalizeSound(ability.sound);
    preview(playableSound);
    const latestMap = loadGiftMap();
    const mapping = latestMap.find(item => item.abilityId === ability.abilityId);
    abilityEventQueue.enqueue({
      abilityId: ability.abilityId,
      sourceGift: mapping?.giftName || "Gift",
      teamId: "team1",
      sender: "ADMIN_PREVIEW",
      source: "ADMIN_PREVIEW",
      display: ability.display,
      gameAction: ability.gameAction,
      scoreAction: ability.scoreAction,
      duration: ability.duration || 10000,
      sound: playableSound
    });
  };

  const abilityAccent = ability => {
    const color = String(ability.display?.color || "#00f5ff");
    const map = {
      cyan: "#00f5ff",
      orange: "#ff9f43",
      blue_gold: "#ffd166",
      red: "#ff5c5c",
      purple: "#c084fc"
    };
    return map[color] || color;
  };

  return (
    <div style={{ background: "rgba(18,14,28,.96)", border: "1px solid rgba(255,255,255,.12)", borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", paddingBottom: "13px", borderBottom: "1px solid rgba(255,255,255,.09)" }}>
        <div>
          <div style={{ color: "#00f5ff", fontSize: "16px", fontWeight: 950, letterSpacing: ".02em" }}>⚡ ABILITY MANAGER</div>
          <div style={{ color: "#77839a", fontSize: "10px", marginTop: "3px" }}>Abilities, activadores, sonidos y efectos especiales</div>
        </div>
        <div style={{ display: "flex", gap: "7px" }}>
          <span style={{ background: "rgba(0,245,255,.08)", border: "1px solid rgba(0,245,255,.18)", color: "#8cefff", borderRadius: "999px", padding: "5px 9px", fontSize: "10px", fontWeight: 900 }}>{Object.keys(abilities).length} ABILITIES</span>
          <span style={{ background: "rgba(255,193,7,.08)", border: "1px solid rgba(255,193,7,.18)", color: "#ffd66b", borderRadius: "999px", padding: "5px 9px", fontSize: "10px", fontWeight: 900 }}>{giftSounds.length} GIFT SOUNDS</span>
        </div>
      </div>

      <section style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div>
            <div style={{ color: "#fff", fontSize: "13px", fontWeight: 900 }}>⚡ ABILITIES</div>
            <div style={{ color: "#6f7b91", fontSize: "10px", marginTop: "2px" }}>Cada tarjeta muestra todo lo necesario de una habilidad.</div>
          </div>
          <span style={{ color: "#48bb78", fontSize: "9px", fontWeight: 900 }}>● CONFIGURACIÓN ACTIVA</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "10px" }}>
          {Object.values(abilities).map(ability => {
            const mapping = abilityGiftMap.find(item => item.abilityId === ability.abilityId) || { giftName: "Gift", aliases: [] };
            const accent = abilityAccent(ability);
            const disabled = ability.enabled === false;
            return (
              <article key={ability.abilityId} style={{ background: "linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.015))", border: `1px solid ${accent}33`, borderLeft: `3px solid ${accent}`, borderRadius: "10px", padding: "12px", opacity: disabled ? .55 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "11px" }}>
                  <div style={{ display: "flex", gap: "9px", alignItems: "center", minWidth: 0 }}>
                    <div style={{ width: "38px", height: "38px", flex: "0 0 38px", display: "grid", placeItems: "center", borderRadius: "10px", background: `${accent}18`, border: `1px solid ${accent}45`, fontSize: "20px" }}>{ability.display?.icon || "⚡"}</div>
                    <div style={{ minWidth: 0 }}>
                      <input value={ability.display?.name || ""} onChange={e => saveAbility(ability.abilityId, { display: { ...ability.display, name: e.target.value } })} style={{ ...inputStyle, fontSize: "13px", fontWeight: 900, border: "none", background: "transparent", padding: "0", marginBottom: "3px" }} />
                      <div style={{ color: "#68758b", fontSize: "9px", fontFamily: "monospace" }}>{ability.abilityId}</div>
                    </div>
                  </div>
                  <span style={{ color: disabled ? "#f56565" : "#48bb78", fontSize: "9px", fontWeight: 900, whiteSpace: "nowrap" }}>{disabled ? "● DISABLED" : "● ACTIVE"}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "9px" }}>
                  <div><label style={labelStyle}>Display Color</label><input value={ability.display?.color || ""} onChange={e => saveAbility(ability.abilityId, { display: { ...ability.display, color: e.target.value } })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Action Type</label><input value={ability.gameAction?.type || ""} onChange={e => saveAbility(ability.abilityId, { gameAction: { ...ability.gameAction, type: e.target.value } })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Action</label><input value={ability.gameAction?.value || ""} onChange={e => saveAbility(ability.abilityId, { gameAction: { ...ability.gameAction, value: e.target.value } })} style={inputStyle} /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    <div><label style={labelStyle}>Seconds</label><input type="number" min="1000" step="500" value={ability.duration || 10000} onChange={e => saveAbility(ability.abilityId, { duration: Math.max(1000, Number(e.target.value) || 10000) })} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Score</label><input type="number" value={ability.scoreAction?.value ?? 0} onChange={e => saveAbility(ability.abilityId, { scoreAction: { ...ability.scoreAction, value: Number(e.target.value) || 0 } })} style={inputStyle} /></div>
                  </div>
                </div>

                <div style={{ padding: "9px", borderRadius: "8px", background: "rgba(0,0,0,.18)", border: "1px solid rgba(255,255,255,.06)", marginBottom: "8px" }}>
                  <div style={{ color: "#78859b", fontSize: "9px", fontWeight: 900, textTransform: "uppercase", marginBottom: "6px" }}>🎁 TikTok Gift</div>
                  <select value={mapping.giftName} onChange={e => changeGift(ability.abilityId, e.target.value)} style={selectStyle}>
                    <option>Doughnut</option><option>Hat and Mustache</option><option>Galaxy</option><option>Money Gun</option><option>Amped Up</option><option>Twinkling Star</option><option>Coconut</option>
                  </select>
                  <input value={(mapping.aliases || []).join(", ")} onChange={e => changeAliases(ability.abilityId, e.target.value)} placeholder="Aliases separados por coma" style={{ ...inputStyle, marginTop: "6px" }} />
                </div>

                <div style={{ padding: "9px", borderRadius: "8px", background: `${accent}0b`, border: `1px solid ${accent}22` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ color: "#b5bfd0", fontSize: "9px", fontWeight: 900, textTransform: "uppercase" }}>🎵 Ability Sound</span>
                    <span style={{ color: accent, fontSize: "9px", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{soundLabel(ability.sound)}</span>
                  </div>
                  <select value={normalizeSound(ability.sound)} onChange={e => saveAbility(ability.abilityId, { sound: e.target.value || null })} style={selectStyle}>
                    <option value="">— Sin sonido —</option>
                    {soundOptions.map(sound => <option key={sound} value={sound}>{soundLabel(sound)}</option>)}
                  </select>
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                    <button onClick={() => preview(ability.sound)} style={buttonStyle}>🔊 Test Sound</button>
                    <button onClick={() => saveAbility(ability.abilityId, { enabled: disabled })} style={{ ...buttonStyle, color: disabled ? "#48bb78" : "#f6ad55" }}>{disabled ? "Enable" : "Disable"}</button>
                    <button onClick={() => runPreview(ability)} style={{ ...buttonStyle, color: accent }}>▶ Preview</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section style={{ ...sectionStyle, background: "linear-gradient(145deg, rgba(0,140,220,.10), rgba(0,70,110,.04))", border: "1px solid rgba(0,245,255,.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
          <div>
            <div style={{ color: "#00f5ff", fontSize: "13px", fontWeight: 950 }}>❄️ FREEZE EFFECT</div>
            <div style={{ color: "#708096", fontSize: "10px", marginTop: "2px" }}>Efecto especial independiente de las 5 abilities.</div>
          </div>
          <span style={{ color: "#48bb78", fontSize: "9px", fontWeight: 900 }}>✓ AUTO-SAVED</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "9px" }}>
          <div><label style={labelStyle}>🎁 Activador TikTok</label><select value={freezeConfig.activationGiftId} onChange={e => { const gift = FREEZE_GIFTS.find(g => g.id === e.target.value); if (gift) saveFreeze({ activationGiftId: gift.id, activationGift: gift.name }); }} style={selectStyle}>{FREEZE_GIFTS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
          <div><label style={labelStyle}>🔊 Freeze Sound</label><select value={normalizeSound(freezeConfig.sound)} onChange={e => saveFreeze({ sound: e.target.value })} style={selectStyle}><option value="">— Sin sonido —</option>{soundOptions.map(sound => <option key={sound} value={sound}>{soundLabel(sound)}</option>)}</select></div>
          <div><label style={labelStyle}>⏱ Duration (Seconds)</label><input type="number" min="5" max="600" value={freezeConfig.duration} onChange={e => saveFreeze({ duration: Math.max(5, Number(e.target.value) || 300) })} style={inputStyle} /></div>
          <div><label style={labelStyle}>🎯 Scope / Target</label><select value={freezeConfig.scope} onChange={e => saveFreeze({ scope: e.target.value })} style={selectStyle}><option value="TEAM">TEAM — Opposing Team</option><option value="GLOBAL">GLOBAL — Everyone</option></select></div>
          <div><label style={labelStyle}>🛟 Rescue Gift Count</label><input type="number" min="0" max="10" value={freezeConfig.rescueCount} onChange={e => saveFreeze({ rescueCount: Math.max(0, Number(e.target.value) || 0) })} style={inputStyle} /></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
          <button onClick={() => preview(freezeConfig.sound)} style={{ ...buttonStyle, color: "#00f5ff" }}>🔊 Test Freeze Sound</button>
          <span style={{ color: "#6f7d92", fontSize: "9px" }}>El activador es el regalo real de TikTok, no un emoji.</span>
        </div>
      </section>

      <section style={{ ...sectionStyle, background: "linear-gradient(145deg, rgba(255,180,0,.065), rgba(80,55,0,.025))", border: "1px solid rgba(255,193,7,.17)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
          <div>
            <div style={{ color: "#ffd166", fontSize: "13px", fontWeight: 950 }}>🎁 GIFT SOUND OVERRIDES</div>
            <div style={{ color: "#756d5d", fontSize: "10px", marginTop: "2px" }}>Sonidos independientes por regalo. Estos sobrescriben el sonido de una ability cuando corresponde.</div>
          </div>
          <button onClick={addGiftSound} style={{ ...buttonStyle, color: "#ffd166", borderColor: "rgba(255,193,7,.25)" }}>＋ Add Gift Sound</button>
        </div>

        {giftSounds.length === 0 ? (
          <div style={{ color: "#70798a", fontSize: "10px", padding: "14px", textAlign: "center", border: "1px dashed rgba(255,255,255,.09)", borderRadius: "8px" }}>No hay Gift Sound Overrides configurados.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "9px" }}>
            {giftSounds.map((item, index) => (
              <div key={`${item.giftId || item.giftName}-${index}`} style={{ background: "rgba(0,0,0,.18)", border: "1px solid rgba(255,193,7,.11)", borderRadius: "9px", padding: "10px", opacity: item.enabled === false ? .55 : 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: "7px", marginBottom: "7px" }}>
                  <div><label style={labelStyle}>Gift Name</label><input value={item.giftName || ""} onChange={e => changeGiftSound(index, "giftName", e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>TikTok Gift ID</label><input value={item.giftId || ""} onChange={e => changeGiftSound(index, "giftId", e.target.value)} style={inputStyle} /></div>
                </div>
                <label style={labelStyle}>Assigned Sound</label>
                <input value={item.sound || ""} onChange={e => changeGiftSound(index, "sound", e.target.value)} placeholder="/Sounds/file.mp3" style={inputStyle} />
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "7px", flexWrap: "wrap" }}>
                  <span style={{ color: "#ffd166", fontSize: "9px", fontWeight: 900, marginRight: "auto" }}>🎵 {soundLabel(item.sound)}</span>
                  <button onClick={() => preview(item.sound)} style={buttonStyle}>🔊 Test</button>
                  <button onClick={() => changeGiftSound(index, "enabled", item.enabled === false)} style={{ ...buttonStyle, color: item.enabled === false ? "#48bb78" : "#ffd166" }}>{item.enabled === false ? "Enable" : "Enabled"}</button>
                  <button onClick={() => deleteGiftSound(index)} style={{ ...buttonStyle, color: "#f56565" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
