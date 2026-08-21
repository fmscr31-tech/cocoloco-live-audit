import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { tiktokBridge } from "./tiktokBridge.js";
import { V2TikfinityClient } from "./v2TikfinityClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

class LiveTransportServerV2 {
  constructor(port = Number(process.env.V2_PORT) || 8081) {
    this.port = port;
    this.server = null;
    this.clients = new Set();
    this.nextId = 1;
    this.tikfinity = new V2TikfinityClient({
      url: process.env.TIKFINITY_WS_URL || config.tikfinityWsUrl,
      onEvent: (event) => this.broadcast(event)
    });
  }

  start() {
    this.server = http.createServer((req, res) => this.handle(req, res));
    this.server.listen(this.port, () => {
      logger.connect(`[V2] Live Studio transport listening on http://127.0.0.1:${this.port}`);
    });

    this.tikfinity.connect();
    tiktokBridge.setUsername(config.username);
    tiktokBridge.onEvent((event) => this.broadcast(event));
    tiktokBridge.connect().catch((error) => logger.error(`[V2] TikTok connection failed: ${error.message}`, error));
  }

  cors(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Last-Event-ID");
    res.setHeader("Cache-Control", "no-store");
  }

  handle(req, res) {
    this.cors(res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/api/live/events") {
      return this.openSse(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/live/events") {
      return this.receiveEvent(req, res);
    }

    if (req.method === "GET" && url.pathname === "/api/live/health") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({
        ok: true,
        transport: "sse",
        clients: this.clients.size,
        timestamp: Date.now()
      }));
    }

    return this.serveStatic(url.pathname, res);
  }

  openSse(req, res) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    });
    res.write(`retry: 1500\n\n`);

    const client = { id: this.nextId++, res };
    this.clients.add(client);
    this.send(client, "transport:connected", { transport: "sse", clientId: client.id });

    const heartbeat = setInterval(() => {
      if (!this.clients.has(client)) return clearInterval(heartbeat);
      try { res.write(`: heartbeat ${Date.now()}\n\n`); } catch { this.removeClient(client); }
    }, 15000);

    req.on("close", () => {
      clearInterval(heartbeat);
      this.removeClient(client);
    });
  }

  send(client, eventName, payload) {
    try {
      client.res.write(`event: ${eventName}\n`);
      client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {
      this.removeClient(client);
    }
  }

  broadcast(message) {
    if (!message || typeof message !== "object") return;
    const payload = { ...message, transportTimestamp: Date.now() };
    this.clients.forEach((client) => this.send(client, "cocoloco", payload));
  }

  receiveEvent(req, res) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1024 * 1024) req.destroy();
    });
    req.on("end", () => {
      try {
        const message = JSON.parse(body || "{}");
        if (!message.eventName) throw new Error("eventName is required");
        this.broadcast({
          kind: "eventBus",
          eventName: message.eventName,
          payload: message.payload,
          messageId: message.messageId,
          timestamp: message.timestamp || Date.now()
        });
        res.writeHead(202, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true }));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: error.message }));
      }
    });
  }

  serveStatic(urlPath, res) {
    let requested = urlPath === "/" ? "/index.html" : urlPath;
    requested = decodeURIComponent(requested);
    const candidate = path.normalize(path.join(distDir, requested));
    if (!candidate.startsWith(distDir)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }

    if (!fs.existsSync(candidate) || fs.statSync(candidate).isDirectory()) {
      const fallback = path.join(distDir, "index.html");
      if (fs.existsSync(fallback)) return this.sendFile(fallback, res);
      res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("CocoLoco V2 requires a production build. Run: npm run build");
    }
    return this.sendFile(candidate, res);
  }

  sendFile(file, res) {
    const ext = path.extname(file).toLowerCase();
    const types = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".ogg": "audio/ogg",
      ".ico": "image/x-icon"
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  }

  removeClient(client) {
    if (!this.clients.delete(client)) return;
    try { client.res.end(); } catch {}
  }

  async stop() {
    this.tikfinity.close();
    tiktokBridge.disconnect();
    for (const client of this.clients) this.removeClient(client);
    await new Promise((resolve) => this.server?.close(() => resolve()));
  }
}

const server = new LiveTransportServerV2();
server.start();

const shutdown = async (signal) => {
  logger.disconnect(`[V2] Received ${signal}; shutting down.`);
  await server.stop();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
