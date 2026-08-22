import { WebSocketServer, WebSocket } from "ws";

const PORT = 8090;
const wss = new WebSocketServer({ port: PORT });
let latestSnapshot = null;

function sendSnapshot(ws) {
  if (!latestSnapshot || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "COCO_OVERLAY_SNAPSHOT", snapshot: latestSnapshot, timestamp: Date.now() }));
}

function broadcastOverlayEvent(source, eventName, payload) {
  if (!eventName || !payload) return;
  const packet = JSON.stringify({
    type: "COCO_OVERLAY_EVENT",
    eventName,
    payload,
    timestamp: Date.now()
  });

  for (const client of wss.clients) {
    if (client !== source && client.role === "overlay" && client.readyState === WebSocket.OPEN) {
      client.send(packet);
    }
  }
}

wss.on("connection", (ws) => {
  ws.role = "unknown";

  ws.on("message", (raw) => {
    try {
      const message = JSON.parse(String(raw));
      if (message.action === "registerOverlaySync") {
        ws.role = message.role === "dashboard" ? "dashboard" : "overlay";
        if (ws.role === "overlay") sendSnapshot(ws);
        return;
      }

      if (message.action === "getOverlaySnapshot") {
        sendSnapshot(ws);
        return;
      }

      if (message.action === "publishOverlaySnapshot" && ws.role === "dashboard" && message.snapshot && typeof message.snapshot === "object") {
        latestSnapshot = message.snapshot;
        for (const client of wss.clients) {
          if (client !== ws && client.role === "overlay") sendSnapshot(client);
        }
        return;
      }

      if (message.action === "publishOverlayEvent" && ws.role === "dashboard") {
        broadcastOverlayEvent(ws, message.eventName, message.payload);
      }
    } catch (_) {
      // This server accepts only its small JSON protocol. Ignore anything else.
    }
  });
});

wss.on("listening", () => {
  console.log(`[OverlaySync] Overlay sync listening on ws://127.0.0.1:${PORT}`);
});

wss.on("error", (error) => {
  console.error(`[OverlaySync] ${error.message}`);
});
