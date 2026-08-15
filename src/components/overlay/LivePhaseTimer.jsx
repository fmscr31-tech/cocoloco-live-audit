import { useState, useEffect } from "react";
import { dashboardAPI } from "../../core/dashboardAPI";

export function LivePhaseTimer() {
  const [phaseData, setPhaseData] = useState({
    active: false,
    title: "⚔️ BATALLA INICIA EN",
    seconds: 10,
    type: "battle_prep"
  });

  useEffect(() => {
    // Listen to dashboard updates or timer state
    const unsubscribe = dashboardAPI.subscribe((dashboard) => {
      const game = dashboard.game || {};
      const timer = game.timer || {};
      
      // If timer is paused or near start, we can optionally reflect phase countdowns or allow manual trigger via dashboard
      // For this visual sprint, we provide the component structure ready to display active phase countdowns
      if (timer.phaseCountdown && timer.phaseCountdown > 0) {
        setPhaseData({
          active: true,
          title: timer.phaseTitle || "⚔️ BATALLA INICIA EN",
          seconds: timer.phaseCountdown,
          type: timer.phaseType || "battle_prep"
        });
      }
    });

    return () => {
      unsubscribe && unsubscribe();
    };
  }, []);

  if (!phaseData.active) return null;

  const formatTime = (secs) => {
    const mins = Math.floor((secs || 0) / 60);
    const s = (secs || 0) % 60;
    return String(mins).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  };

  return (
    <div className="live-phase-timer-container">
      <div className="live-phase-title">
        {phaseData.title}
      </div>
      <div className="live-phase-digits">
        {formatTime(phaseData.seconds)}
      </div>
    </div>
  );
}
