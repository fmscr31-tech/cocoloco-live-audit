import { eventBus } from "./eventBus";
import { configManager } from "./configManager";
import { audioManager } from "./audioManager";

/**
 * Freeze Audio Bridge
 * Keeps FREEZE outside the normal Ability registry while still using the
 * same authoritative audio manager and persisted configuration.
 */
class FreezeAudioBridge {
  constructor() {
    eventBus.subscribe("effect:activated", (effect) => this.handleActivated(effect));
  }

  handleActivated(effect) {
    const sound = effect?.sound || configManager.get("battleEffects.freeze.sound");
    if (!sound) return;

    audioManager.playSound(sound, {
      source: "FREEZE_EFFECT",
      abilityId: "freeze",
      sourceGift: effect?.activationGift || configManager.get("battleEffects.freeze.activationGift") || "Twinkling Star"
    });
  }
}

export const freezeAudioBridge = new FreezeAudioBridge();
