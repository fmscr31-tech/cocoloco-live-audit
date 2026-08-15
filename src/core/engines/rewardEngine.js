import { configManager } from "../configManager";
import { eventBus } from "../eventBus";

/**
 * Reward Engine: Sole module responsible for interpreting GIFT events.
 * Consumes configuration via configManager.
 */
class RewardEngine {
  constructor() {
    this.subscribers = [];
  }

  subscribe(callback) {
    if (typeof callback === "function") {
      this.subscribers.push(callback);
    }
  }

  unsubscribe(callback) {
    this.subscribers = this.subscribers.filter(sub => sub !== callback);
  }

  notify(rewardData) {
    this.subscribers.forEach(sub => sub(rewardData));
    eventBus.emit("reward:processed", rewardData);
  }

  getGiftConfig(giftName) {
    if (!giftName) return null;
    const giftsMap = configManager.get("gifts.GIFTS") || {};
    return giftsMap[giftName] || {
      id: giftName.toLowerCase().replace(/\s+/g, '_'),
      name: giftName,
      diamondValue: 1,
      pointsMultiplier: 1,
      effect: "standard",
      sound: null
    };
  }

  processGiftEvent(event) {
    console.log("[Game Effect Applied]");
    const giftName = event.payload?.giftName || event.data?.giftName || "Rose";
    const diamondCount = Number(event.payload?.diamondCount || event.value || 1);
    const repeatCount = Number(event.payload?.repeatCount || 1);
    
    const config = this.getGiftConfig(giftName);

    const calculatedPoints = diamondCount * repeatCount * (config.pointsMultiplier || 1);

    const rewardResult = {
      eventId: event.id || crypto.randomUUID(),
      username: event.username,
      userId: event.userId,
      giftName: config.name,
      diamondValue: diamondCount,
      repeatCount: repeatCount,
      points: calculatedPoints,
      effect: config.effect,
      sound: config.sound,
      timestamp: Date.now()
    };

    this.notify(rewardResult);
    return rewardResult;
  }
}

export const rewardEngine = new RewardEngine();
