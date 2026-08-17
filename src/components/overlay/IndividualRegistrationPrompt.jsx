import { useEffect, useMemo, useState } from "react";
import { dashboardAPI } from "../../core/dashboardAPI";
import { commandConfigManager } from "../../core/commandConfigManager";
import { eventBus } from "../../core/eventBus";

const normalizeMode = (mode) => String(mode || "").toUpperCase();

export function IndividualRegistrationPrompt() {
  const [dashboard, setDashboard] = useState(() => dashboardAPI.getLiveDashboard?.() || {});
  const [config, setConfig] = useState(() => commandConfigManager.getConfig());
  const [winnerFlash, setWinnerFlash] = useState(false);

  useEffect(() => {
    const update = (next) => {
      if (next) setDashboard(next);
      setConfig(commandConfigManager.getConfig());
    };
    const unsubDashboard = dashboardAPI.subscribe(update);
    const unsubConfig = eventBus.subscribe("config:command_updated", ({ config: next }) => next && setConfig(next));
    const flash = () => { setWinnerFlash(true); window.setTimeout(() => setWinnerFlash(false), 4500); };
    const unsubWinner = eventBus.subscribe("PLAYER_WIN", flash);
    const unsubPlayerWin = eventBus.subscribe("player:win", flash);
    const unsubRoundFinished = eventBus.subscribe("game:round_finished", flash);
    const interval = setInterval(() => update(dashboardAPI.getLiveDashboard?.() || {}), 1500);
    return () => { unsubDashboard?.(); unsubConfig?.(); unsubWinner?.(); unsubPlayerWin?.(); unsubRoundFinished?.(); clearInterval(interval); };
  }, []);

  const mode = normalizeMode(dashboard?.gameMode || config?.gameRegistrationMode);
  const isIndividual = mode === "INDIVIDUAL";
  const round = dashboard?.game?.round || dashboard?.round || {};
  const timer = dashboard?.game?.timer || dashboard?.timer || {};
  const roundActive = Boolean(round?.active || round?.isActive || dashboard?.game?.roundActive || timer?.running);
  const registrationOpen = String(dashboard?.registration?.status || "").toUpperCase() === "OPEN";
  const hasPlayers = Array.isArray(dashboard?.registration?.players) && dashboard.registration.players.length > 0;
  const method = String(config?.individualRegistrationMethod || "command").toLowerCase() === "gift" ? "gift" : "command";
  const command = String(config?.individualCommand || "entrar").trim();
  const giftName = String(config?.individualRegistrationGift || "").trim();
  const giftAsset = String(config?.individualRegistrationGiftAsset || "").trim();
  const giftImage = String(config?.individualRegistrationGiftImage || (giftAsset ? `/gifts/${encodeURIComponent(giftAsset)}` : "")).trim();

  const shouldShow = useMemo(() => isIndividual && !roundActive && (winnerFlash || registrationOpen || !hasPlayers), [isIndividual, roundActive, winnerFlash, registrationOpen, hasPlayers]);
  if (!shouldShow) return null;

  return (
    <div style={{ position: "absolute", top: "2px", left: "50%", transform: "translateX(-50%)", zIndex: 25, width: "172px", minHeight: "45px", boxSizing: "border-box", padding: "5px 8px", borderRadius: "9px", background: "linear-gradient(135deg,rgba(255,255,255,.98),rgba(255,241,194,.97))", border: "2px solid rgba(20,30,45,.85)", boxShadow: "0 3px 12px rgba(0,0,0,.45),0 0 12px rgba(255,215,0,.38)", textAlign: "center", pointerEvents: "none", animation: "individualRegistrationIn .45s ease-out" }}>
      <style>{`@keyframes individualRegistrationIn{0%{opacity:0;transform:translateX(-50%) translateY(-5px) scale(.96)}100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}@keyframes individualCommandPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}`}</style>
      <div style={{ fontSize: "8px", lineHeight: 1, fontWeight: 1000, letterSpacing: ".7px", color: "#111827", textTransform: "uppercase" }}>✦ INSCRÍBETE ✦</div>
      {method === "command" ? (
        <>
          <div style={{ marginTop: "3px", fontSize: "7px", lineHeight: 1.1, fontWeight: 900, color: "#111827" }}>ESCRIBIENDO EN EL CHAT LA PALABRA</div>
          <div style={{ marginTop: "3px", display: "inline-block", padding: "3px 10px", borderRadius: "5px", background: "#111111", color: "#ffffff", border: "1px solid #000000", fontSize: "12px", lineHeight: 1, fontWeight: 1000, letterSpacing: "1px", textTransform: "uppercase", animation: "individualCommandPulse 1.7s ease-in-out infinite" }}>{command || "ENTRAR"}</div>
        </>
      ) : (
        <>
          <div style={{ marginTop: "3px", fontSize: "7px", lineHeight: 1.1, fontWeight: 900, color: "#111827" }}>ENVIANDO UNO DE ESTOS REGALOS</div>
          <div style={{ marginTop: "3px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            {giftImage ? <img src={giftImage} alt={giftName || "Regalo"} style={{ width: "28px", height: "28px", objectFit: "contain" }} /> : <span style={{ fontSize: "20px" }}>🎁</span>}
            <strong style={{ maxWidth: "110px", fontSize: "8px", lineHeight: 1.05, fontWeight: 1000, color: "#a21caf", textTransform: "uppercase" }}>{giftName || "REGALO"}</strong>
          </div>
        </>
      )}
    </div>
  );
}
