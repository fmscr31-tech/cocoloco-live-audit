import { eventBus } from "./eventBus";
import { GIFT_ABILITY_MAP } from "../config/giftAbilityMap";
import { ABILITY_REGISTRY } from "../config/abilityRegistry";
import { configManager } from "./configManager";

/**
 * Audio Manager v5.1
 * Single authoritative audio routing layer for abilities and independent gifts.
 * Ability Manager configuration is persisted through configManager and is used
 * at runtime; legacy static mappings are used only as fallback/default data.
 */
class AudioManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.6;
    this.unlocked = false;
    this.audioCache = new Map();
    this._lastPlayedGiftSound = null;
    this.isOverlayContext = typeof window !== "undefined" && (
      window.location.pathname.includes("overlay") ||
      window.location.pathname.includes("preview") ||
      window.__cocoIsOverlay === true
    );

    this.initPreload();
    this.initListeners();
    this.initUnlockListener();
  }

  getAbilityMap() {
    return configManager.get("abilityGiftMap") || GIFT_ABILITY_MAP;
  }

  getAbilities() {
    return configManager.get("abilities") || ABILITY_REGISTRY;
  }

  getFreezeConfig() {
    return configManager.get("battleEffects.freeze") || {};
  }

  setEnabled(status) {
    this.enabled = !!status;
    eventBus.emit("audio:settings_changed", { enabled: this.enabled, volume: this.volume });
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, Number(val) || 0.6));
    eventBus.emit("audio:settings_changed", { enabled: this.enabled, volume: this.volume });
  }

  initPreload() {
    if (typeof window === "undefined") return;
    const paths = new Set();
    const currentAbilities = this.getAbilities();
    Object.values(currentAbilities).forEach(ability => {
      if (ability.sound) paths.add(ability.sound);
    });
    this.getAbilityMap().forEach(m => {
      if (m.sound) paths.add(m.sound);
    });
    const giftSoundsConfig = configManager.get("giftSounds") || [];
    giftSoundsConfig.forEach(gs => {
      if (gs.sound) paths.add(gs.sound);
    });
    const freezeSound = this.getFreezeConfig().sound;
    if (freezeSound) paths.add(freezeSound);

    paths.forEach(soundPath => {
      try {
        const audio = new Audio(soundPath);
        audio.preload = "auto";
        this.audioCache.set(soundPath, audio);
      } catch (e) {
        console.warn("[AUDIO] Failed to preload sound:", soundPath, e);
      }
    });
  }

  initUnlockListener() {
    if (typeof window === "undefined") return;

    const unlockHandler = () => {
      if (this.unlocked) return;
      try {
        const silentAudio = new Audio();
        silentAudio.volume = 0;
        const playPromise = silentAudio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.unlocked = true;
              console.log("[AUDIO] Audio unlocked successfully");
              cleanup();
            })
            .catch((err) => console.warn("[AUDIO] Unlock deferred:", err?.message || err));
        } else {
          this.unlocked = true;
          cleanup();
        }
      } catch (e) {
        console.warn("[AUDIO] Unlock exception:", e);
      }
    };

    const cleanup = () => {
      window.removeEventListener("pointerdown", unlockHandler);
      window.removeEventListener("click", unlockHandler);
      window.removeEventListener("touchstart", unlockHandler);
      window.removeEventListener("keydown", unlockHandler);
    };

    window.addEventListener("pointerdown", unlockHandler, { once: true });
    window.addEventListener("click", unlockHandler, { once: true });
    window.addEventListener("touchstart", unlockHandler, { once: true });
    window.addEventListener("keydown", unlockHandler, { once: true });
  }

  previewSound(soundPath) {
    if (!soundPath || !this.enabled) return;

    try {
      let audio = this.audioCache.get(soundPath);
      if (!audio) {
        audio = new Audio(soundPath);
        audio.preload = "auto";
        this.audioCache.set(soundPath, audio);
      }
      audio.currentTime = 0;
      audio.volume = this.volume;
      audio.muted = false;
      const promise = audio.play();
      if (promise !== undefined) {
        promise.catch(() => {
          const freshAudio = new Audio(soundPath);
          freshAudio.volume = this.volume;
          freshAudio.muted = false;
          freshAudio.play().catch(() => {});
        });
      }
    } catch (e) {
      console.warn("[AUDIO PREVIEW] Exception:", e);
    }
  }

  playSound(soundPath, item) {
    if (!this.enabled || !soundPath) return;

    const isAdminPreview = item?.source === "ADMIN_PREVIEW" || item?.sender === "ADMIN_PREVIEW";
    if (isAdminPreview) {
      if (this.isOverlayContext) return;
    } else if (!this.isOverlayContext) {
      return;
    }

    try {
      let audio = this.audioCache.get(soundPath);
      if (audio) {
        audio.currentTime = 0;
        audio.volume = this.volume;
        audio.muted = false;
        const promise = audio.play();
        if (promise !== undefined) promise.catch(() => this.playFresh(soundPath));
      } else {
        this.playFresh(soundPath);
      }
    } catch (e) {
      console.warn("[AUDIO] Playback exception:", soundPath, e);
    }
  }

  playFresh(soundPath) {
    try {
      const audio = new Audio(soundPath);
      audio.volume = this.volume;
      audio.muted = false;
      const promise = audio.play();
      if (promise !== undefined) promise.catch(err => console.warn("[AUDIO] Fresh playback failed:", err));
    } catch (e) {
      console.warn("[AUDIO] Fresh playback exception:", e);
    }
  }

  findAbilityMapping(rawGiftName) {
    const q = String(rawGiftName || "").trim().toLowerCase();
    if (!q) return null;
    return this.getAbilityMap().find(m => {
      const mId = String(m.giftId ?? "").trim().toLowerCase();
      const mName = String(m.giftName ?? "").trim().toLowerCase();
      return mId === q || mName === q || (m.aliases || []).some(a => String(a ?? "").trim().toLowerCase() === q);
    }) || null;
  }

  initListeners() {
    eventBus.subscribe("normalized:gift", (giftEvent) => {
      if (!this.enabled || !giftEvent) return;
      const giftName = String(giftEvent.giftId || giftEvent.giftName || giftEvent.canonicalGiftId || "").trim();
      const mapping = this.findAbilityMapping(giftName);

      // Ability gifts are handled exclusively by ability:started so their sound
      // comes from the persisted Ability Manager configuration.
      if (mapping) return;

      const giftSoundsConfig = configManager.get("giftSounds") || [];
      const match = giftSoundsConfig.find(gs =>
        gs.enabled !== false &&
        (String(gs.giftName ?? "").trim().toLowerCase() === giftName.toLowerCase() ||
         String(gs.giftId ?? "").trim().toLowerCase() === giftName.toLowerCase())
      );

      if (match?.sound) {
        this.playSound(match.sound, { source: "GIFT_SOUND", giftName });
        this._lastPlayedGiftSound = { giftName: giftName.toLowerCase(), time: Date.now() };
      }
    });

    eventBus.subscribe("ability:started", (item) => {
      if (!this.enabled) return;
      const rawGiftName = String(item.sourceGift || item.giftName || item.canonicalGiftId || "").trim();
      const mapping = this.findAbilityMapping(rawGiftName);
      const abilityId = mapping ? mapping.abilityId : item.abilityId;
      const abilityEntry = this.getAbilities()[abilityId];
      const registryEntry = ABILITY_REGISTRY[abilityId];
      const soundPath = abilityEntry?.sound || registryEntry?.sound || mapping?.sound;

      if (soundPath) {
        console.log("[AUDIO] Playing authoritative Ability Manager sound:", abilityId, soundPath);
        this.playSound(soundPath, item);
      }
    });

    // Freeze is intentionally separate from the Ability sound path. Its sound
    // is read only from battleEffects.freeze, so changing an Ability sound can
    // never silently replace the Freeze sound.
    eventBus.subscribe("freeze:activated", (payload) => {
      if (!this.enabled) return;
      const freezeConfig = this.getFreezeConfig();
      const soundPath = payload?.sound !== undefined ? payload.sound : freezeConfig.sound;
      if (soundPath) this.playSound(soundPath, { ...payload, source: "FREEZE" });
    });
  }
}

export const audioManager = new AudioManager();
