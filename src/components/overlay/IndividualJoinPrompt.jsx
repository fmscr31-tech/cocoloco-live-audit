import { useEffect, useMemo, useRef, useState } from "react";
import { dashboardAPI } from "../../core/dashboardAPI";
import { commandConfigManager } from "../../core/commandConfigManager";
import { eventBus } from "../../core/eventBus";

const readEnrollment = (dashboard) => {
  const registration = dashboard?.registration || {};
  const config = dashboard?.registrationConfig || dashboard?.commandConfig || dashboard?.game?.registration || commandConfigManager.getConfig?.() || {};
  const command = String(registration.command || registration.joinCommand || registration.entryCommand || config.individualCommand || config.command || config.joinCommand || config.entryCommand || "").trim();
  const giftName = String(registration.giftName || registration.entryGift || registration.registrationGift || config.individualRegistrationGift || config.individualGiftName || config.giftName || config.entryGift || "").trim();
  const imageUrl = String(registration.giftImageUrl || registration.imageUrl || config.individualRegistrationGiftImage || config.giftImageUrl || config.imageUrl || "").trim();
  const giftAsset = String(config.individualRegistrationGiftAsset || registration.giftAsset || registration.asset || "").trim();
  const method = String(config.individualRegistrationMethod || registration.method || (giftName ? "gift" : "command")).toLowerCase() === "gift" ? "gift" : "command";
  return { command, giftName, imageUrl, giftAsset, method };
};

const toAssetUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  let clean = raw.replace(/^\.?\//, "").replace(/^public[\\/]/i, "");
  clean = clean.replace(/^gifts[\\/]/i, "");
  return encodeURI(`/Gifts/${clean}`);
};

const buildGiftCandidates = ({ imageUrl, giftAsset, giftName }) => {
  const candidates = [];
  const add = (value) => { const url = toAssetUrl(value); if (url) candidates.push(url); };
  add(imageUrl);
  add(giftAsset);
  if (giftName) {
    const base = giftName.trim().replace(/\.(webp|png|jpg|jpeg|gif)$/i, "");
    [".webp", ".png", ".gif", ".jpg", ".jpeg"].forEach((ext) => add(`${base}${ext}`));
  }
  return [...new Set(candidates)];
};

function RegistrationAssetImage({ enrollment }) {
  const candidates = useMemo(() => buildGiftCandidates(enrollment), [enrollment]);
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [candidates.join("|")]);
  if (!candidates.length || index >= candidates.length) return null;
  return (
    <img src={candidates[index]} alt={enrollment.giftName || "Método de inscripción"} onError={() => setIndex((value) => value + 1)} style={{ width: "54px", height: "54px", objectFit: "contain", display: "block", flex: "0 0 54px", filter: "drop-shadow(0 0 8px rgba(255,255,255,.65))" }} />
  );
}

