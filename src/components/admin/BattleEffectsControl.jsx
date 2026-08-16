import { useEffect, useState } from "react";
import { simulationEngine } from "../../core/simulationEngine";
import { configManager } from "../../core/configManager";

const FREEZE_GIFTS = [
  "Twinkling Star",
  "Doughnut",
  "Hat and Mustache",
  "Galaxy",
  "Money Gun",
  "Coconut",
  "Amped Up",
  "Ice Cream Cone"
];

const FREEZE_SOUNDS = [
  { label: "Sin sonido", value: "" },
  { label: "5-4-3-2-1-are-you-ready.mp3", value: "/Sounds/5-4-3-2-1-are-you-ready.mp3" },
  { label: "Sombrero Vaquero.mp3", value: "/Sounds/Sombrero Vaquero.mp3" },
  { label: "Kamehameha.mp3", value: "/Sounds/Kamehameha.mp3" },
  { label: "Reinicio.mp3", value: "/Sounds/Reinicio.mp3" },
  { label: "Castigados.mp3", value: "/Sounds/Castigados.mp3" },
  { label: "coconut-sfx.mp3", value: "/Sounds/coconut-sfx.mp3" },
  { label: "mudo.mp3", value: "/Sounds/mudo.mp3" }
];

export function BattleEffectsControl() {
  const [username, setUsername] = useState("Pablo");
  const [freezeConfig, setFreezeConfig] = useState(() => configManager.get("battleEffects.freeze") || {
    enabled: true,
    scope: "TEAM",
    duration: 300,
    rescueCount: 2,
    activationGift: "Twinkling Star",
    counterGift: "Twinkling Star",
    sound: null
  });

  useEffect(() => {
    const current = configManager.get("battleEffects.freeze");
    if (current) setFreezeConfig(current);
  }, []);

  const updateFreeze = (field, value) => {
    const updated = { ...freezeConfig, [field]: value };
    setFreezeConfig(updated);
    configManager.set("battleEffects.freeze", updated);
  };

  return (
    <div style={{background:"#261c3a", padding:"14px", borderRadius:"10px", border:"1px solid rgba(255,255,255,0.08)", marginTop:"16px"}}>
      <h3 style={{fontSize:"15px", margin:"0 0 10px 0", color:"#00f5ff"}}>❄️ FREEZE EFFECT CONFIGURATION</h3>

      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:"10px", marginBottom:"12px"}}>
        <label style={{display:"flex", flexDirection:"column", gap:"5px", color:"#cbd5e1", fontSize:"11px", fontWeight:700}}>
          TikTok Gift que activa Freeze
          <select value={freezeConfig.activationGift || "Twinkling Star"} onChange={e=>updateFreeze("activationGift", e.target.value)} style={{background:"#120d24", border:"1px solid rgba(255,255,255,0.2)", padding:"7px 8px", borderRadius:"6px", color:"white"}}>
            {FREEZE_GIFTS.map(gift => <option key={gift} value={gift}>{gift}</option>)}
          </select>
        </label>

        <label style={{display:"flex", flexDirection:"column", gap:"5px", color:"#cbd5e1", fontSize:"11px", fontWeight:700}}>
          Sonido de Freeze
          <select value={freezeConfig.sound || ""} onChange={e=>updateFreeze("sound", e.target.value || null)} style={{background:"#120d24", border:"1px solid rgba(255,255,255,0.2)", padding:"7px 8px", borderRadius:"6px", color:"white"}}>
            {FREEZE_SOUNDS.map(sound => <option key={sound.value} value={sound.value}>{sound.label}</option>)}
          </select>
        </label>

        <label style={{display:"flex", flexDirection:"column", gap:"5px", color:"#cbd5e1", fontSize:"11px", fontWeight:700}}>
          Duración (segundos)
          <input type="number" min="5" value={freezeConfig.duration ?? 300} onChange={e=>updateFreeze("duration", Math.max(5, Number(e.target.value) || 300))} style={{background:"#120d24", border:"1px solid rgba(255,255,255,0.2)", padding:"7px 8px", borderRadius:"6px", color:"white"}} />
        </label>

        <label style={{display:"flex", flexDirection:"column", gap:"5px", color:"#cbd5e1", fontSize:"11px", fontWeight:700}}>
          Rescate / contraataque
          <input type="number" min="1" value={freezeConfig.rescueCount ?? 2} onChange={e=>updateFreeze("rescueCount", Math.max(1, Number(e.target.value) || 2))} style={{background:"#120d24", border:"1px solid rgba(255,255,255,0.2)", padding:"7px 8px", borderRadius:"6px", color:"white"}} />
        </label>
      </div>

      <div style={{display:"flex", gap:"8px", marginBottom:"10px", alignItems:"center"}}>
        <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Jugador activador (ej. Pablo)" style={{flex:1, background:"#120d24", border:"1px solid rgba(255,255,255,0.2)", padding:"6px 10px", borderRadius:"6px", color:"white", fontSize:"13px"}} />
        <span style={{fontSize:"11px", color:"#94a3b8"}}>
          Gift real: <strong style={{color:"#fff"}}>{freezeConfig.activationGift || "Twinkling Star"}</strong>
        </span>
      </div>

      <div style={{display:"flex", gap:"8px", flexWrap:"wrap"}}>
        <button onClick={()=>simulationEngine.simulateGift(username, freezeConfig.activationGift || "Twinkling Star", 1)} style={{background:"#00bfff", color:"#000", border:"none", padding:"6px 12px", borderRadius:"6px", fontWeight:800, cursor:"pointer", fontSize:"12px"}}>
          🎁 Simular {freezeConfig.activationGift || "Twinkling Star"} (Freeze / Contraataque)
        </button>
      </div>

      <div style={{marginTop:"10px", fontSize:"10px", color:"#94a3b8"}}>
        La configuración se guarda en <code>battleEffects.freeze</code>. El sonido configurado aquí es el único sonido autorizado para la activación de Freeze.
      </div>
    </div>
  );
}
