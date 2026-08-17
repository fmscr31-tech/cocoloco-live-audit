import { eventBus } from "./eventBus";

/**
 * WIN LIMPIA watchdog.
 * Contexto can replace GameManager.endRound after the first bridge install.
 * This watchdog reinstalls the authoritative WIN signal wrapper whenever the
 * live function changes, without parsing chat or guessing the winning word.
 */
class WinBridgeWatchdog {
  constructor() {
    this.timer = null;
    this.install = this.install.bind(this);
    this.start();
  }

  start() {
    if (typeof window === "undefined") return;
    this.install();
    this.timer = window.setInterval(this.install, 500);
  }

  stop() {
    if (this.timer && typeof window !== "undefined") window.clearInterval(this.timer);
    this.timer = null;
  }

  findGameManagerWindow(root = window, visited = new Set()) {
    if (typeof window === "undefined" || !root || visited.has(root)) return null;
    visited.add(root);
    try {
      if (root.GameManager && typeof root.GameManager.endRound === "function") return root;
    } catch {}

    const candidates = [];
    try { if (root.parent && root.parent !== root) candidates.push(root.parent); } catch {}
    try { if (root.opener && root.opener !== root) candidates.push(root.opener); } catch {}
    try {
      for (let i = 0; i < root.frames.length; i += 1) {
        try { candidates.push(root.frames[i]); } catch {}
      }
    } catch {}

    for (const candidate of candidates) {
      const found = this.findGameManagerWindow(candidate, visited);
      if (found) return found;
    }
    return null;
  }

  install() {
    const targetWindow = this.findGameManagerWindow();
    const gameManager = targetWindow?.GameManager;
    if (!gameManager || typeof gameManager.endRound !== "function") return;

    const current = gameManager.endRound;
    if (current.__COCOLOCO_WIN_WATCHDOG_WRAPPER__) return;

    const original = current;
    const wrapper = function(result, winners = [], answer = "") {
      const normalizedResult = String(result || "").trim().toLowerCase();
      if (normalizedResult === "win" && !window.__COCOLOCO_LAST_WIN_SIGNAL__) {
        const winner = Array.isArray(winners) ? winners[0] : winners;
        if (winner && typeof winner === "object") {
          const payload = {
            type: "WIN_LIMPIA",
            winLimpia: true,
            playerId: winner.playerId || winner.userId || winner.tiktokId || winner.uniqueId || winner.id || "",
            userId: winner.userId || winner.playerId || winner.tiktokId || winner.uniqueId || winner.id || "",
            username: winner.username || winner.uniqueId || "",
            displayName: winner.displayName || winner.name || winner.nickname || winner.username || winner.uniqueId || "Jugador",
            avatar: winner.avatar || winner.photoUrl || winner.profilePictureUrl || winner.photo || "",
            source: "CONTEXTO_GAME_MANAGER_WATCHDOG",
            answer: answer || "",
            timestamp: Date.now()
          };

          window.__COCOLOCO_LAST_WIN_SIGNAL__ = true;
          console.log("[WIN LIMPIA WATCHDOG SIGNAL]", payload);
          eventBus.publish("win:detected", payload);
          window.setTimeout(() => { window.__COCOLOCO_LAST_WIN_SIGNAL__ = false; }, 1000);
        }
      }
      return original.apply(this, arguments);
    };

    Object.defineProperty(wrapper, "__COCOLOCO_WIN_WATCHDOG_WRAPPER__", { value: true });
    Object.defineProperty(gameManager, "endRound", { value: wrapper, writable: true, configurable: true });
    console.log("[WIN LIMPIA WATCHDOG INSTALLED]", { target: targetWindow === window ? "same-window" : "nested-window" });
  }
}

export const winBridgeWatchdog = new WinBridgeWatchdog();
