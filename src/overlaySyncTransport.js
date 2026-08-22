import { dashboardAPI } from "./core/dashboardAPI";
import { eventBus } from "./core/eventBus";

// Dedicated overlay channel on 8090. Visual snapshots and live gift events
// travel here; TikFinity/TikTok remains isolated on port 8080.
const WS_URL = "ws://127.0.0.1:8090";
const pathName = typeof window !== "undefined" ? window.location.pathname : "";
const isDashboard = pathName === "/" || pathName === "";
const isOverlay = pathName === "/overlay";

if (typeof window !== "undefined" && (isDashboard || isOverlay)) {
  let socket = null;
  let reconnectTimer = null;
  let unsubscribeDashboard = null;
  let unsubscribeGiftRelay = null;
  let lastSignature = "";

  const scheduleReconnect = () => {
    if (reconnectTimer) return;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 1200);
  };

  const applyOverlaySnapshot = (snapshot) => {
    if (!snapshot || typeof snapshot !== "object") return;
    try {
      if (snapshot.gameMode) window.localStorage.setItem("cocoloco_game_mode", String(snapshot.gameMode));
      if (snapshot.commandConfig && typeof snapshot.commandConfig === "object") {
        window.localStorage.setItem("cocoloco_command_config_v3", JSON.stringify(snapshot.commandConfig));
        eventBus.emit("config:command_updated", { config: snapshot.commandConfig, timestamp: Date.now(), source: "overlay-sync-transport" }, true);
      }
    } catch (error) {
      console.warn("[OverlaySync] Could not mirror visual configuration:", error);
    }
    eventBus.emit("dashboard:snapshot", snapshot, true);
  };

  const publishSnapshot = (snapshot) => {
    if (!isDashboard || !socket || socket.readyState !== WebSocket.OPEN || !snapshot) return;
    try {
      const signature = JSON.stringify(snapshot);
      if (signature === lastSignature) return;
      lastSignature = signature;
      socket.send(JSON.stringify({ action: "publishOverlaySnapshot", snapshot }));
    } catch (error) {
      console.warn("[OverlaySync] Could not publish dashboard snapshot:", error);
    }
  };

  const publishLiveEvent = (eventName, payload) => {
    if (!isDashboard || !socket || socket.readyState !== WebSocket.OPEN || !payload) return;
    try {
      socket.send(JSON.stringify({ action: "publishOverlayEvent", eventName, payload }));
    } catch (error) {
      console.warn(`[OverlaySync] Could not publish ${eventName}:`, error);
    }
  };

  const connect = () => {
    try { socket = new WebSocket(WS_URL); }
    catch (_) { scheduleReconnect(); return; }

    socket.onopen = () => {
      socket.send(JSON.stringify({ action: "registerOverlaySync", role: isDashboard ? "dashboard" : "overlay" }));
      if (isDashboard) {
        if (!unsubscribeDashboard) unsubscribeDashboard = dashboardAPI.subscribe((snapshot) => publishSnapshot(snapshot));
        if (!unsubscribeGiftRelay) {
          unsubscribeGiftRelay = eventBus.subscribe("normalized:gift", (gift) => publishLiveEvent("normalized:gift", gift));
        }
        publishSnapshot(dashboardAPI.getLiveDashboard());
      } else {
        socket.send(JSON.stringify({ action: "getOverlaySnapshot" }));
      }
    };

    socket.onmessage = (event) => {
      if (!isOverlay) return;
      try {
        const message = JSON.parse(event.data);
        if (message?.type === "COCO_OVERLAY_SNAPSHOT" && message.snapshot) {
          applyOverlaySnapshot(message.snapshot);
          return;
        }
        if (message?.type === "COCO_OVERLAY_EVENT" && message.eventName === "normalized:gift" && message.payload) {
          console.log("[OverlaySync] Live gift received", message.payload);
          eventBus.publish("normalized:gift", { ...message.payload, source: message.payload.source || "overlay-sync" }, true);
        }
      } catch (error) {
        console.warn("[OverlaySync] Could not consume overlay message:", error);
      }
    };
    socket.onclose = () => scheduleReconnect();
    socket.onerror = () => { try { socket.close(); } catch (_) {} };
  };

  connect();
  window.addEventListener("beforeunload", () => {
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    unsubscribeDashboard?.();
    unsubscribeGiftRelay?.();
    try { socket?.close(); } catch (_) {}
  });
}
