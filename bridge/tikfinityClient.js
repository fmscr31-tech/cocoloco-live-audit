import WebSocket from "ws";
import { logger } from "./logger.js";
import { bridgeSocket } from "./bridgeSocket.js";

/**
 * Tikfinity Browser Bridge WebSocket Client:
 * Connects outbound to Tikfinity's local Browser Bridge (e.g. ws://localhost:21213),
 * receives real-time stream event payloads, and broadcasts them to CocoLoco frontend clients.
 */
class TikfinityBrowserBridgeClient {
  constructor(url = "ws://localhost:21213") {
    this.url = url;
    this.ws = null;
    this.reconnectTimer = null;
  }

  setUrl(url) {
    if (url) {
      this.url = url;
    }
  }

  connect() {
    logger.connect(`Connecting to Tikfinity Browser Bridge at ${this.url}...`);
    try {
      this.ws = new WebSocket(this.url);

      this.ws.on("open", () => {
        logger.connect("Connected successfully to Tikfinity Browser Bridge!");
      });

      this.ws.on("message", (data) => {
        try {
          const rawMessage = data.toString();
          let parsed;
          try {
            parsed = JSON.parse(rawMessage);
          } catch (e) {
            parsed = { raw: rawMessage };
          }

          logger.connect(`[Tikfinity WS Event] Received payload: ${rawMessage.substring(0, 150)}`);

          console.log("[TIKFINITY EVENT TYPE]", parsed.event || parsed.type);
          if (parsed.event === "gift" || parsed.type === "gift" || JSON.stringify(parsed).toLowerCase().includes("gift")) {
             console.log("[🎁 RAW GIFT FROM TIKFINITY]", JSON.stringify(parsed, null, 2));
          }

          const eventType = parsed.event || parsed.type || "unknown";
          logger.connect(`[Tikfinity Bridge] Forwarding event: ${eventType}`);

          // Broadcast to connected frontend clients preserving full parsed object as payload
          const eventMessage = {
            type: "event",
            source: "tikfinity",
            eventType: eventType,
            payload: parsed
          };

          bridgeSocket.broadcast(eventMessage);
        } catch (err) {
          logger.error(`Error processing Tikfinity WS message: ${err.message}`, err);
        }
      });

      this.ws.on("close", () => {
        logger.disconnect("Disconnected from Tikfinity Browser Bridge. Reconnecting in 5s...");
        this.scheduleReconnect();
      });

      this.ws.on("error", (err) => {
        logger.error(`Tikfinity WS error: ${err.message}`);
      });
    } catch (error) {
      logger.error(`Failed to initialize Tikfinity client: ${error.message}`, error);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    logger.disconnect("Tikfinity Browser Bridge client disconnected manually.");
  }
}

export const tikfinityClient = new TikfinityBrowserBridgeClient();
