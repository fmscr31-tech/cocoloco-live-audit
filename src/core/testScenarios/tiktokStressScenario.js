import { receiveEvent, getPendingEvents } from "../eventBridge";
import { dashboardAPI } from "../dashboardAPI";

/**
 * TikTok Stress Scenario: Automated stress test simulating high-volume TikTok LIVE traffic 
 * (1000 JOINS, 500 CHATS, 5000 LIKES, 100 FOLLOWS, 100 SHARES, 100 GIFTS) via eventBridge.receiveEvent().
 * Measures ingestion performance, processing time, and dashboard stability.
 */
export async function runTikTokStressTest() {
  console.log("⚡ [STRESS TEST] Iniciando prueba de estrés TikTok LIVE...");

  const startTime = Date.now();
  let receivedCount = 0;
  const errors = 0;

  const sampleUsers = Array.from({ length: 50 }, (_, i) => `Viewer_${i + 1}`);
  const sampleGifts = ["Rose", "Ice Cream", "Donut", "Galaxy", "STAR"];

  const totalEvents = 1000 + 500 + 5000 + 100 + 100 + 100; // 6,900 events
  console.log(`📦 [STRESS TEST] Generando lote de ${totalEvents} eventos simulados...`);

  const eventsBuffer = [];

  // 1000 Joins
  for (let i = 0; i < 1000; i++) {
    eventsBuffer.push({
      type: "JOIN",
      username: sampleUsers[i % sampleUsers.length],
      userId: `user_join_${i}`
    });
  }

  // 500 Chats
  for (let i = 0; i < 500; i++) {
    eventsBuffer.push({
      type: "CHAT",
      username: sampleUsers[i % sampleUsers.length],
      userId: `user_chat_${i}`,
      payload: { message: "¡Hola CocoLoco!" }
    });
  }

  // 5000 Likes
  for (let i = 0; i < 5000; i++) {
    eventsBuffer.push({
      type: "LIKE",
      username: sampleUsers[i % sampleUsers.length],
      userId: `user_like_${i}`,
      value: 5
    });
  }

  // 100 Follows
  for (let i = 0; i < 100; i++) {
    eventsBuffer.push({
      type: "FOLLOW",
      username: sampleUsers[i % sampleUsers.length],
      userId: `user_follow_${i}`
    });
  }

  // 100 Shares
  for (let i = 0; i < 100; i++) {
    eventsBuffer.push({
      type: "SHARE",
      username: sampleUsers[i % sampleUsers.length],
      userId: `user_share_${i}`
    });
  }

  // 100 Gifts (including STAR for freeze testing)
  for (let i = 0; i < 100; i++) {
    const gift = sampleGifts[i % sampleGifts.length];
    eventsBuffer.push({
      type: "GIFT",
      username: sampleUsers[i % sampleUsers.length],
      userId: `user_gift_${i}`,
      value: gift === "Galaxy" ? 1000 : 10,
      payload: { giftName: gift, diamondCount: gift === "Galaxy" ? 1000 : 10, repeatCount: 1 }
    });
  }

  // Ingest into eventBridge
  const ingestionStart = Date.now();
  eventsBuffer.forEach(ev => {
    const res = receiveEvent(ev);
    if (res) receivedCount++;
  });
  const ingestionTime = Date.now() - ingestionStart;

  console.log(`📥 [STRESS TEST] Ingestados ${receivedCount} eventos en ${ingestionTime}ms.`);

  // Wait for eventDispatcher and engines to process the queue
  await new Promise(resolve => setTimeout(resolve, 1500));

  const endTime = Date.now();
  const totalDuration = endTime - startTime;

  const dashboard = dashboardAPI.getLiveDashboard();
  const pendingAfter = getPendingEvents().length;

  const report = {
    totalTargetEvents: totalEvents,
    eventsIngested: receivedCount,
    processingTimeMs: totalDuration,
    ingestionTimeMs: ingestionTime,
    validationErrors: errors,
    lostEvents: Math.max(0, totalEvents - receivedCount - pendingAfter),
    dashboardStats: {
      totalParticipants: dashboard.statistics.session.totalParticipants,
      eventsProcessed: dashboard.statistics.session.eventsProcessed,
      totalGifts: dashboard.statistics.session.totalGifts,
      generatedPoints: dashboard.statistics.session.generatedPoints,
      activeEffects: dashboard.battleEffects
    }
  };

  console.log("📊 [STRESS TEST REPORT]", report);
  return report;
}
