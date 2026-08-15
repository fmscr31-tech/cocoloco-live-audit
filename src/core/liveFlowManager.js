import { eventBus } from "./eventBus";

/**
 * Live Flow Manager v1
 * Manages the current broadcast stage / phase of the live stream competition.
 * Phases supported: WAITING, PREPARATION, COUNTDOWN, ACTIVE_ROUND, ROUND_END, CELEBRATION.
 * Does NOT handle game rules, points, player management, or engine state.
 */
class LiveFlowManager {
  constructor() {
    this.currentPhase = "WAITING";
    this.metadata = {};
    this.history = [];
  }

  /**
   * Returns current active broadcast phase.
   */
  getCurrentPhase() {
    return this.currentPhase;
  }

  /**
   * Returns full phase state snapshot.
   */
  getPhaseState() {
    return {
      phase: this.currentPhase,
      metadata: this.metadata,
      timestamp: Date.now()
    };
  }

  /**
   * Updates the broadcast phase and emits event via eventBus.
   */
  setPhase(newPhase, metadata = {}) {
    const validPhases = [
      "WAITING",
      "PREPARATION",
      "COUNTDOWN",
      "ACTIVE_ROUND",
      "ROUND_END",
      "CELEBRATION"
    ];

    if (!validPhases.includes(newPhase)) {
      console.warn(`[LiveFlowManager] Invalid phase requested: ${newPhase}`);
      return false;
    }

    const oldPhase = this.currentPhase;
    if (oldPhase === newPhase) {
      return true; // No change needed
    }

    this.currentPhase = newPhase;
    this.metadata = { ...metadata };
    this.history.push({
      from: oldPhase,
      to: newPhase,
      metadata: this.metadata,
      timestamp: Date.now()
    });

    console.log(`[LiveFlowManager] Phase changed: ${oldPhase} -> ${newPhase}`);

    eventBus.publish("live:phase_changed", {
      from: oldPhase,
      to: newPhase,
      metadata: this.metadata
    });

    return true;
  }
}

export const liveFlowManager = new LiveFlowManager();
