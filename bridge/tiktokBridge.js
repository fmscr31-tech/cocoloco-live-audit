import { WebcastPushConnection } from "tiktok-live-connector";
import { logger } from "./logger.js";
import { EventTranslator } from "./eventTranslator.js";

/**
 * TikTok Bridge: Encapsulates tiktok-live-connector completely.
 * Exposes connect(), disconnect(), reconnect(), getStatus(), setUsername().
 */
class TikTokBridge {
  constructor(username = "cocolocolive") {
    this.username = username;
    this.connection = null;
    this.status = "DISCONNECTED"; // DISCONNECTED, CONNECTING, CONNECTED, ERROR
    this.eventCallback = null;
  }

  setUsername(username) {
    if (username) {
      this.username = username;
    }
  }

  getStatus() {
    return {
      username: this.username,
      status: this.status
    };
  }

  onEvent(callback) {
    this.eventCallback = callback;
  }

  async connect() {
    if (this.status === "CONNECTED") return;
    this.status = "CONNECTING";
    logger.connect(`Connecting to TikTok LIVE for user: ${this.username}`);

    try {
      this.connection = new WebcastPushConnection(this.username);

      this.connection.connect().then(state => {
        this.status = "CONNECTED";
        logger.connect(`Connected successfully to roomId: ${state.roomId}`);
      }).catch(err => {
        this.status = "ERROR";
        logger.error(`Failed to connect: ${err.message}`, err);
      });

      // Bind events
      const events = ["chat", "member", "like", "social", "share", "gift"];
      events.forEach(evt => {
        this.connection.on(evt, data => {
          logger[evt === "social" ? "follow" : evt](`Event received [${evt}]`, data);
          if (this.eventCallback) {
            const translated = EventTranslator.translate(evt, data);
            if (translated) {
              this.eventCallback(translated);
            }
          }
        });
      });

      this.connection.on("disconnected", () => {
        this.status = "DISCONNECTED";
        logger.disconnect("Disconnected from TikTok LIVE stream");
      });

    } catch (error) {
      this.status = "ERROR";
      logger.error(`Error initializing TikTok connection: ${error.message}`, error);
    }
  }

  async disconnect() {
    if (this.connection) {
      try {
        if (typeof this.connection.disconnect === "function") {
          this.connection.disconnect();
        }
      } catch (e) {}
      this.connection = null;
    }
    this.status = "DISCONNECTED";
    logger.disconnect("TikTok bridge disconnected manually");
  }

  async reconnect() {
    await this.disconnect();
    await this.connect();
  }
}

export const tiktokBridge = new TikTokBridge();