export function IndividualJoinPrompt() {
  const promptRef = useRef(null);
  const [dashboard, setDashboard] = useState(() => dashboardAPI.getLiveDashboard?.() || dashboardAPI.getState?.() || {});
  const [enrollment, setEnrollment] = useState(() => readEnrollment(dashboard));
  const [blink, setBlink] = useState(true);
  const [winnerSuppressedUntil, setWinnerSuppressedUntil] = useState(0);
  const [isDuplicate, setIsDuplicate] = useState(false);

  useEffect(() => {
    const markDuplicate = () => {
      const nodes = Array.from(document.querySelectorAll('[data-cocoloco-registration-prompt="true"]'));
      const ownNode = promptRef.current;
      nodes.forEach((node, index) => { node.style.display = index === 0 ? "" : "none"; });
      setIsDuplicate(!!ownNode && ownNode !== nodes[0]);
    };
    const frame = window.requestAnimationFrame(markDuplicate);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const apply = (nextDashboard) => {
      const next = nextDashboard || dashboardAPI.getLiveDashboard?.() || dashboardAPI.getState?.() || {};
      setDashboard(next);
      setEnrollment(readEnrollment(next));
    };
    const unsubscribe = dashboardAPI.subscribe?.(apply);
    const refresh = () => apply();
    const interval = setInterval(refresh, 700);
    window.addEventListener("storage", refresh);
    return () => { unsubscribe?.(); clearInterval(interval); window.removeEventListener("storage", refresh); };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setBlink((value) => !value), 900);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hideForWinner = (payload = {}) => {
      const duration = Math.max(15000, Math.min(20000, Number(payload.durationMs) || 18000));
      const until = Date.now() + duration;
      setWinnerSuppressedUntil(until);
      window.setTimeout(() => setWinnerSuppressedUntil((current) => current === until ? 0 : current), duration + 100);
    };
    const subscriptions = [
      eventBus.subscribe("round:winner_popup", hideForWinner),
      eventBus.subscribe("PLAYER_WIN", hideForWinner),
      eventBus.subscribe("player:win", hideForWinner),
      eventBus.subscribe("game:round_finished", hideForWinner),
      eventBus.subscribe("BATTLE_END", hideForWinner),
      eventBus.subscribe("EXTERNAL_BATTLE_END", hideForWinner)
    ];
    return () => subscriptions.forEach((unsubscribe) => unsubscribe?.());
  }, []);

  const game = dashboard?.game || {};
  const registration = dashboard?.registration || {};
  const mode = String(dashboard?.gameMode || dashboard?.gameRegistrationMode || "").toUpperCase();
  const isIndividual = mode === "INDIVIDUAL" || mode === "INDIVIDUAL_MODE" || mode === "SOLO" || !mode;
  const roundActive = !!(game?.round?.active || game?.roundActive || game?.timer?.running);
  const registrationOpen = String(registration?.status || "").toUpperCase() === "OPEN";
  const winnerSuppressed = Date.now() < winnerSuppressedUntil;
  const visible = isIndividual && registrationOpen && !roundActive && !winnerSuppressed && !!(enrollment.command || enrollment.giftName);

  if (isDuplicate || !visible) return null;

  const isCommand = enrollment.method === "command";
  return (
    <div ref={promptRef} data-cocoloco-registration-prompt="true" aria-live="polite" style={{
      position: "absolute", left: "calc(50% - 167px)", top: "50%", transform: "translate(-50%, -50%)", zIndex: 5000,
      width: isCommand ? "220px" : "250px", minHeight: isCommand ? "74px" : "112px", padding: isCommand ? "10px 18px" : "12px 20px",
      boxSizing: "border-box", borderRadius: "18px", background: blink ? "rgba(46, 125, 50, .18)" : "rgba(46, 125, 50, .10)",
      border: blink ? "1px solid rgba(185, 255, 194, .70)" : "1px solid rgba(185, 255, 194, .38)",
      boxShadow: blink ? "0 0 26px rgba(120, 255, 145, .18), inset 0 0 22px rgba(120, 255, 145, .06)" : "0 0 12px rgba(120, 255, 145, .08), inset 0 0 18px rgba(120, 255, 145, .025)",
      backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", textAlign: "center", opacity: blink ? 1 : .82,
      transition: "opacity .45s ease, border-color .45s ease, box-shadow .45s ease", pointerEvents: "none"
    }}>
      <div style={{ fontSize: "10px", lineHeight: 1.15, fontWeight: 950, color: "#fff", textTransform: "uppercase", letterSpacing: ".7px", textShadow: "0 2px 5px rgba(0,0,0,.95)" }}>{isCommand ? "INSCRÍBETE ESCRIBIENDO EN EL CHAT" : "INSCRÍBETE ENVIANDO"}</div>
      {isCommand ? (
        <div style={{ marginTop: "7px", display: "inline-block", maxWidth: "100%", padding: "4px 13px", borderRadius: "8px", background: "rgba(255,255,255,.90)", border: "2px solid #111827", color: "#e11d48", fontSize: "16px", lineHeight: 1, fontWeight: 1000, textTransform: "uppercase", letterSpacing: "1.2px", boxShadow: "0 2px 10px rgba(0,0,0,.45)" }}>{enrollment.command}</div>
      ) : (
        <div style={{ marginTop: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          <RegistrationAssetImage enrollment={enrollment} />
          <div style={{ maxWidth: "145px", fontSize: "12px", lineHeight: 1.05, fontWeight: 1000, color: "#fff", textTransform: "uppercase", textShadow: "0 2px 5px rgba(0,0,0,.95)" }}>{enrollment.giftName || "ENVÍA"}</div>
        </div>
      )}
    </div>
  );
}
