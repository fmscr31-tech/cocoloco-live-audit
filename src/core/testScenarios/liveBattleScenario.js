import { simulationEngine } from "../simulationEngine";
import { sessionManager } from "../sessionManager";
import { dashboardAPI } from "../dashboardAPI";
import { createTeam } from "../teamManager";
import { createPlayer, setPlayerTeam } from "../gameEngine";

/**
 * Live Battle Scenario: Automated end-to-end integration test simulating a complete TikTok LIVE competition.
 * Uses only public APIs (simulationEngine, sessionManager, dashboardAPI, gameEngine, teamManager).
 */
export async function runLiveBattleScenario() {
  console.log("🚀 [BATTLE SIMULATION] Iniciando simulación completa de batalla...");

  // 1. Start Live Session
  const session = sessionManager.startSession("battle_sim_session_01");
  console.log("🟢 [BATTLE SIMULATION] Sesión iniciada:", session.sessionId);

  // 2. Create Teams
  const team1 = createTeam({ name: "Equipo Alpha" });
  const team2 = createTeam({ name: "Equipo Beta" });
  console.log("👥 [BATTLE SIMULATION] Equipos creados:", team1.name, "y", team2.name);

  // 3. Simulate Joins & Players
  const viewers = ["CocoFan1", "StreamerPro", "GamerGirl", "TikTokKing", "LoverCat"];
  viewers.forEach((viewer, index) => {
    simulationEngine.simulateJoin(viewer);
    const player = createPlayer(viewer);
    if (player) {
      const assignedTeam = index % 2 === 0 ? team1.id : team2.id;
      setPlayerTeam(player.id, assignedTeam);
    }
  });
  console.log("👤 [BATTLE SIMULATION] Participantes conectados y asignados.");

  // 4. Simulate Interactions
  simulationEngine.simulateFollow("CocoFan1");
  simulationEngine.simulateShare("GamerGirl");
  simulationEngine.simulateLike("StreamerPro", 100);
  simulationEngine.simulateChat("TikTokKing", "¡Vamos con todo el poder!");
  console.log("💬 [BATTLE SIMULATION] Interacciones procesadas.");

  // 5. Simulate Full Gift Sequence (Rose, Ice Cream, Donut, Cowboy Hat, Money Gun, Galaxy)
  console.log("🎁 [BATTLE SIMULATION] Enviando secuencia completa de regalos...");
  simulationEngine.simulateGift("CocoFan1", "Rose", 5);
  simulationEngine.simulateGift("LoverCat", "Ice Cream", 2);
  simulationEngine.simulateGift("StreamerPro", "Donut", 30);
  simulationEngine.simulateGift("CocoFan1", "Cowboy Hat", 50);
  simulationEngine.simulateGift("TikTokKing", "Money Gun", 500);
  simulationEngine.simulateGift("GamerGirl", "Galaxy", 1000);

  // Wait for asynchronous queue processing
  await new Promise(resolve => setTimeout(resolve, 800));

  // 6. Simulate Context Interactive Win
  console.log("🏆 [BATTLE SIMULATION] Simulando Interactive Win...");
  simulationEngine.simulateWin("GamerGirl");

  await new Promise(resolve => setTimeout(resolve, 500));

  // 7. Gather Final Summary from Dashboard API
  const dashboard = dashboardAPI.getLiveDashboard();
  const summary = {
    sessionId: dashboard.session.sessionId,
    participants: Object.keys(dashboard.session.participants || {}).length,
    totalGifts: dashboard.session.giftsReceived,
    accumulatedPoints: dashboard.session.accumulatedPoints,
    topPlayers: dashboard.rankings.topPoints,
    completedMissions: dashboard.missions.history,
    winner: dashboard.gameRules.battleStatus.winner
  };

  console.log("📊 [BATTLE SIMULATION] Resumen Final de la Batalla:", summary);

  // 8. End Session
  sessionManager.endSession();
  console.log("🔴 [BATTLE SIMULATION] Sesión finalizada exitosamente.");

  return summary;
}
