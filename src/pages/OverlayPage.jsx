import { useEffect, useState } from "react";
import Overlay from "../components/overlay";
import { GenderVsOverlay } from "../components/overlay/GenderVsOverlay";
import { IndividualRegistrationPromptV2 } from "../components/overlay/IndividualRegistrationPromptV2";
import { dashboardAPI } from "../core/dashboardAPI";

function normalizeMode(mode) {
  const value = String(mode || "").toUpperCase();
  if (["GENDER_TEAMS", "GENDER-TEAMS", "CHICOS_VS_CHICAS", "CHICOS VS CHICAS"].includes(value)) return "GENDER_TEAMS";
  return value;
}

function OverlayPage() {
  const [mode, setMode] = useState(() => normalizeMode(dashboardAPI.getGameMode()));
  const [dashboard, setDashboard] = useState(() => dashboardAPI.getDashboard?.() || {});

  useEffect(() => {
    const previous = {
      margin: document.body.style.margin,
      padding: document.body.style.padding,
      width: document.body.style.width,
      minHeight: document.body.style.minHeight,
      height: document.body.style.height,
      overflow: document.body.style.overflow,
      background: document.body.style.background
    };

    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.documentElement.style.width = "fit-content";
    document.documentElement.style.height = "fit-content";
    document.documentElement.style.overflow = "hidden";

    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.width = "fit-content";
    document.body.style.minHeight = "0";
    document.body.style.height = "fit-content";
    document.body.style.overflow = "hidden";
    document.body.style.background = "transparent";

    const fitPopupToOverlay = () => {
      if (window.opener && !window.closed) {
        const contentWidth = document.documentElement.scrollWidth;
        const contentHeight = document.documentElement.scrollHeight;
        const browserChromeWidth = Math.max(0, window.outerWidth - window.innerWidth);
        const browserChromeHeight = Math.max(0, window.outerHeight - window.innerHeight);
        window.resizeTo(contentWidth + browserChromeWidth, contentHeight + browserChromeHeight);
      }
    };

    const resizeTimer = window.setTimeout(fitPopupToOverlay, 120);
    window.addEventListener("load", fitPopupToOverlay);

    const unsubscribeMode = dashboardAPI.subscribeToModeChange?.(({ mode: nextMode }) => {
      setMode(normalizeMode(nextMode));
      window.setTimeout(fitPopupToOverlay, 50);
    });
    const unsubscribeDashboard = dashboardAPI.subscribe?.((nextDashboard) => {
      setDashboard(nextDashboard || {});
      const nextMode = nextDashboard?.gameMode || dashboardAPI.getGameMode?.();
      if (nextMode) setMode(normalizeMode(nextMode));
    });

    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("load", fitPopupToOverlay);
      unsubscribeMode && unsubscribeMode();
      unsubscribeDashboard && unsubscribeDashboard();
      document.documentElement.style.margin = "";
      document.documentElement.style.padding = "";
      document.documentElement.style.width = "";
      document.documentElement.style.height = "";
      document.documentElement.style.overflow = "";
      document.body.style.margin = previous.margin;
      document.body.style.padding = previous.padding;
      document.body.style.width = previous.width;
      document.body.style.minHeight = previous.minHeight;
      document.body.style.height = previous.height;
      document.body.style.overflow = previous.overflow;
      document.body.style.background = previous.background;
    };
  }, []);

  const isGenderMode = mode === "GENDER_TEAMS";
  const game = dashboard?.game || {};
  const players = game.players?.length ? game.players : (dashboard?.registration?.players || []);
  const teams = game.teams || dashboard?.teams || [];
  const timer = game.timer || dashboard?.timer || { minutes: 0, seconds: 0 };

  return (
    <main style={{display:"block",width:"520px",margin:0,padding:0,overflow:"hidden",boxSizing:"border-box",position:"relative"}}>
      {isGenderMode ? (
        <GenderVsOverlay teams={teams} players={players} timer={timer} liveActive={dashboard?.liveActive === true} />
      ) : (
        <>
          <Overlay />
          <IndividualRegistrationPromptV2 />
        </>
      )}
    </main>
  );
}

export default OverlayPage;
