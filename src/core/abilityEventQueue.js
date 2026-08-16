import { eventBus } from "./eventBus";
// Importing the dispatcher registers the single authoritative score executor.
import "./abilityActionDispatcher";

/**
 * Ability Event Queue v1.1
 * Manages sequential playback of abilities (FIFO with future priority support).
 * Prevents visual overlap by queueing overlapping ability triggers and playing them one by one.
 */
class AbilityEventQueue {
  constructor() {
    this.queue = [];
    this.currentPlaying = null;
    this.timerId = null;
  }

  /**
   * Enqueues a new ability item.
   * @param {Object} abilityPayload - { abilityId, sourceGift, teamId, sender, duration, display, gameAction, scoreAction, sound, priority }
   */
  enqueue(abilityPayload) {
    if (!abilityPayload) return;

    const item = {
      ...abilityPayload,
      priority: abilityPayload.priority !== undefined ? abilityPayload.priority : 0,
      timestamp: abilityPayload.timestamp || Date.now(),
      executionId: abilityPayload.executionId || `ability_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      status: "queued"
    };

    console.log("[ABILITY QUEUED]", item);
    console.log(`[AbilityEventQueue] Enqueuing ability: ${item.abilityId} (Priority: ${item.priority})`);

    this.queue.push(item);
    this.queue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });

    eventBus.publish("ability:queued", item);

    if (!this.currentPlaying) {
      this.processNext();
    }
  }

  processNext() {
    if (this.currentPlaying || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    item.status = "playing";
    this.currentPlaying = item;

    console.log("[ABILITY STARTED]", item);
    console.log(`[AbilityEventQueue] Starting ability: ${item.abilityId} (Duration: ${item.duration || 3000}ms)`);
    eventBus.publish("ability:started", item);

    // Cocazo is a visual/audio reaction owned by CocoDanceZone. The raw
    // normalized:gift event must not be broadcast because it would re-run the
    // entire gift pipeline in the overlay. Instead broadcast this post-resolution
    // trigger so the overlay reacts exactly once to the already-resolved ability.
    if (item.abilityId === "cocazo") {
      eventBus.publish("cocazo:trigger", {
        ...item,
        source: "COCAZO"
      });
    }

    const duration = item.duration || 3000;
    this.timerId = setTimeout(() => {
      this.finishCurrent();
    }, duration);
  }

  finishCurrent() {
    if (!this.currentPlaying) return;

    const finished = { ...this.currentPlaying, status: "removed" };
    console.log("[ABILITY FINISHED]", finished);
    console.log(`[AbilityEventQueue] Finished ability: ${finished.abilityId}`);
    eventBus.publish("ability:finished", finished);

    this.currentPlaying = null;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    this.processNext();
  }

  getCurrentPlaying() {
    return this.currentPlaying;
  }

  isPlaying() {
    return !!this.currentPlaying;
  }

  clear() {
    this.queue = [];
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.currentPlaying = null;
    eventBus.publish("ability:queue_cleared", {});
  }
}

export const abilityEventQueue = new AbilityEventQueue();
