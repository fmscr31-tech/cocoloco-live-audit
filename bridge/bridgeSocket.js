import http from "http";
import { WebSocketServer } from "ws";
import { logger } from "./logger.js";
import { tiktokBridge } from "./tiktokBridge.js";

/**
 * Bridge WebSocket & Webhook Server: Professional server supporting HTTP webhooks (Tikfinity),
 * WebSocket clients, heartbeat (ping/pong), broadcast, and automatic cleanup.
 */
class BridgeSocketServer {
  constructor(port = 8080) {
    this.port = port;
    this.server = null;
    this.wss = null;
    this.clients = new Set();
    this.heartbeatTimer = null;
  }

  start(intervalMs = 30000) {
    // 1. Create HTTP Server for Webhooks (Tikfinity) and WebSocket upgrade
    this.server = http.createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === "POST" && (req.url === "/webhook" || req.url === "/api/webhook" || req.url === "/")) {
        let body = "";
        req.on("data", chunk => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body || "{}");
            logger.connect(`[Tikfinity Webhook] Received payload: ${JSON.stringify(payload)}`);

            // Broadcast structured event to connected CocoLoco frontend clients
            const eventMessage = {
              type: "event",
              source: "tikfinity",
              payload: payload
            };

            this.broadcast(eventMessage);

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, message: "Tikfinity event received and broadcasted" }));
          } catch (err) {
            logger.error(`[Tikfinity Webhook] Invalid JSON: ${err.message}`);
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: "Invalid JSON payload" }));
          }
        });
      } else if (req.method === "GET" && (req.url === "/health" || req.url === "/status")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ONLINE", clients: this.clients.size, tiktokStatus: tiktokBridge.getStatus() }));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Endpoint not found" }));
      }
    });

    // 2. Attach WebSocket Server to HTTP Server
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on("connection", (ws) => {
      this.clients.add(ws);
      logger.connect(`WebSocket client connected. Total clients: ${this.clients.size}`);

      ws.isAlive = true;
      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message);
          if (data.action === "getStatus") {
            ws.send(JSON.stringify({ type: "STATUS", clientsCount: this.clients.size, username: tiktokBridge.getStatus().username, status: tiktokBridge.getStatus().status }));
          } else if (data.action === "setUniqueId" && data.uniqueId) {
            logger.connect(`Received setUniqueId request for username: ${data.uniqueId}`);
            tiktokBridge.setUsername(data.uniqueId);
            tiktokBridge.reconnect().catch(err => {
              logger.error(`Error reconnecting with new uniqueId: ${err.message}`, err);
            });
            ws.send(JSON.stringify({ type: "STATUS", clientsCount: this.clients.size, username: data.uniqueId, status: tiktokBridge.getStatus().status }));
          }
        } catch (e) {
          // ignore non-json messages
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
        logger.disconnect(`WebSocket client disconnected. Remaining clients: ${this.clients.size}`);
      });

      ws.on("error", (err) => {
        logger.error(`WebSocket client error: ${err.message}`, err);
      });
    });

    // Heartbeat check
    this.heartbeatTimer = setInterval(() => {
      this.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          this.clients.delete(ws);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, intervalMs);

    // 3. Start listening on port
    this.server.listen(this.port, () => {
      logger.connect(`Bridge HTTP Webhook & WebSocket Server running on port ${this.port}`);
    });
  }

  broadcast(data) {
    const payload = JSON.stringify(data);
    logger.connect(`[Tikfinity OUTGOING TO FRONTEND] ${payload}`);
    this.clients.forEach((client) => {
      if (client.readyState === 1) { // OPEN
        client.send(payload);
      }
    });
  }

  stop() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    if (this.wss) {
      this.wss.close(() => {
        logger.disconnect("WebSocket Server closed.");
      });
    }
    if (this.server) {
      this.server.close(() => {
        logger.disconnect("Bridge HTTP Server closed.");
      });
    }
  }
}

export const bridgeSocket = new BridgeSocketServer();
