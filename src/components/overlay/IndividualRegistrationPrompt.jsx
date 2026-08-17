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
    const unsubWinner = eventBus.subscribe("PLAYER_WIN", () => setWinnerFlash(true));
    const unsubPlayerWin = eventBus.subscribe("player:win", () => setWinnerFlash(true));
    const unsubEvent = eventBus.subscribe("game:round_finished", () => setWinnerFlash(true));
    const clearFlash = () => setWinnerFlash(false);
    window.addEventListener("storage", update);
    const interval = setInterval(() => update(dashboardAPI.getLiveDashboard?.() || {}), 1500);
    return () => {
      unsubDashboard?.();
      unsubConfig?.();
      unsubWinner?.();
      unsubPlayerWin?.();
      unsubEvent?.();
      window.removeEventListener("storage", update);
      clearInterval(interval);
      clearFlash();
    };
  }, []);

  const mode = normalizeMode(dashboard?.gameMode || config?.gameRegistrationMode);
  const isIndividual = mode === "INDIVIDUAL";
  const round = dashboard?.game?.round || dashboard?.round || {};
  const timer = dashboard?.game?.timer || dashboard?.timer || {};
  const roundActive = Boolean(round?.active || round?.isActive || dashboard?.game?.roundActive || timer?.running);
  const registrationStatus = String(dashboard?.registration?.status || "").toUpperCase();
  const registrationOpen = registrationStatus === "OPEN";
  const hasPlayers = Array.isArray(dashboard?.registration?.players) && dashboard.registration.players.length > 0;
  const method = String(config?.individualRegistrationMethod || "command").toLowerCase() === "gift" ? "gift" : "command";
  const command = String(config?.individualCommand || "entrar").trim();
  const giftName = String(config?.individualRegistrationGift || "").trim();
  const giftAsset = String(config?.individualRegistrationGiftAsset || "").trim();
  const giftImage = String(config?.individualRegistrationGiftImage || (giftAsset ? `/gifts/${encodeURIComponent(giftAsset)}` : "")).trim();

  const shouldShow = useMemo(() => {
    if (!isIndividual || roundActive) return false;
    if (winnerFlash) return true;
    return registrationOpen || !hasPlayers;
  }, [isIndividual, roundActive, winnerFlash, registrationOpen, hasPlayers]);

  if (!shouldShow) return null;

  return (
    <div className="individual-registration-prompt" role="status" aria-live="polite">
      <div className="individual-registration-prompt__spark">✦</div>
      <div className="individual-registration-prompt__eyebrow">INSCRÍBETE</div>
      {method === "command" ? (
        <>
          <div className="individual-registration-prompt__text">Escribiendo en el chat la palabra</div>
          <div className="individual-registration-prompt__command">{command || "ENTRAR"}</div>
        </>
      ) : (
        <>
          <div className="individual-registration-prompt__text">Enviando uno de estos regalos</div>
          <div className="individual-registration-prompt__gift">
            {giftImage ? <img src={giftImage} alt={giftName || "Regalo de inscripción"} /> : <span>🎁</span>}
            <strong>{giftName || "REGALO"}</strong>
          </div>
        </>
      )}
    </div>
  );
}
