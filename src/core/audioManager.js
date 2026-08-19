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
    this.playedAbilityExecutions = new Map();
    this.recentAbilitySounds = new Map();
    this.audioClaimKey = "cocoloco_ability_audio_claim_v1";
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

  getAbilityMap() { return configManager.get("abilityGiftMap") || GIFT_ABILITY_MAP; }
  getAbilities() { return configManager.get("abilities") || ABILITY_REGISTRY; }
  getFreezeConfig() { return configManager.get("battleEffects.freeze") || {}; }

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
    Object.values(this.getAbilities()).forEach(a => { if (a.sound) paths.add(a.sound); });
    Object.values(ABILITY_REGISTRY).forEach(a => { if (a.sound) paths.add(a.sound); });
    this.getAbilityMap().forEach(m => { if (m.sound) paths.add(m.sound); });
    (configManager.get("giftSounds") || []).forEach(g => { if (g.sound) paths.add(g.sound); });
    const freezeSound = this.getFreezeConfig().sound;
    if (freezeSound) paths.add(freezeSound);
    paths.forEach(path => {
      try {
        const audio = new Audio(path);
        audio.preload = "auto";
        this.audioCache.set(path, audio);
      } catch (e) {
        console.warn("[AUDIO] preload failed", path, e);
      }
    });
  }

  initUnlockListener() {
    if (typeof window === "undefined") return;
    const unlock = () => {
      if (this.unlocked) return;
      try {
        const audio = new Audio();
        audio.volume = 0;
        const p = audio.play();
        if (p?.then) p.then(() => { this.unlocked = true; cleanup(); }).catch(() => {});
        else { this.unlocked = true; cleanup(); }
      } catch (_) {}
    };
    const cleanup = () => ["pointerdown", "click", "touchstart", "keydown"].forEach(e => window.removeEventListener(e, unlock));
    ["pointerdown", "click", "touchstart", "keydown"].forEach(e => window.addEventListener(e, unlock, { once: true }));
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
      audio.play().catch(err => console.warn("[AUDIO PREVIEW] playback failed", soundPath, err));
    } catch (e) {
      console.warn("[AUDIO PREVIEW] exception", soundPath, e);
    }
  }

  playSound(soundPath, item = {}) {
    if (!this.enabled || !soundPath) return false;
    const isAdminPreview = item?.source === "ADMIN_PREVIEW" || item?.sender === "ADMIN_PREVIEW";
    const isCocazoOverlay = item?.source === "COCAZO";
    if (isAdminPreview ? this.isOverlayContext : (!this.isOverlayContext && !isCocazoOverlay)) return false;
    try {
      let audio = this.audioCache.get(soundPath);
      if (!audio) {
        audio = new Audio(soundPath);
        audio.preload = "auto";
        this.audioCache.set(soundPath, audio);
      }
      audio.volume = this.volume;
      audio.muted = false;
      audio.currentTime = 0;
      const promise = audio.play();
      if (promise?.catch) {
        promise.catch(err => console.warn("[AUDIO] playback rejected", soundPath, err?.name || err?.message || err));
      }
      return true;
    } catch (e) {
      console.warn("[AUDIO] playback exception", soundPath, e);
      return false;
    }
  }

  findAbilityMapping(value) {
    const q = String(value ?? "").trim().toLowerCase();
    if (!q) return null;
    return this.getAbilityMap().find(m =>
      String(m.giftId ?? "").trim().toLowerCase() === q ||
      String(m.giftName ?? "").trim().toLowerCase() === q ||
      (m.aliases || []).some(a => String(a ?? "").trim().toLowerCase() === q)
    ) || null;
  }

  findGiftAbilityMapping(event = {}) {
    const candidates = [
      event.canonicalGiftId,
      event.giftId,
      event.giftName,
      event.sourceGift,
      event.name,
      event.gift?.giftId,
      event.gift?.giftName
    ];
    for (const value of candidates) {
      const mapping = this.findAbilityMapping(value);
      if (mapping) return mapping;
    }
    return null;
  }

  hasPlayedAbilityExecution(id) {
    if (!id) return false;
    const now = Date.now();
    for (const [key, time] of this.playedAbilityExecutions) {
      if (now - time > 30000) this.playedAbilityExecutions.delete(key);
    }
    if (this.playedAbilityExecutions.has(id)) return true;
    this.playedAbilityExecutions.set(id, now);
    return false;
  }

  claimCrossWindowAudio(key) {
    if (typeof window === "undefined" || !key) return true;
    const now = Date.now();
    const leaseMs = 1800;
    try {
      const raw = window.localStorage.getItem(this.audioClaimKey);
      if (raw) {
        const current = JSON.parse(raw);
        if (current && current.key === key && now - Number(current.time) < leaseMs) return false;
      }
      const claim = { key, time: now, owner: `${Date.now()}_${Math.random().toString(36).slice(2)}` };
      window.localStorage.setItem(this.audioClaimKey, JSON.stringify(claim));
      const verify = JSON.parse(window.localStorage.getItem(this.audioClaimKey) || "null");
      return verify?.owner === claim.owner;
    } catch (_) {
      return true;
    }
  }

  initListeners() {
    // Dynamic gifts NEVER play audio from normalized:gift. Their authoritative
    // audio event is ability:started, preventing early + late double playback.
    eventBus.subscribe("normalized:gift", giftEvent => {
      if (!this.enabled || !giftEvent) return;
      if (this.findGiftAbilityMapping(giftEvent)) return;
      const giftName = String(giftEvent.canonicalGiftId || giftEvent.giftName || giftEvent.giftId || "").trim().toLowerCase();
      const match = (configManager.get("giftSounds") || []).find(gs => gs.enabled !== false &&
        (String(gs.giftName ?? "").trim().toLowerCase() === giftName || String(gs.giftId ?? "").trim().toLowerCase() === giftName));
      if (match?.sound) this.playSound(match.sound, { source: "GIFT_SOUND", giftName });
    });

    eventBus.subscribe("ability:started", (item, isRemote) => {
      if (!this.enabled || !item) return;

      // CRITICAL LIVE FIX:
      // The Admin window receives the local ability:started event first. It is
      // not an audio-rendering context, so it MUST NOT claim the cross-window
      // audio lease. Previously the Admin claimed it and then playSound()
      // returned because the Admin is not /overlay; the real overlay subsequently
      // saw the same execution and was suppressed. Result: no sound LIVE.
      // Only the actual overlay is allowed to claim and play authoritative audio.
      if (!this.isOverlayContext) return;

      const executionId = String(item.executionId || "").trim();
      if (executionId && this.hasPlayedAbilityExecution(executionId)) return;

      const mapping = this.findGiftAbilityMapping(item);
      const abilityId = mapping?.abilityId || item.abilityId;
      const ability = this.getAbilities()[abilityId];
      const registry = ABILITY_REGISTRY[abilityId];
      const soundPath = item.sound || ability?.sound || registry?.sound || mapping?.sound;
      if (!soundPath) {
        console.warn("[AUDIO] No sound configured for ability", abilityId, item);
        return;
      }

      const audioKey = executionId || `${abilityId}|${soundPath}|${String(item.playerId || item.userId || item.username || item.sender || "")}`;
      if (this.recentAbilitySounds.has(audioKey)) return;
      this.recentAbilitySounds.set(audioKey, Date.now());
      for (const [key, time] of this.recentAbilitySounds) {
        if (Date.now() - time > 5000) this.recentAbilitySounds.delete(key);
      }

      // Only one browser window is allowed to become the audio owner for an
      // execution. This prevents BroadcastChannel + storage from sounding twice.
      if (!this.claimCrossWindowAudio(audioKey)) return;

      console.log("[AUDIO] ability sound", abilityId, isRemote ? "remote" : "local", executionId || "no-id", soundPath);
      this.playSound(soundPath, item);
    });
  }
}

export const audioManager = new AudioManager();
