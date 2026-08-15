import { useEffect, useState } from "react";
import { dashboardAPI } from "../../core/dashboardAPI";
import { eventBus } from "../../core/eventBus";
import { TOP_ROTATION_MESSAGES } from "../../config/overlayInfoConfig";

export function OverlayHeader() {
  const [headerState, setHeaderState] = useState({
    title: "🥥 COCOLOCO LIVE",
    subtitle: "Preparando próxima batalla...",
    type: "waiting"
  });

  const [badgeIndex, setBadgeIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const badgeInterval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setBadgeIndex((prev) => (prev + 1) % TOP_ROTATION_MESSAGES.length);
        setFade(true);
      }, 200);
    }, 4500);
    return () => clearInterval(badgeInterval);
  }, []);

  useEffect(() => {
    let timeoutId = null;

    const evaluateState = (dashboard, overrideType = null, overrideText = null) => {
      if (overrideType) {
        if (overrideType === "correct") {
          setHeaderState({
            title: "🔥 RESPUESTA CORRECTA",
            subtitle: overrideText || "Jugador suma puntos",
            type: "correct"
          });
        } else if (overrideType === "ended") {
          setHeaderState({
            title: "🏆 RONDA FINALIZADA",
            subtitle: "Preparando siguiente batalla",
            type: "ended"
          });
        }
        return;
      }

      const game = dashboard.game || {};
      const regStatus = dashboard.registration?.status;

      // 1. Registro abierto
      if (regStatus === "OPEN") {
        setHeaderState({
          title: "📝 REGISTRO ABIERTO",
          subtitle: "Esperando jugadores...",
          type: "waiting"
        });
        return;
      }

      // 3. Ronda activa / Batalla activa
      const isRunning = game.battle && (game.timer?.seconds > 0 || game.round);
      if (isRunning) {
        setHeaderState({
          title: "⚔️ BATALLA ACTIVA",
          subtitle: "Escribe tu respuesta en el chat",
          type: "active"
        });
        return;
      }

      // 4. Estado espera por defecto
      setHeaderState({
        title: "🥥 COCOLOCO LIVE",
        subtitle: "Preparando próxima batalla...",
        type: "waiting"
      });
    };

    const unsubscribe = dashboardAPI.subscribe((dashboard) => {
      if (!timeoutId) {
        evaluateState(dashboard);
      }
    });

    const unsubReward = eventBus.subscribe("reward:processed", (e) => {
      if ((e.points || 0) > 0 || (e.wins || 0) > 0) {
        if (timeoutId) clearTimeout(timeoutId);
        evaluateState(dashboardAPI.getLiveDashboard(), "correct", `¡${e.username || "Jugador"} acertó!`);
        timeoutId = setTimeout(() => {
          timeoutId = null;
          evaluateState(dashboardAPI.getLiveDashboard());
        }, 3500);
      }
    });

    const unsubBattleEnd = eventBus.subscribe("BATTLE_END", () => {
      if (timeoutId) clearTimeout(timeoutId);
      evaluateState(dashboardAPI.getLiveDashboard(), "ended");
      timeoutId = setTimeout(() => {
        timeoutId = null;
        evaluateState(dashboardAPI.getLiveDashboard());
      }, 4000);
    });

    const unsubExternalEnd = eventBus.subscribe("EXTERNAL_BATTLE_END", () => {
      if (timeoutId) clearTimeout(timeoutId);
      evaluateState(dashboardAPI.getLiveDashboard(), "ended");
      timeoutId = setTimeout(() => {
        timeoutId = null;
        evaluateState(dashboardAPI.getLiveDashboard());
      }, 4000);
    });

    return () => {
      unsubscribe && unsubscribe();
      unsubReward && unsubReward();
      unsubBattleEnd && unsubBattleEnd();
      unsubExternalEnd && unsubExternalEnd();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const currentBadgeText = TOP_ROTATION_MESSAGES[badgeIndex] || TOP_ROTATION_MESSAGES[0];

  return (
    <div className={`hud-top broadcast-header-${headerState.type}`}>
      <div className="logo-container">
        <div className="main-title">{headerState.title}</div>
        <div className="sub-title">{headerState.subtitle}</div>
      </div>
      <div className="battle-status" style={{
        background: "linear-gradient(135deg, rgba(0,191,255,0.95), rgba(121,40,202,0.95))",
        color: "#ffffff",
        boxShadow: "0 2px 12px rgba(0,191,255,0.6)",
        fontSize: "9.5px",
        fontWeight: 900,
        padding: "4px 10px",
        whiteSpace: "nowrap",
        letterSpacing: "0.6px",
        opacity: fade ? 1 : 0,
        transition: "opacity 0.2s ease-in-out"
      }}>
        {currentBadgeText}
      </div>
    </div>
  );
}
