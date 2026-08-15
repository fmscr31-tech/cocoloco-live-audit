import { useState, useEffect } from "react";
import { historyEngine } from "../../core/engines/historyEngine";
import { eventBus } from "../../core/eventBus";

export function PlayerHistoryControls() {
  const [filter, setFilter] = useState("ALL"); // ALL | DIARIO | SEMANAL | MENSUAL
  const [mvps, setMvps] = useState([]);
  const [winners, setWinners] = useState([]);
  const [teamRounds, setTeamRounds] = useState([]);

  const refreshHistory = () => {
    setMvps(historyEngine.getAggregatedMvps(filter));
    setWinners(historyEngine.getAggregatedIndividualWinners(filter));
    setTeamRounds(historyEngine.getAggregatedTeamRounds(filter));
  };

  useEffect(() => {
    refreshHistory();

    const unsubMvp = eventBus.subscribe("history:mvp_recorded", refreshHistory);
    const unsubWin = eventBus.subscribe("history:individual_win_recorded", refreshHistory);
    const unsubRound = eventBus.subscribe("history:team_round_recorded", refreshHistory);
    const unsubClear = eventBus.subscribe("history:cleared", refreshHistory);

    return () => {
      unsubMvp();
      unsubWin();
      unsubRound();
      unsubClear();
    };
  }, [filter]);

  const handleClearHistory = () => {
    if (window.confirm("¿Estás seguro de limpiar todo el historial de estadísticas persistentes?")) {
      historyEngine.clearHistory();
    }
  };

  return (
    <div style={{ background: "#261c3a", padding: "16px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", marginTop: "16px", color: "#ffffff", fontFamily: "inherit" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "16px", margin: 0, color: "#ffd700", textTransform: "uppercase", letterSpacing: "1px" }}>
          📊 Panel Histórico — Players & Rankings
        </h3>
        
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ display: "flex", background: "#120f1d", borderRadius: "6px", padding: "2px", border: "1px solid rgba(255,255,255,0.1)" }}>
            {["ALL", "DIARIO", "SEMANAL", "MENSUAL"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? "#00f5ff" : "transparent",
                  color: filter === f ? "#000000" : "#a0aec0",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 800,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={handleClearHistory}
            style={{
              background: "rgba(255, 51, 51, 0.2)",
              color: "#ff4d4d",
              border: "1px solid #ff3333",
              padding: "5px 10px",
              borderRadius: "6px",
              fontWeight: 800,
              fontSize: "11px",
              cursor: "pointer"
            }}
          >
            🗑️ Limpiar Historial
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        
        {/* SECTION A: MVP LEADERBOARD - TEAM MODE */}
        <div style={{ background: "rgba(18, 15, 29, 0.7)", borderRadius: "8px", padding: "12px", border: "1px solid rgba(255, 215, 0, 0.2)" }}>
          <div style={{ fontSize: "13px", fontWeight: 900, color: "#ffd700", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px", textTransform: "uppercase" }}>
            🏆 MVPs — Modo Equipos
          </div>
          {mvps.length === 0 ? (
            <div style={{ fontSize: "11px", color: "#a0aec0", textAlign: "center", padding: "20px 0", fontStyle: "italic" }}>
              Sin MVPs registrados en este período.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {mvps.map((item, index) => (
                <div key={item.playerId || index} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.04)", padding: "6px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "⭐"}</span>
                    <span>{item.playerName}</span>
                    <span style={{ fontSize: "9px", color: "#00f5ff", background: "rgba(0,245,255,0.1)", padding: "1px 5px", borderRadius: "4px" }}>{item.teamName}</span>
                  </div>
                  <span style={{ color: "#ffd700", fontWeight: 900 }}>{item.count} MVP{item.count > 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION B: INDIVIDUAL WINNERS */}
        <div style={{ background: "rgba(18, 15, 29, 0.7)", borderRadius: "8px", padding: "12px", border: "1px solid rgba(0, 245, 255, 0.2)" }}>
          <div style={{ fontSize: "13px", fontWeight: 900, color: "#00f5ff", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px", textTransform: "uppercase" }}>
            👑 Ganadores — Modo Individual
          </div>
          {winners.length === 0 ? (
            <div style={{ fontSize: "11px", color: "#a0aec0", textAlign: "center", padding: "20px 0", fontStyle: "italic" }}>
              Sin ganadores registrados en este período.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {winners.map((item, index) => (
                <div key={item.playerId || index} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.04)", padding: "6px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>{index === 0 ? "👑" : index === 1 ? "🥈" : index === 2 ? "🥉" : "⭐"}</span>
                    <span>{item.playerName}</span>
                  </div>
                  <span style={{ color: "#00f5ff", fontWeight: 900 }}>{item.count} Win{item.count > 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION C: TEAM ROUNDS WON */}
        <div style={{ background: "rgba(18, 15, 29, 0.7)", borderRadius: "8px", padding: "12px", border: "1px solid rgba(255, 51, 102, 0.2)" }}>
          <div style={{ fontSize: "13px", fontWeight: 900, color: "#ff3366", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px", textTransform: "uppercase" }}>
            ⚔️ Rondas Ganadas — Equipos
          </div>
          {teamRounds.length === 0 ? (
            <div style={{ fontSize: "11px", color: "#a0aec0", textAlign: "center", padding: "20px 0", fontStyle: "italic" }}>
              Sin rondas ganadas registradas en este período.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {teamRounds.map((item, index) => (
                <div key={item.teamId || index} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.04)", padding: "6px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>{index === 0 ? "🛡️" : "⚔️"}</span>
                    <span>{item.teamName}</span>
                  </div>
                  <span style={{ color: "#ff3366", fontWeight: 900 }}>{item.count} Ronda{item.count > 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
