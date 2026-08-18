import { eventBus } from "./eventBus";

/**
 * Freeze Audio Bridge
 *
 * FREEZE audio has a single authoritative playback owner: audioManager.
 * This bridge intentionally observes the effect for diagnostics only so the
 * same activation cannot produce a second copy of the sound.
 */
class FreezeAudioBridge {
  constructor() {
    eventBus.subscribe("effect:activated", (effect) => {
      if (effect?.type === "FREEZE") {
        console.log("[FreezeAudioBridge] FREEZE effect observed; audio delegated to audioManager", {
          activationGift: effect?.activationGift || null,
          affectedTeam: effect?.affectedTeamName || effect?.affectedTeam || null
        });
      }
    });
  }
}

export const freezeAudioBridge = new FreezeAudioBridge();
