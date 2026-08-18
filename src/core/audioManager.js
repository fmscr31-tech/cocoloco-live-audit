import { eventBus } from "./eventBus";
import { GIFT_ABILITY_MAP } from "../config/giftAbilityMap";
import { ABILITY_REGISTRY } from "../config/abilityRegistry";
import { configManager } from "./configManager";

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
      window.location.pathname.includes("contexto") ||
      window.location.pathname.includes("/play/") ||
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
    Object.values(this.getAbilities()).forEach(ability => {
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

  playSound(soundPath, item = {}) {
    if (!this.enabled || !soundPath) return;

    const isAdminPreview = item?.source === "ADMIN_PREVIEW" || item?.sender === "ADMIN_PREVIEW";
    const isCocazoOverlay = item?.source === "COCAZO";

    if (isAdminPreview) {
      if (this.isOverlayContext) return;
    } else if (!this.isOverlayContext && !isCocazoOverlay) {
      return;
    }

    try {
      let audio = this.audioCache.get(soundPath);
      if (audio) {
        audio.currentTime = 0;
        audio.volume = this.volume;
        audio.muted = false;
        const promise = audio.play();
        if (promise !== undefined) {
          promise.then(() => {
            console.log("[AUDIO PLAYING]", soundPath, item?.abilityId || item?.source || "gift");
          }).catch(() => this.playFresh(soundPath, item));
        }
      } else {
        this.playFresh(soundPath, item);
      }
    } catch (e) {
      console.warn("[AUDIO] Playback exception:", soundPath, e);
    }
  }

  playFresh(soundPath, item = {}) {
    try {
      const audio = new Audio(soundPath);
      audio.preload = "auto";
      audio.volume = this.volume;
      audio.muted = false;
      const promise = audio.play();
      if (promise !== undefined) {
        promise.then(() => {
          console.log("[AUDIO PLAYING FRESH]", soundPath, item?.abilityId || item?.source || "gift");
        }).catch(err => console.warn("[AUDIO] Fresh playback failed:", soundPath, err));
      }
    } catch (e) {
      console.warn("[AUDIO] Fresh playback exception:", soundPath, e);
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
      const giftName = String(giftEvent.canonicalGiftId || giftEvent.giftName || giftEvent.giftId || "").trim();
      const mapping = this.findAbilityMapping(giftName);
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

    // SINGLE AUTHORITATIVE GIFT-ABILITY AUDIO PATH.
    // Every mapped dynamic gift plays its configured sound exactly once here,
    // when the queued ability actually starts. Do not play the same sound from
    // battle-effect events or overlay components.
    eventBus.subscribe("ability:started", (item) => {
      if (!this.enabled) return;
      const rawGiftName = String(item.sourceGift || item.giftName || item.canonicalGiftId || "").trim();
      const mapping = this.findAbilityMapping(rawGiftName);
      const abilityId = mapping ? mapping.abilityId : item.abilityId;
      const abilityEntry = this.getAbilities()[abilityId];
      const registryEntry = ABILITY_REGISTRY[abilityId];
      const soundPath = item.sound || abilityEntry?.sound || registryEntry?.sound || mapping?.sound;

      if (soundPath) {
        console.log("[AUDIO] Playing authoritative Ability Manager sound:", abilityId, soundPath);
        this.playSound(soundPath, item);
      }
    });

    // IMPORTANT: battle-effect events are STATE notifications, not audio
    // triggers. Freeze already plays its authoritative sound from
    // ability:started. Replaying it from effect:activated caused duplicate
    // audio in the Teams overlay.
  }
}

export const audioManager = new AudioManager();
