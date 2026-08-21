import { dashboardAPI } from "./core/dashboardAPI";
import { eventBus } from "./core/eventBus";

const WS_URL = "ws://127.0.0.1:8080";
const pathName = typeof window !== "undefined" ? window.location.pathname : "";
const isDashboard = pathName === "/" || pathName === "";
const isOverlay = pathName === "/overlay";

if (typeof window !== "undefined" && (isDashboard || isOverlay)) {
  let socket = null;
  let reconnectTimer = null;
  let unsubscribeDashboard = null;
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
      if (snapshot.gameMode) {
        window.localStorage.setItem("cocoloco_game_mode", String(snapshot.gameMode));
      }
      if (snapshot.commandConfig && typeof snapshot.commandConfig === "object") {
        window.localStorage.setItem("cocoloco_command_config_v3", JSON.stringify(snapshot.commandConfig));
        eventBus.emit("config:command_updated", {
          config: snapshot.commandConfig,
          timestamp: Date.now(),
          source: "overlay-sync-transport"
        }, true);
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

  const connect = () => {
    try {
      socket = new WebSocket(WS_URL);
    } catch (error) {
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      socket.send(JSON.stringify({
        action: "registerOverlaySync",
        role: isDashboard ? "dashboard" : "overlay"
      }));

      if (isDashboard) {
        if (!unsubscribeDashboard) {
          unsubscribeDashboard = dashboardAPI.subscribe((snapshot) => publishSnapshot(snapshot));
        }
        publishSnapshot(dashboardAPI.getLiveDashboard());
      } else if (isOverlay) {
        socket.send(JSON.stringify({ action: "getOverlaySnapshot" }));
      }
    };

    socket.onmessage = (event) => {
      if (!isOverlay) return;
      try {
        const message = JSON.parse(event.data);
        if (message?.type === "COCO_OVERLAY_SNAPSHOT" && message.snapshot) {
          applyOverlaySnapshot(message.snapshot);
        }
      } catch (_) {}
    };

    socket.onclose = () => scheduleReconnect();
    socket.onerror = () => {
      try { socket.close(); } catch (_) {}
    };
  };

  connect();

  window.addEventListener("beforeunload", () => {
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    unsubscribeDashboard?.();
    try { socket?.close(); } catch (_) {}
  });
}
