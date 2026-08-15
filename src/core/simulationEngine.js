import { receiveEvent } from "./eventBridge";
import { giftEventBridge } from "./giftEventBridge";

/**
 * Simulation Engine: Generates simulated stream events (JOIN, CHAT, GIFT, LIKE, FOLLOW, SHARE)
 * entering through the official eventBridge and giftEventBridge pipelines for testing without external TikTok LIVE connections.
 */
class SimulationEngine {
  constructor() {}

  simulateJoin(username = "TikTokFan2026") {
    return receiveEvent({
      type: "JOIN",
      username: username,
      userId: `user_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      timestamp: Date.now()
    });
  }

  simulateChat(username = "CocoViewer", message = "Vamos equipo!") {
    return receiveEvent({
      type: "CHAT",
      username: username,
      userId: `user_${username.toLowerCase()}`,
      payload: { message },
      timestamp: Date.now()
    });
  }

  simulateGift(username = "GiftMaster", giftName = "Rose", value = 1) {
    return giftEventBridge.processExternalGift({
      source: "simulation",
      giftId: giftName,
      username: username,
      quantity: value,
      diamondValue: value
    });
  }

  simulateLike(username = "TapTap", count = 10) {
    return receiveEvent({
      type: "LIKE",
      username: username,
      userId: `user_${username.toLowerCase()}`,
      value: count,
      timestamp: Date.now()
    });
  }

  simulateFollow(username = "NewFollower") {
    return receiveEvent({
      type: "FOLLOW",
      username: username,
      userId: `user_${username.toLowerCase()}`,
      timestamp: Date.now()
    });
  }

  simulateShare(username = "SharerUser") {
    return receiveEvent({
      type: "SHARE",
      username: username,
      userId: `user_${username.toLowerCase()}`,
      timestamp: Date.now()
    });
  }

  simulateWin(username = "ChampionUser") {
    // Triggers a high-impact Galaxy gift to cross the winning threshold and trigger victory detection
    return this.simulateGift(username, "Galaxy", 1000);
  }
}

export const simulationEngine = new SimulationEngine();
