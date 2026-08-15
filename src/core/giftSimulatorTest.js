import { giftEventBridge } from "./giftEventBridge";

/**
 * External Event Simulator v2
 * Development test utility to validate the complete external gift event pipeline:
 * Simulator -> giftEventBridge -> eventBus -> giftResolver -> giftActionDispatcher -> GiftPipelineMonitor.
 */
class GiftSimulatorTest {
  /**
   * Runs the complete external gift pipeline simulation via giftEventBridge.
   * @param {Object} event - { giftId, username, quantity, diamondValue }
   * @param {string} gameMode - e.g. "context", "vs_battle", "tournament"
   * @returns {Object} Pipeline trace results
   */
  runTest(event = { giftId: "rose", username: "TestViewer", quantity: 10, diamondValue: 10 }, gameMode = "context") {
    console.log("==================================================");
    console.log("🧪 [External Event Simulator v2] Starting Pipeline Simulation");
    console.log("1️⃣ Step 1: Simulator emits raw external payload into giftEventBridge");
    console.log("Payload:", event);
    console.log(`Target Game Mode: ${gameMode}`);

    const rawPayload = {
      source: "simulator",
      type: "GIFT",
      giftId: event.giftId || "5655",
      username: event.username || "TestUser",
      quantity: event.quantity || 10,
      diamondValue: event.diamondValue || 10
    };

    // Step 2 & 3: giftEventBridge normalizes and publishes "normalized:gift" to eventBus
    const normalized = giftEventBridge.processExternalGift(rawPayload);
    console.log("2️⃣ Step 2 & 3: giftEventBridge normalized & published to eventBus:", normalized);

    console.log("✅ [External Event Simulator v2] Simulation event injected into bridge successfully!");
    console.log("==================================================");

    return {
      success: true,
      rawPayload,
      normalized
    };
  }
}

export const giftSimulatorTest = new GiftSimulatorTest();

// Attach to window for easy browser console testing if in browser
if (typeof window !== "undefined") {
  window.__cocoGiftTest = (giftId, username, quantity, mode) => {
    return giftSimulatorTest.runTest({ giftId, username, quantity }, mode);
  };
}
