import { eventBus } from "./eventBus";
import { GIFT_ABILITY_MAP } from "../config/giftAbilityMap";
import { ABILITY_REGISTRY } from "../config/abilityRegistry";
import { configManager } from "./configManager";

/**
 * Audio Manager v5 (Production Ready with Preview & Independent Gift Sound Support)
 * Manages native local audio playback as an isolated, complementary layer
 * for gifts and abilities, supporting preloading, audio pooling, unlock handling,
 * independent gift sounds, priority resolution (no double play), and context isolation.
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
    const currentAbilities = (typeof configManager !== "undefined" && configManager.get("abilities")) || ABILITY_REGISTRY;
    Object.values(currentAbilities).forEach(ability => {
      if (ability.sound) paths.add(ability.sound);
    });
    GIFT_ABILITY_MAP.forEach(m => {
      if (m.sound) paths.add(m.sound);
    });
    const giftSoundsConfig = (typeof configManager !== "undefined" && configManager.get("giftSounds")) || [];
    giftSoundsConfig.forEach(gs => {
      if (gs.sound) paths.add(gs.sound);
    });

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
      console.log("[AUDIO] Audio unlock attempt via user interaction");
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
            .catch((err) => {
              console.warn("[AUDIO] Unlock deferred:", err?.message || err);
            });
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
    if (!soundPath) return;
    if (!this.enabled) return;

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
        promise
          .then(() => {
            console.log("[AUDIO PREVIEW] PLAY SUCCESS");
          })
          .catch((err) => {
            console.warn("[AUDIO PREVIEW] Playback failed:", soundPath, err?.message || err);
            const freshAudio = new Audio(soundPath);
            freshAudio.volume = this.volume;
            freshAudio.muted = false;
            freshAudio.play()
              .then(() => {
                console.log("[AUDIO PREVIEW] PLAY SUCCESS");
              })
              .catch(e => {
                console.warn("[AUDIO PREVIEW] Fresh playback failed:", e);
              });
          });
      } else {
        console.log("[AUDIO PREVIEW] PLAY SUCCESS");
      }
    } catch (e) {
      console.warn("[AUDIO PREVIEW] Exception:", e);
    }
  }

  playSound(soundPath, item) {
    console.log("[AUDIO DEBUG] ACTION RECEIVED", item);
    console.log("[AUDIO DEBUG] SOUND PATH", soundPath);

    if (!this.enabled || !soundPath) return;

    const isAdminPreview = item?.source === "ADMIN_PREVIEW" || item?.sender === "ADMIN_PREVIEW";

    if (isAdminPreview) {
      if (this.isOverlayContext) {
        return;
      }
    } else {
      if (!this.isOverlayContext) {
        return;
      }
    }

    try {
      console.log("[AUDIO DEBUG] AUDIO OBJECT CREATED", soundPath);
      let audio = this.audioCache.get(soundPath);
      if (audio) {
        audio.currentTime = 0;
        audio.volume = this.volume;
        audio.muted = false;
        console.log("[AUDIO DEBUG] PLAY REQUESTED", soundPath);
        const promise = audio.play();
        if (promise !== undefined) {
          promise
            .then(() => {
              console.log("[AUDIO DEBUG] PLAY RESOLVED", soundPath);
            })
            .catch(err => {
              console.warn("[AUDIO DEBUG] PLAY FAILED", soundPath, err?.name, err?.message || err);
              this.playFresh(soundPath);
            });
        } else {
          console.log("[AUDIO DEBUG] PLAY RESOLVED (sync)", soundPath);
        }
      } else {
        this.playFresh(soundPath);
      }
    } catch (e) {
      console.warn("[AUDIO DEBUG] PLAY FAILED (exception)", soundPath, e?.name, e?.message || e);
    }
  }

  playFresh(soundPath) {
    try {
      console.log("[AUDIO DEBUG] AUDIO OBJECT CREATED (fresh)", soundPath);
      const audio = new Audio(soundPath);
      audio.volume = this.volume;
      audio.muted = false;
      console.log("[AUDIO DEBUG] PLAY REQUESTED (fresh)", soundPath);
      const promise = audio.play();
      if (promise !== undefined) {
        promise
          .then(() => {
            console.log("[AUDIO DEBUG] PLAY RESOLVED (fresh)", soundPath);
          })
          .catch(err => {
            console.warn("[AUDIO DEBUG] PLAY FAILED (fresh)", soundPath, err?.name, err?.message || err);
          });
      } else {
        console.log("[AUDIO DEBUG] PLAY RESOLVED (fresh sync)", soundPath);
      }
    } catch (e) {
      console.warn("[AUDIO DEBUG] PLAY FAILED (fresh exception)", soundPath, e?.name, e?.message || e);
    }
  }

  initListeners() {
    // 1. Listen to normalized:gift for independent gift sound configuration (Sound-only or overriding sound priority)
    eventBus.subscribe("normalized:gift", (giftEvent) => {
      if (!this.enabled || !giftEvent) return;
      const giftName = String(giftEvent.giftId || giftEvent.giftName || giftEvent.canonicalGiftId || "").trim();
      
      // If gift maps to an ability in GIFT_ABILITY_MAP, let ability:started handle the authoritative sound exclusively
      const hasAbility = GIFT_ABILITY_MAP.some(m => {
        const mId = String(m.giftId ?? "").trim().toLowerCase();
        const mName = String(m.giftName ?? "").trim().toLowerCase();
        const q = giftName.toLowerCase();
        return mId === q || mName === q || (m.aliases && m.aliases.some(a => String(a ?? "").trim().toLowerCase() === q));
      });
      if (hasAbility) {
        return; // Skip independent gift sound so authoritative Ability Manager sound plays cleanly
      }

      const giftSoundsConfig = configManager.get("giftSounds") || [];
      const match = giftSoundsConfig.find(gs =>
        gs.enabled !== false &&
        (String(gs.giftName ?? "").trim().toLowerCase() === giftName.toLowerCase() || String(gs.giftId ?? "").trim().toLowerCase() === giftName.toLowerCase())
      );

      if (match && match.sound) {
        console.log("[AUDIO] Playing independent gift sound for:", giftName, match.sound);
        this.playSound(match.sound, { source: "GIFT_SOUND", giftName });
        // Track last played gift sound to prevent duplicate ability sound playback if gift also has an ability
        this._lastPlayedGiftSound = { giftName: giftName.toLowerCase(), time: Date.now() };
      }
    });

    // 2. Listen to ability:started (with priority / deduplication against independent gift sound)
    eventBus.subscribe("ability:started", (item) => {
      if (!this.enabled) return;
      const rawGiftName = String(item.sourceGift || item.giftName || item.canonicalGiftId || "").trim();

      const mapping = GIFT_ABILITY_MAP.find(m => {
        const mId = String(m.giftId ?? "").trim().toLowerCase();
        const mName = String(m.giftName ?? "").trim().toLowerCase();
        const q = rawGiftName.toLowerCase();
        return mId === q || mName === q || (m.aliases && m.aliases.some(a => String(a ?? "").trim().toLowerCase() === q));
      });

      const abilityId = mapping ? mapping.abilityId : (item.abilityId || "silent_challenge");
      const currentAbilities = configManager.get("abilities") || ABILITY_REGISTRY;
      const abilityEntry = currentAbilities[abilityId];
      const registryEntry = ABILITY_REGISTRY[abilityId];

      const soundPath = (abilityEntry && abilityEntry.sound) || (registryEntry && registryEntry.sound) || (mapping && mapping.sound);
      if (soundPath) {
        console.log("[AUDIO] Playing sound for ability:", abilityId, soundPath, "Item:", item);
        this.playSound(soundPath, item);
      }
    });
  }
}

export const audioManager = new AudioManager();
