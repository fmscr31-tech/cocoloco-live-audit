import WebSocket from "ws";

export class V2TikfinityClient {
  constructor({ url, onEvent, log = console }) {
    this.url = url;
    this.onEvent = onEvent;
    this.log = log;
    this.ws = null;
    this.reconnectTimer = null;
  }

  connect() {
    if (this.ws) return;
    this.log.log(`[V2 TikFinity] Connecting to ${this.url}`);
    try {
      this.ws = new WebSocket(this.url);
      this.ws.on("open", () => this.log.log("[V2 TikFinity] Connected"));
      this.ws.on("message", (data) => {
        try {
          const raw = data.toString();
          let parsed;
          try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }
          this.onEvent?.({
            type: "event",
            source: "tikfinity",
            eventType: parsed.event || parsed.type || "unknown",
            payload: parsed,
            timestamp: Date.now()
          });
        } catch (error) {
          this.log.error("[V2 TikFinity] Event error", error);
        }
      });
      this.ws.on("close", () => {
        this.ws = null;
        this.scheduleReconnect();
      });
      this.ws.on("error", (error) => this.log.error("[V2 TikFinity] Socket error", error));
    } catch (error) {
      this.ws = null;
      this.log.error("[V2 TikFinity] Connection error", error);
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

  close() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
    this.ws = null;
  }
}
