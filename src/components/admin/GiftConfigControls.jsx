import { useMemo, useState } from "react";
import { configManager } from "../../core/configManager";
import { audioManager } from "../../core/audioManager";
import { CANONICAL_GIFTS, resolveCanonicalGiftId } from "../../config/canonicalGifts";
import { GiftImage } from "../common/GiftImage";

const REAL_SOUNDS = [
  { value: "/Sounds/mudo.mp3", label: "mudo.mp3 — Doughnut" },
  { value: "/Sounds/Sombrero Vaquero.mp3", label: "Sombrero Vaquero.mp3 — Hat" },
  { value: "/Sounds/Castigados.mp3", label: "Castigados.mp3 — Freeze" },
  { value: "/Sounds/Kamehameha.mp3", label: "Kamehameha.mp3 — Galaxy" },
  { value: "/Sounds/Reinicio.mp3", label: "Reinicio.mp3 — Money Gun" },
  { value: "/Sounds/Grito feo.mp3", label: "Grito feo.mp3 — Amped Up" },
  { value: "/Sounds/Ahh cute.mp3", label: "Ahh cute.mp3 — Ice Cream / Pista" },
  { value: "/Sounds/coconut-sfx.mp3", label: "coconut-sfx.mp3 — Go Popular / Cocazo" }
];

const REAL_SOUND_SET = new Set(REAL_SOUNDS.map(s => s.value));
const supportedGifts = Object.values(CANONICAL_GIFTS).filter(g => g.supported);

function sanitizeRules(saved) {
  const source = saved && typeof saved === "object" ? saved : {};
  const modes = ["context", "vs_battle", "tournament"];
  const output = {};
  for (const mode of modes) {
    const rules = Array.isArray(source[mode]) ? source[mode] : [];
    output[mode] = rules.map(rule => {
      const resolved = resolveCanonicalGiftId(rule.giftId || rule.giftName);
      const canonical = resolved || CANONICAL_GIFTS[rule.giftId];
      const sound = REAL_SOUND_SET.has(rule.sound) ? rule.sound : (canonical?.sound && REAL_SOUND_SET.has(canonical.sound) ? canonical.sound : null);
      return {
        ...rule,
        giftId: canonical?.canonicalId || rule.giftId,
        displayName: rule.displayName || canonical?.displayName || rule.giftId,
        soundEnabled: rule.soundEnabled !== false && !!sound,
        sound,
        animationEnabled: rule.animationEnabled !== false && !!(rule.animation || canonical?.animation),
        animation: rule.animation || canonical?.animation || "none",
        active: rule.active !== false
      };
    });
  }
  if (!output.context.length) {
    output.context = supportedGifts.map(g => ({ giftId:g.canonicalId, displayName:g.displayName, action:g.action, value:g.defaultPoints||0, active:true, sound:g.sound||null, soundEnabled:!!g.sound, animation:g.animation||"none", animationEnabled:!!g.animation }));
  }
  return output;
}

