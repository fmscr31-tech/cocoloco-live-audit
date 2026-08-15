import { useState, useEffect } from "react";
import { dashboardAPI } from "../../core/dashboardAPI";
import { eventBus } from "../../core/eventBus";

/**
 * SessionRecord component — Secondary HUD displaying accumulated session statistics
 * derived exclusively from historicalLeaderboardEngine via dashboardAPI.
 * Completely distinct from primary active round scores.
 */
export function SessionRecord({ mode = "team" }) {
  const [sessionData, setSessionData] = useState(() => {
    const dash = dashboardAPI.getLiveDashboard();
    return dash.historicalLeaderboard || { individual: [], team: [] };
  });

  useEffect(() => {
    const updateHistory = () => {
      const dash = dashboardAPI.getLiveDashboard();
      setSessionData(dash.historicalLeaderboard || { individual: [], team: [] });
    };

    updateHistory();

    const unsubFinished = eventBus.subscribe("round:finished", updateHistory);
    const unsubStarted = eventBus.subscribe("session:started", updateHistory);
    const unsubUpdated = eventBus.subscribe("session:updated", updateHistory);

    return () => {
      unsubFinished();
      unsubStarted();
      unsubUpdated();
    };
  }, []);

  const isTeam = mode === "team";
  const rows = isTeam ? (sessionData.team || []) : (sessionData.individual || []).slice(0, 5);

  if (rows.length === 0) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(12, 16, 32, 0.95), rgba(6, 10, 20, 0.98))",
      border: "1px solid rgba(0, 245, 255, 0.3)",
      borderRadius: "6px",
      padding: "4px 8px",
      margin: "4px auto 2px auto",
      width: "100%",
      maxWidth: "320px",
      boxSizing: "border-box",
      boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
      fontFamily: "inherit",
      zIndex: 10
    }}>
      <div style={{ textAlign: "center", marginBottom: "4px" }}>
        <img src="/gifts/Doughnut.webp" alt="Doughnut" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
      </div>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "7px",
        fontWeight: 900,
        color: "#00f5ff",
        textTransform: "uppercase",
        letterSpacing: "0.8px",
        marginBottom: "2px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        paddingBottom: "2px"
      }}>
        <span>📊 SESSION RECORD ({isTeam ? "TEAM" : "INDIVIDUAL"})</span>
        <span style={{ color: "#ffd700" }}>ACCUMULATED</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {rows.map((row, idx) => {
          const name = isTeam ? row.teamName : (row.displayName || row.username);
          return (
            <div key={row.teamId || row.playerId || idx} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "7.5px",
              fontWeight: 700,
              color: "#ffffff",
              background: "rgba(255,255,255,0.03)",
              padding: "1px 4px",
              borderRadius: "3px"
            }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px" }}>
                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"} {name}
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <span style={{ color: "#ffd700", fontWeight: 900 }}>{row.totalPoints} pts</span>
                <span style={{ color: "#39ff88" }}>{row.roundsWon} W</span>
                {!isTeam && <span style={{ color: "#ffaa33" }}>{row.mvpCount} MVP</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
