import { useEffect, useMemo, useState } from "react";
import { dashboardAPI } from "../../core/dashboardAPI";
import { commandConfigManager } from "../../core/commandConfigManager";
import { registrationManager } from "../../core/registrationManager";
import { eventBus } from "../../core/eventBus";

const readConfig = () => {
  const config = commandConfigManager.getConfig?.() || {};
  return {
    method: String(config.individualRegistrationMethod || "command").toLowerCase() === "gift" ? "gift" : "command",
    command: String(config.individualCommand || "entrar").trim(),
    giftName: String(config.individualRegistrationGift || "").trim(),
    giftAsset: String(config.individualRegistrationGiftAsset || config.individualRegistrationGiftImage || "").trim()
  };
};

const assetCandidates = ({ giftName, giftAsset }) => {
  const values = [];
  const add = value => {
    const raw = String(value || "").trim();
    if (!raw) return;
    if (/^(https?:|data:|blob:)/i.test(raw)) values.push(raw);
    else {
      const clean = raw.replace(/^\.?\//, "").replace(/^public[\\/]/i, "").replace(/^gifts[\\/]/i, "").replace(/^Gifts[\\/]/i, "");
      if (/\.(webp|png|gif|jpe?g)$/i.test(clean)) values.push(encodeURI(`/Gifts/${clean}`));
      else [".webp", ".png", ".gif", ".jpg", ".jpeg"].forEach(ext => values.push(encodeURI(`/Gifts/${clean}${ext}`)));
    }
  };
  add(giftAsset);
  add(giftName);
  return [...new Set(values)];
};

export function IndividualRegistrationPromptV2() {
  const [tick, setTick] = useState(0);
  const [blink, setBlink] = useState(true);
  const [winnerUntil, setWinnerUntil] = useState(0);
  const config = useMemo(() => readConfig(), [tick]);
  const [assetIndex, setAssetIndex] = useState(0);
  const candidates = useMemo(() => assetCandidates(config), [config]);

  useEffect(() => {
    const refresh = () => setTick(v => v + 1);
    const subscriptions = [
      eventBus.subscribe("registration:opened", refresh),
      eventBus.subscribe("registration:closed", refresh),
      eventBus.subscribe("registration:updated", refresh),
      eventBus.subscribe("registration:state_synced", refresh),
      eventBus.subscribe("config:command_updated", refresh),
      eventBus.subscribe("GAME_MODE_CHANGED", refresh),
      eventBus.subscribe("round:started", refresh),
      eventBus.subscribe("round:finished", refresh)
    ];
    const timer = window.setInterval(refresh, 500);
    return () => { subscriptions.forEach(u => u?.()); window.clearInterval(timer); };
  }, []);

  useEffect(() => setAssetIndex(0), [candidates.join("|")]);
  useEffect(() => {
    const timer = window.setInterval(() => setBlink(v => !v), 900);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onRoundStarted = () => setTick(v => v + 1);
    const onRoundFinished = () => {
      setWinnerUntil(Date.now() + 18000);
      setTick(v => v + 1);
      window.setTimeout(() => {
        try {
          const mode = String(dashboardAPI.getGameMode?.() || "").toUpperCase();
          if (mode === "INDIVIDUAL") registrationManager.openRegistration();
        } catch {}
        setTick(v => v + 1);
      }, 18100);
    };
    const subscriptions = [
      eventBus.subscribe("round:started", onRoundStarted),
      eventBus.subscribe("round:finished", onRoundFinished),
      eventBus.subscribe("round:winner_popup", payload => {
        const duration = Math.max(15000, Math.min(20000, Number(payload?.durationMs) || 18000));
        setWinnerUntil(Date.now() + duration);
        window.setTimeout(() => setTick(v => v + 1), duration + 100);
      })
    ];
    return () => subscriptions.forEach(u => u?.());
  }, []);

  const dashboard = dashboardAPI.getLiveDashboard?.() || dashboardAPI.getState?.() || {};
  const gameMode = String(dashboard?.gameMode || dashboardAPI.getGameMode?.() || "").toUpperCase();
  const isIndividual = gameMode === "INDIVIDUAL" || gameMode === "INDIVIDUAL_MODE" || gameMode === "SOLO";
  const game = dashboard?.game || {};
  const managerState = registrationManager.getRegistrationState?.() || {};
  const registrationStatus = String(dashboard?.registration?.status || managerState.status || "").toUpperCase();
  const roundActive = !!(game?.round?.active || game?.roundActive || game?.timer?.running || dashboard?.timer?.running);
  const registeredCount = Number(managerState.count ?? dashboard?.registration?.players?.length ?? 0);
  const winnerSuppressed = Date.now() < winnerUntil;
  const methodConfigured = config.method === "command" ? !!config.command : !!config.giftName;
  const visible = isIndividual && registrationStatus === "OPEN" && !roundActive && !winnerSuppressed && registeredCount === 0 && methodConfigured;

  useEffect(() => {
    const styleId = "cocoloco-registration-v2-style";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      [data-cocoloco-registration-prompt="true"] { display:none !important; }
      [data-cocoloco-registration-prompt-v2="true"] { display:flex !important; }
    `;
    document.head.appendChild(style);
    return () => document.getElementById(styleId)?.remove();
  }, []);

  if (!visible) return null;

  const commandMode = config.method === "command";
  const image = !commandMode && candidates[assetIndex];

  return <div data-cocoloco-registration-prompt-v2="true" aria-live="polite" style={{ position:"absolute", left:"calc(50% - 67px)", top:"50%", transform:"translate(-50%,-50%)", zIndex:6000, width:commandMode?"220px":"250px", minHeight:commandMode?"74px":"112px", padding:commandMode?"10px 18px":"12px 20px", boxSizing:"border-box", borderRadius:"18px", background:blink?"rgba(46,125,50,.18)":"rgba(46,125,50,.10)", border:blink?"1px solid rgba(185,255,194,.70)":"1px solid rgba(185,255,194,.38)", boxShadow:blink?"0 0 26px rgba(120,255,145,.18),inset 0 0 22px rgba(120,255,145,.06)":"0 0 12px rgba(120,255,145,.08),inset 0 0 18px rgba(120,255,145,.025)", backdropFilter:"blur(2px)", WebkitBackdropFilter:"blur(2px)", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", pointerEvents:"none", opacity:blink?1:.82, transition:"opacity .45s ease" }}>
    <div style={{fontSize:"10px",lineHeight:1.15,fontWeight:950,color:"#fff",textTransform:"uppercase",letterSpacing:".7px",textShadow:"0 2px 5px rgba(0,0,0,.95)"}}>{commandMode?"INSCRÍBETE ESCRIBIENDO EN EL CHAT":"INSCRÍBETE ENVIANDO"}</div>
    {commandMode ? <div style={{marginTop:"7px",display:"inline-block",padding:"4px 13px",borderRadius:"8px",background:"rgba(255,255,255,.92)",border:"2px solid #111827",color:"#e11d48",fontSize:"16px",lineHeight:1,fontWeight:1000,textTransform:"uppercase",letterSpacing:"1.2px",boxShadow:"0 2px 10px rgba(0,0,0,.45)"}}>{config.command}</div> : <div style={{marginTop:"6px",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}>{image && <img src={image} alt={config.giftName} onError={() => setAssetIndex(v => v + 1)} style={{width:"54px",height:"54px",objectFit:"contain",filter:"drop-shadow(0 0 8px rgba(255,255,255,.65))"}}/>}<div style={{maxWidth:"145px",fontSize:"12px",lineHeight:1.05,fontWeight:1000,color:"#fff",textTransform:"uppercase",textShadow:"0 2px 5px rgba(0,0,0,.95)"}}>{config.giftName}</div></div>}
  </div>;
}