export function GiftConfigControls() {
  const [selectedMode, setSelectedMode] = useState("context");
  const [rulesByMode, setRulesByMode] = useState(() => {
    try {
      const clean = sanitizeRules(configManager.get("giftRules"));
      configManager.set("giftRules", clean);
      return clean;
    } catch (e) {
      return sanitizeRules(null);
    }
  });
  const [editingIndex, setEditingIndex] = useState(null);
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState("");
  const currentRules = rulesByMode[selectedMode] || [];

  const persist = next => { const clean = sanitizeRules(next); setRulesByMode(clean); configManager.set("giftRules", clean); };

  const openNew = () => {
    const gift = supportedGifts[0];
    setEditingIndex(null);
    setForm({ giftId:gift.canonicalId, displayName:gift.displayName, value:gift.defaultPoints||0, sound:gift.sound||null, animation:gift.animation||"none", active:true });
  };

  const openEdit = (index, rule) => {
    const gift = resolveCanonicalGiftId(rule.giftId);
    setEditingIndex(index);
    setForm({ giftId:gift?.canonicalId||rule.giftId, displayName:rule.displayName||gift?.displayName||rule.giftId, value:Number(rule.value)||0, sound:REAL_SOUND_SET.has(rule.sound)?rule.sound:(gift?.sound||null), animation:rule.animation||gift?.animation||"none", active:rule.active!==false });
  };

  const selectGift = giftId => {
    const gift = CANONICAL_GIFTS[giftId];
    if (!gift) return;
    setForm(prev => ({ ...prev, giftId, displayName:gift.displayName, value:gift.defaultPoints||0, sound:gift.sound||null, animation:gift.animation||"none" }));
  };

  const saveForm = e => {
    e.preventDefault();
    if (!form) return;
    const rule = { giftId:form.giftId, displayName:form.displayName, action:Number(form.value)>0?"Add points":"Special event", value:Number(form.value)||0, pointsEnabled:Number(form.value)>0, soundEnabled:!!form.sound, sound:form.sound||null, animationEnabled:form.animation!=="none", animation:form.animation||"none", active:form.active!==false };
    const updated = editingIndex===null ? [...currentRules, rule] : currentRules.map((r,i)=>i===editingIndex?rule:r);
    persist({ ...rulesByMode, [selectedMode]:updated });
    setForm(null); setNotice("Configuración guardada sin sonidos ficticios.");
  };

  const remove = index => { persist({ ...rulesByMode, [selectedMode]:currentRules.filter((_,i)=>i!==index) }); };
  const preview = rule => { if (rule.sound) audioManager.playSound(rule.sound,{source:"SAFE_PREVIEW"}); setNotice(`Preview: ${rule.displayName}`); };
  const soundCount = useMemo(() => REAL_SOUNDS.length, []);

  return <div style={{background:"rgba(25,20,38,.95)",border:"1px solid rgba(0,245,255,.3)",borderRadius:"12px",padding:"18px",color:"white",display:"flex",flexDirection:"column",gap:"14px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
      <div><h3 style={{margin:0,color:"#00f5ff",fontSize:"16px"}}>🎁 GIFT CONTROL CENTER</h3><div style={{fontSize:"10px",color:"#a0aec0"}}>Solo sonidos y animaciones que existen en el proyecto. {soundCount} sonidos reales.</div></div>
      <select value={selectedMode} onChange={e=>setSelectedMode(e.target.value)} style={{background:"#120f1d",color:"white",padding:"7px",borderRadius:"6px"}}><option value="context">Context / Standard</option><option value="vs_battle">VS Battle</option><option value="tournament">Tournament</option></select>
    </div>

    {notice&&<div style={{background:"rgba(72,187,120,.15)",border:"1px solid rgba(72,187,120,.35)",padding:"8px",borderRadius:"6px",fontSize:"10px",fontWeight:800}}>{notice}</div>}

    <button onClick={openNew} style={{alignSelf:"flex-end",background:"linear-gradient(135deg,#00f5ff,#0077ff)",color:"white",border:0,padding:"8px 14px",borderRadius:"6px",fontWeight:900,cursor:"pointer"}}>+ AGREGAR GIFT</button>

    {form&&<form onSubmit={saveForm} style={{background:"#120f1d",border:"1px solid #00f5ff",borderRadius:"8px",padding:"12px",display:"grid",gap:"10px"}}>
      <select value={form.giftId} onChange={e=>selectGift(e.target.value)} style={{background:"#0c091a",color:"white",padding:"7px"}}>{supportedGifts.map(g=><option key={g.canonicalId} value={g.canonicalId}>{g.displayName}</option>)}</select>
      <input value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} style={{background:"#0c091a",color:"white",padding:"7px"}} />
      <input type="number" value={form.value} onChange={e=>setForm({...form,value:Number(e.target.value)||0})} style={{background:"#0c091a",color:"white",padding:"7px"}} placeholder="Puntos" />
      <select value={form.sound||""} onChange={e=>setForm({...form,sound:e.target.value||null})} style={{background:"#0c091a",color:"white",padding:"7px"}}><option value="">Sin sonido</option>{REAL_SOUNDS.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select>
      <select value={form.animation||"none"} onChange={e=>setForm({...form,animation:e.target.value})} style={{background:"#0c091a",color:"white",padding:"7px"}}><option value="none">Sin animación</option><option value="silent_challenge">El Mudo</option><option value="creative_challenge">Reto Creativo</option><option value="freeze">Freeze</option><option value="ultimate_galaxy">Galaxy</option><option value="epic_impact">Money Gun</option><option value="susto_coco">Susto a Coco</option><option value="clue_hint">Pista</option><option value="cocazo">Cocazo</option></select>
      <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}><button type="button" onClick={()=>setForm(null)} style={{padding:"7px 12px"}}>Cancelar</button><button type="submit" style={{padding:"7px 12px",fontWeight:900}}>Guardar</button></div>
    </form>}

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:"10px"}}>{currentRules.map((rule,index)=><div key={`${rule.giftId}-${index}`} style={{background:"rgba(12,9,26,.85)",border:"1px solid rgba(0,245,255,.22)",borderRadius:"8px",padding:"10px"}}>
      <div style={{display:"flex",gap:"7px",alignItems:"center"}}><GiftImage giftId={rule.giftId} style={{width:"32px",height:"32px"}}/><strong style={{fontSize:"11px"}}>{rule.displayName}</strong></div>
      <div style={{fontSize:"9px",color:"#a0aec0",marginTop:"6px"}}>Puntos: <b>{rule.value||0}</b></div>
      <div style={{fontSize:"9px",color:"#ffd166",marginTop:"3px",wordBreak:"break-word"}}>Sonido: {rule.sound||"Sin sonido"}</div>
      <div style={{fontSize:"9px",color:"#ff9f9f",marginTop:"3px"}}>Animación: {rule.animation||"none"}</div>
      <div style={{display:"flex",gap:"5px",marginTop:"8px"}}><button onClick={()=>preview(rule)} style={{flex:1}}>▶ Preview</button><button onClick={()=>openEdit(index,rule)}>Editar</button><button onClick={()=>remove(index)}>Eliminar</button></div>
    </div>)}</div>
  </div>;
}
