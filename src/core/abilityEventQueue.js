import { eventBus } from "./eventBus";

/**
 * Ability Event Queue v1.0
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
   * @param {Object} abilityPayload - { abilityId, sourceGift, teamId, sender, duration, display, gameAction, scoreAction, priority }
   */
  enqueue(abilityPayload) {
    if (!abilityPayload) return;

    const item = {
      ...abilityPayload,
      priority: abilityPayload.priority !== undefined ? abilityPayload.priority : 0,
      timestamp: abilityPayload.timestamp || Date.now(),
      status: "queued"
    };

    console.log("[ABILITY QUEUED]", item);
    console.log(`[AbilityEventQueue] Enqueuing ability: ${item.abilityId} (Priority: ${item.priority})`);

    this.queue.push(item);
    this.queue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority; // higher priority first (future ready)
      }
      return a.timestamp - b.timestamp; // FIFO for same priority
    });

    eventBus.publish("ability:queued", item);

    if (!this.currentPlaying) {
      this.processNext();
    }
  }

  /**
   * Processes the next ability in the queue if none is currently playing.
   */
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

    const duration = item.duration || 3000;
    this.timerId = setTimeout(() => {
      this.finishCurrent();
    }, duration);
  }

  /**
   * Finishes the currently playing ability and starts the next.
   */
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

  /**
   * Returns the currently playing ability item.
   */
  getCurrentPlaying() {
    return this.currentPlaying;
  }

  /**
   * Returns whether an ability is currently playing.
   */
  isPlaying() {
    return !!this.currentPlaying;
  }

  /**
   * Clears queue and stops current playback.
   */
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
