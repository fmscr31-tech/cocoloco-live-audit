import { useState, useEffect } from "react";
import { historicalLeaderboardEngine } from "../../core/engines/historicalLeaderboardEngine";
import { sessionManager } from "../../core/sessionManager";
import { eventBus } from "../../core/eventBus";

export function HistoricalLeaderboardsControls() {
  const [viewMode, setViewMode] = useState("LEADERBOARDS"); // LEADERBOARDS | HALL_OF_FAME
  const [period, setPeriod] = useState("SESSION"); // SESSION | DAILY | WEEKLY | MONTHLY
  const [mode, setMode] = useState("INDIVIDUAL"); // INDIVIDUAL | TEAM
  const [dateParam, setDateParam] = useState(() => historicalLeaderboardEngine.getBusinessDate());
  const [yearParam, setYearParam] = useState(() => new Date().getFullYear());
  const [monthParam, setMonthParam] = useState(() => new Date().getMonth() + 1);

  const [leaderboardData, setLeaderboardData] = useState({ individual: [], team: [] });
  const [globalRecords, setGlobalRecords] = useState({ individual: {}, team: {} });

  const refreshData = () => {
    const currentSession = sessionManager.getSession();
    const allSessions = [currentSession];

    let result = { individual: [], team: [] };

    if (period === "SESSION") {
      result = historicalLeaderboardEngine.getSessionLeaderboard(currentSession);
    } else if (period === "DAILY") {
      result = historicalLeaderboardEngine.getDailyLeaderboard(dateParam, allSessions);
    } else if (period === "WEEKLY") {
      result = historicalLeaderboardEngine.getWeeklyLeaderboard(new Date(), allSessions);
    } else if (period === "MONTHLY") {
      result = historicalLeaderboardEngine.getMonthlyLeaderboard(yearParam, monthParam, allSessions);
    }

    setLeaderboardData(result);
    setGlobalRecords(historicalLeaderboardEngine.getGlobalRecords(allSessions));
  };

  useEffect(() => {
    refreshData();

    const unsubFinished = eventBus.subscribe("round:finished", refreshData);
    const unsubStarted = eventBus.subscribe("session:started", refreshData);
    const unsubEnded = eventBus.subscribe("session:ended", refreshData);
    const unsubUpdated = eventBus.subscribe("session:updated", refreshData);

    return () => {
      unsubFinished();
      unsubStarted();
      unsubEnded();
      unsubUpdated();
    };
  }, [period, mode, dateParam, yearParam, monthParam, viewMode]);

  const activeRows = mode === "INDIVIDUAL" ? leaderboardData.individual : leaderboardData.team;

  const recordLabels = {
    highestRoundScore: "🏆 Highest Round Score",
    mostRoundWins: "🥇 Most Round Wins",
    mostMVPs: "⭐ Most MVPs",
    highestSessionTotal: "🔥 Highest Session Total",
    highestDailyTotal: "📅 Highest Daily Total",
    highestWeeklyTotal: "📊 Highest Weekly Total",
    highestMonthlyTotal: "📈 Highest Monthly Total",
    mostRoundsPlayed: "🎮 Most Rounds Played",
    bestAverageRoundScore: "📈 Best Average Round Score"
  };

  return (
    <div style={{ background: "#1c1428", padding: "16px", borderRadius: "10px", border: "1px solid rgba(255,215,0,0.2)", color: "#ffffff", fontFamily: "inherit" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ fontSize: "16px", margin: 0, color: "#ffd700", textTransform: "uppercase", letterSpacing: "1px" }}>
          🏛️ Historical Leaderboards Engine & Hall of Fame
        </h3>

        {/* View Mode Selector: LEADERBOARDS vs HALL OF FAME */}
        <div style={{ display: "flex", background: "#120f1d", borderRadius: "6px", padding: "2px", border: "1px solid rgba(255,255,255,0.1)" }}>
          <button
            onClick={() => setViewMode("LEADERBOARDS")}
            style={{
              background: viewMode === "LEADERBOARDS" ? "#00f5ff" : "transparent",
              color: viewMode === "LEADERBOARDS" ? "#000000" : "#a0aec0",
              border: "none",
              padding: "6px 14px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            📊 LEADERBOARDS
          </button>
          <button
            onClick={() => setViewMode("HALL_OF_FAME")}
            style={{
              background: viewMode === "HALL_OF_FAME" ? "#ffd700" : "transparent",
              color: viewMode === "HALL_OF_FAME" ? "#000000" : "#a0aec0",
              border: "none",
              padding: "6px 14px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            🏆 HALL OF FAME / RECORD HOLDERS
          </button>
        </div>
      </div>

      {viewMode === "LEADERBOARDS" ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
            {/* Period Selector */}
            <div style={{ display: "flex", background: "#120f1d", borderRadius: "6px", padding: "2px", border: "1px solid rgba(255,255,255,0.1)" }}>
              {["SESSION", "DAILY", "WEEKLY", "MONTHLY"].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    background: period === p ? "#00f5ff" : "transparent",
                    color: period === p ? "#000000" : "#a0aec0",
                    border: "none",
                    padding: "5px 10px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Mode Selector */}
            <div style={{ display: "flex", background: "#120f1d", borderRadius: "6px", padding: "2px", border: "1px solid rgba(255,255,255,0.1)" }}>
              {["INDIVIDUAL", "TEAM"].map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    background: mode === m ? "#ffd700" : "transparent",
                    color: mode === m ? "#000000" : "#a0aec0",
                    border: "none",
                    padding: "5px 12px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Period Parameter Controls */}
          {period === "DAILY" && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", background: "rgba(0,0,0,0.3)", padding: "8px", borderRadius: "6px" }}>
              <span style={{ fontSize: "11px", color: "#a0aec0", fontWeight: 700 }}>Fecha Business Date:</span>
              <input
                type="date"
                value={dateParam}
                onChange={(e) => setDateParam(e.target.value)}
                style={{ background: "#120f1d", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", padding: "4px 8px", fontSize: "11px" }}
              />
            </div>
          )}

          {period === "MONTHLY" && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", background: "rgba(0,0,0,0.3)", padding: "8px", borderRadius: "6px" }}>
              <span style={{ fontSize: "11px", color: "#a0aec0", fontWeight: 700 }}>Año:</span>
              <input
                type="number"
                value={yearParam}
                onChange={(e) => setYearParam(Number(e.target.value))}
                style={{ width: "70px", background: "#120f1d", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", padding: "4px 6px", fontSize: "11px" }}
              />
              <span style={{ fontSize: "11px", color: "#a0aec0", fontWeight: 700 }}>Mes (1-12):</span>
              <input
                type="number"
                min="1"
                max="12"
                value={monthParam}
                onChange={(e) => setMonthParam(Number(e.target.value))}
                style={{ width: "50px", background: "#120f1d", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", padding: "4px 6px", fontSize: "11px" }}
              />
            </div>
          )}

          {/* Leaderboard Table */}
          <div style={{ background: "rgba(18, 15, 29, 0.8)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 90px 70px 70px 70px 90px 90px", background: "rgba(0,0,0,0.4)", padding: "10px 12px", fontSize: "10px", fontWeight: 900, color: "#ffd700", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <div>Rank</div>
              <div>{mode === "INDIVIDUAL" ? "Player" : "Team"}</div>
              <div>Total Pts</div>
              <div>Rounds</div>
              <div>Wins</div>
              <div>MVPs</div>
              <div>Best Round</div>
              <div>Average</div>
            </div>

            {activeRows.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#a0aec0", fontStyle: "italic", fontSize: "12px" }}>
                NO HISTORICAL DATA FOR {period} ({mode})
              </div>
            ) : (
              activeRows.map((row, idx) => {
                const name = mode === "INDIVIDUAL" ? (row.displayName || row.username) : row.teamName;
                return (
                  <div key={row.playerId || row.teamId || idx} style={{ display: "grid", gridTemplateColumns: "50px 1fr 90px 70px 70px 70px 90px 90px", padding: "10px 12px", alignItems: "center", fontSize: "12px", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.05)", background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                    <div style={{ color: idx === 0 ? "#ffd700" : idx === 1 ? "#c0c0c0" : idx === 2 ? "#cd7f32" : "#a0aec0", fontWeight: 900 }}>
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}º`}
                    </div>
                    <div style={{ color: "#ffffff", fontWeight: 800 }}>{name}</div>
                    <div style={{ color: "#00f5ff", fontWeight: 900 }}>{row.totalPoints} pts</div>
                    <div style={{ color: "#e2e8f0" }}>{row.roundsPlayed}</div>
                    <div style={{ color: "#39ff88" }}>{row.roundsWon}</div>
                    <div style={{ color: "#ffd700" }}>{row.mvpCount}</div>
                    <div style={{ color: "#ffaa33" }}>{row.bestRoundScore} pts</div>
                    <div style={{ color: "#a0aec0" }}>{row.averageRoundScore}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* HALL OF FAME / RECORD HOLDERS SECTION */
        <div>
          <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
            <h4 style={{ margin: "0 0 14px 0", color: "#ffd700", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid rgba(255,215,0,0.2)", paddingBottom: "8px" }}>
              👑 Individual Records (Hall of Fame)
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
              {Object.entries(globalRecords.individual || {}).map(([key, record]) => {
                const label = recordLabels[key] || key;
                const holderName = record.displayName || record.playerId || "None";
                const val = record.value ?? 0;
                const contextInfo = record.period && record.period !== "GLOBAL" && record.period !== "ROUND" ? `(${record.period})` : "";
                return (
                  <div key={key} style={{ background: "#120f1d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ fontSize: "11px", color: "#a0aec0", fontWeight: 800, textTransform: "uppercase" }}>{label}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div style={{ fontSize: "18px", fontWeight: 900, color: "#00f5ff" }}>
                        {val} {key.toLowerCase().includes("score") || key.toLowerCase().includes("total") ? "pts" : key.toLowerCase().includes("average") ? "avg" : ""}
                      </div>
                      <div style={{ fontSize: "11px", color: "#ffd700", fontWeight: 700 }}>Individual</div>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#ffffff", marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
                      <span>👤 {holderName}</span>
                      {contextInfo && <span style={{ fontSize: "10px", color: "#888", fontWeight: 600 }}>{contextInfo}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,245,255,0.3)", borderRadius: "8px", padding: "16px" }}>
            <h4 style={{ margin: "0 0 14px 0", color: "#00f5ff", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid rgba(0,245,255,0.2)", paddingBottom: "8px" }}>
              🛡️ Team Records (Hall of Fame)
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
              {Object.entries(globalRecords.team || {}).map(([key, record]) => {
                const label = recordLabels[key] || key;
                const holderName = record.teamName || record.teamId || "None";
                const val = record.value ?? 0;
                const contextInfo = record.period && record.period !== "GLOBAL" && record.period !== "ROUND" ? `(${record.period})` : "";
                return (
                  <div key={key} style={{ background: "#120f1d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ fontSize: "11px", color: "#a0aec0", fontWeight: 800, textTransform: "uppercase" }}>{label}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div style={{ fontSize: "18px", fontWeight: 900, color: "#ffd700" }}>
                        {val} {key.toLowerCase().includes("score") || key.toLowerCase().includes("total") ? "pts" : key.toLowerCase().includes("average") ? "avg" : ""}
                      </div>
                      <div style={{ fontSize: "11px", color: "#00f5ff", fontWeight: 700 }}>Team</div>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#ffffff", marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
                      <span>👥 {holderName}</span>
                      {contextInfo && <span style={{ fontSize: "10px", color: "#888", fontWeight: 600 }}>{contextInfo}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
