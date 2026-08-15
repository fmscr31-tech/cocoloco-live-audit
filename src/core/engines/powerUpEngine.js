import { eventBus } from "../eventBus";
import { configManager } from "../configManager";

/**
 * Power-Up Engine: Extensible base architecture for detecting and executing special stream power-ups 
 * triggered by configured gifts, publishing events via eventBus.
 */
class PowerUpEngine {
  constructor() {
    this.activePowerUps = new Map();
    this.initListeners();
    this.ensureConfig();
  }

  ensureConfig() {
    const existing = configManager.get("powerUps");
    if (!existing) {
      configManager.set("powerUps", {
        shield: {
          enabled: true,
          giftName: "SHIELD",
          duration: 20
        },
        boost: {
          enabled: true,
          giftName: "ROCKET",
          duration: 15,
          multiplier: 2
        }
      });
    }
  }

  initListeners() {
    eventBus.subscribe("reward:processed", (reward) => {
      this.evaluatePowerUp(reward);
    });
  }

  evaluatePowerUp(reward) {
    const powerUpsConfig = configManager.get("powerUps") || {};
    const giftName = (reward.giftName || "").toUpperCase();

    for (const [powerId, config] of Object.entries(powerUpsConfig)) {
      if (config.enabled && (config.giftName || "").toUpperCase() === giftName) {
        this.activatePowerUp(powerId, config, reward);
      }
    }
  }

  activatePowerUp(powerId, config, reward) {
    const durationMs = (config.duration || 15) * 1000;
    const now = Date.now();

    const powerUpInstance = {
      id: `${powerId}_${now}`,
      powerId,
      username: reward.username,
      userId: reward.userId,
      giftName: reward.giftName,
      duration: config.duration || 15,
      expiresAt: now + durationMs,
      metadata: config
    };

    this.activePowerUps.set(powerUpInstance.id, powerUpInstance);
    eventBus.emit("powerup:activated", powerUpInstance);

    // Auto-expire timer
    setTimeout(() => {
      this.expirePowerUp(powerUpInstance.id);
    }, durationMs);

    return powerUpInstance;
  }

  expirePowerUp(instanceId) {
    const powerUp = this.activePowerUps.get(instanceId);
    if (!powerUp) return;

    this.activePowerUps.delete(instanceId);
    eventBus.emit("powerup:expired", powerUp);
  }

  removePowerUp(instanceId) {
    const powerUp = this.activePowerUps.get(instanceId);
    if (!powerUp) return;

    this.activePowerUps.delete(instanceId);
    eventBus.emit("powerup:removed", powerUp);
  }

  getActivePowerUps() {
    return Array.from(this.activePowerUps.values());
  }

  getPowerUpState() {
    return {
      activePowerUps: this.getActivePowerUps()
    };
  }
}

export const powerUpEngine = new PowerUpEngine();
