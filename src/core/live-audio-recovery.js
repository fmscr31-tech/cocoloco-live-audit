import { audioManager } from "./audioManager";

// LIVE recovery guard: the browser-source URL is not guaranteed to contain
// /overlay, so detect the actual rendered overlay and force audio authority.
let timer = null;

function sync() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const isOverlay = Boolean(
    document.querySelector(".gender-battle-overlay") ||
    document.querySelector(".hud-container") ||
    document.querySelector("[data-coco-overlay]") ||
    window.__cocoIsOverlay === true
  );
  if (isOverlay) {
    audioManager.isOverlayContext = true;
    window.__cocoIsOverlay = true;
  }
}

if (typeof window !== "undefined") {
  window.setTimeout(sync, 50);
  timer = window.setInterval(sync, 250);
}

export function stopLiveAudioRecovery() {
  if (timer && typeof window !== "undefined") window.clearInterval(timer);
  timer = null;
}
