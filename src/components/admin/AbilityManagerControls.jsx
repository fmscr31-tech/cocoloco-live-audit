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

// Sound catalog entries can be strings or objects depending on how the
// catalog/runtime supplied them. The UI and audio manager both require the
// actual playable path, never the catalog object itself.
function normalizeSound(sound) {
  if (!sound) return "";
  if (typeof sound === "string") return sound;
  if (typeof sound === "object") {
    return sound.path || sound.url || sound.src || sound.file || sound.value || sound.name || "";
  }
  return String(sound);
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

const inputStyle = { background: "#120f1d", color: "#fff", border: "1px solid rgba(255,255,255,.2)", borderRadius: "4px", padding: "4px 7px", fontSize: "11px" };
const selectStyle = { ...inputStyle, minWidth: "150px" };

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

  // IMPORTANT: never persist the whole stale abilities object after editing one
  // field. Each edit reads the latest persisted ability and writes only that ID.
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
    setAbilities({
      ...abilities,
      [id]: { ...abilities[id], ...nextAbility }
    });
  };

  const saveFreeze = patch => {
    const latest = configManager.get("battleEffects.freeze") || {};
    const next = { ...DEFAULT_FREEZE, ...latest, ...patch, sound: normalizeSound(patch.sound !== undefined ? patch.sound : (latest.sound ?? freezeConfig.sound)) };
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

  return (
    <div style={{ background: "rgba(25,20,38,.9)", border: "1px solid rgba(255,255,255,.15)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,.1)", paddingBottom: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "15px", color: "#00f5ff", textTransform: "uppercase" }}>⚡ Ability & Gift Sound Manager v4.0</h3>
        <span style={{ fontSize: "11px", color: "#a0aec0", fontWeight: 700 }}>{Object.keys(abilities).length} Abilities | {giftSounds.length} Gift Sounds</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead><tr style={{ color: "#a0aec0", fontSize: "10px", textTransform: "uppercase" }}><th>Ability / ID</th><th>Display</th><th>Action</th><th>Duration & Score</th><th>TikTok Gift</th><th>🎵 Ability Sound</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{Object.values(abilities).map(ability => {
            const mapping = abilityGiftMap.find(item => item.abilityId === ability.abilityId) || { giftName: "Gift", aliases: [] };
            return <tr key={ability.abilityId} style={{ borderTop: "1px solid rgba(255,255,255,.06)", opacity: ability.enabled === false ? .5 : 1 }}>
              <td><input value={ability.display?.name || ""} onChange={e => saveAbility(ability.abilityId, { display: { ...ability.display, name: e.target.value } })} style={{ ...inputStyle, width: "110px" }} /><div style={{ fontSize: "9px", color: "#a0aec0" }}>{ability.abilityId}</div></td>
              <td><input value={ability.display?.icon || ""} onChange={e => saveAbility(ability.abilityId, { display: { ...ability.display, icon: e.target.value } })} style={{ ...inputStyle, width: "32px" }} /><input value={ability.display?.color || ""} onChange={e => saveAbility(ability.abilityId, { display: { ...ability.display, color: e.target.value } })} style={{ ...inputStyle, width: "70px", marginLeft: "4px" }} /></td>
              <td><input value={ability.gameAction?.type || ""} onChange={e => saveAbility(ability.abilityId, { gameAction: { ...ability.gameAction, type: e.target.value } })} style={{ ...inputStyle, width: "95px", display: "block", marginBottom: "3px" }} /><input value={ability.gameAction?.value || ""} onChange={e => saveAbility(ability.abilityId, { gameAction: { ...ability.gameAction, value: e.target.value } })} style={{ ...inputStyle, width: "95px" }} /></td>
              <td><input type="number" min="1000" step="500" value={ability.duration || 10000} onChange={e => saveAbility(ability.abilityId, { duration: Math.max(1000, Number(e.target.value) || 10000) })} style={{ ...inputStyle, width: "70px", display: "block", marginBottom: "3px" }} /><input type="number" value={ability.scoreAction?.value ?? 0} onChange={e => saveAbility(ability.abilityId, { scoreAction: { ...ability.scoreAction, value: Number(e.target.value) || 0 } })} style={{ ...inputStyle, width: "70px" }} /></td>
              <td><select value={mapping.giftName} onChange={e => changeGift(ability.abilityId, e.target.value)} style={selectStyle}><option>Doughnut</option><option>Hat and Mustache</option><option>Galaxy</option><option>Money Gun</option><option>Amped Up</option><option>Twinkling Star</option><option>Coconut</option></select><input value={(mapping.aliases || []).join(", ")} onChange={e => changeAliases(ability.abilityId, e.target.value)} style={{ ...inputStyle, width: "145px", marginTop: "3px" }} /></td>
              <td><select value={normalizeSound(ability.sound)} onChange={e => saveAbility(ability.abilityId, { sound: e.target.value || null })} style={selectStyle}><option value="">— Sin sonido —</option>{soundOptions.map(sound => <option key={sound} value={sound}>{sound.split("/").pop()}</option>)}</select><button onClick={() => preview(ability.sound)} style={{ display: "block", marginTop: "3px" }}>🔊 Test Sound</button></td>
              <td>{ability.enabled === false ? "Disabled" : "Active"}</td>
              <td><button onClick={() => saveAbility(ability.abilityId, { enabled: ability.enabled === false })}>{ability.enabled === false ? "Enable" : "Disable"}</button><button onClick={() => runPreview(ability)} style={{ marginLeft: "4px" }}>▶ Preview</button></td>
            </tr>;
          })}</tbody>
        </table>
      </div>

      <div style={{ background: "rgba(0,140,220,.1)", border: "1px solid rgba(0,245,255,.3)", borderRadius: "8px", padding: "12px" }}>
        <div style={{ fontSize: "12px", fontWeight: 900, color: "#00f5ff", textTransform: "uppercase", marginBottom: "10px" }}>❄️ Freeze Effect Parameters</div>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center", fontSize: "11px" }}>
          <label>🎁 TikTok Gift <select value={freezeConfig.activationGiftId} onChange={e => { const gift = FREEZE_GIFTS.find(g => g.id === e.target.value); if (gift) saveFreeze({ activationGiftId: gift.id, activationGift: gift.name }); }} style={selectStyle}>{FREEZE_GIFTS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          <label>🔊 Sound <select value={normalizeSound(freezeConfig.sound)} onChange={e => saveFreeze({ sound: e.target.value })} style={selectStyle}><option value="">— Sin sonido —</option>{soundOptions.map(sound => <option key={sound} value={sound}>{sound.split("/").pop()}</option>)}</select></label>
          <button onClick={() => preview(freezeConfig.sound)}>🔊 Test Sound</button>
          <label>Duration (Seconds) <input type="number" min="5" max="600" value={freezeConfig.duration} onChange={e => saveFreeze({ duration: Math.max(5, Number(e.target.value) || 300) })} style={{ ...inputStyle, width: "65px" }} /></label>
          <label>Scope / Target <select value={freezeConfig.scope} onChange={e => saveFreeze({ scope: e.target.value })} style={selectStyle}><option value="TEAM">TEAM (Opposing Team)</option><option value="GLOBAL">GLOBAL (Everyone)</option></select></label>
          <label>Rescue Gift Count <input type="number" min="0" max="10" value={freezeConfig.rescueCount} onChange={e => saveFreeze({ rescueCount: Math.max(0, Number(e.target.value) || 0) })} style={{ ...inputStyle, width: "55px" }} /></label>
        </div>
        <div style={{ color: "#48bb78", fontSize: "10px", fontWeight: 700, marginTop: "8px" }}>✓ Persistido automáticamente. El activador es el regalo real de TikTok, no un emoji.</div>
      </div>

      <div style={{ background: "rgba(255,180,0,.06)", border: "1px solid rgba(255,200,0,.2)", borderRadius: "8px", padding: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}><strong>🎁 Gift Sound Configuration</strong><button onClick={addGiftSound}>+ Add Gift Sound</button></div>
        {giftSounds.map((item, index) => <div key={`${item.giftId || item.giftName}-${index}`} style={{ display: "flex", gap: "7px", alignItems: "center", marginBottom: "6px", flexWrap: "wrap" }}>
          <input value={item.giftName || ""} onChange={e => changeGiftSound(index, "giftName", e.target.value)} placeholder="Gift Name" style={{ ...inputStyle, width: "140px" }} />
          <input value={item.giftId || ""} onChange={e => changeGiftSound(index, "giftId", e.target.value)} placeholder="TikTok Gift ID" style={{ ...inputStyle, width: "120px" }} />
          <input value={item.sound || ""} onChange={e => changeGiftSound(index, "sound", e.target.value)} placeholder="/Sounds/file.mp3" style={{ ...inputStyle, width: "210px" }} />
          <button onClick={() => preview(item.sound)}>🔊 Test Sound</button><button onClick={() => changeGiftSound(index, "enabled", item.enabled === false)}>{item.enabled === false ? "Disabled" : "Enabled"}</button><button onClick={() => deleteGiftSound(index)}>Delete</button>
        </div>)}
      </div>
    </div>
  );
}
