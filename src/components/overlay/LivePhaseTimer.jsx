import { useState, useEffect } from "react";
import { dashboardAPI } from "../../core/dashboardAPI";
import { IndividualRegistrationPrompt } from "./IndividualRegistrationPrompt";

export function LivePhaseTimer() {
  const [phaseData, setPhaseData] = useState({ active: false, title: "⚔️ BATALLA INICIA EN", seconds: 10, type: "battle_prep" });

  useEffect(() => {
    const unsubscribe = dashboardAPI.subscribe((dashboard) => {
      const timer = dashboard?.game?.timer || {};
      if (timer.phaseCountdown && timer.phaseCountdown > 0) {
        setPhaseData({ active: true, title: timer.phaseTitle || "⚔️ BATALLA INICIA EN", seconds: timer.phaseCountdown, type: timer.phaseType || "battle_prep" });
      } else {
        setPhaseData(prev => prev.active ? { ...prev, active: false } : prev);
      }
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  const formatTime = (secs) => {
    const mins = Math.floor((secs || 0) / 60);
    const s = (secs || 0) % 60;
    return String(mins).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  };

  return (
    <>
      <IndividualRegistrationPrompt />
      {phaseData.active && (
        <div className="live-phase-timer-container">
          <div className="live-phase-title">{phaseData.title}</div>
          <div className="live-phase-digits">{formatTime(phaseData.seconds)}</div>
        </div>
      )}
    </>
  );
}
