import { config } from "./config.js";

class Logger {
  log(level, type, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] [${type.toUpperCase()}]: ${message}`;
    
    if (data) {
      console.log(logEntry, JSON.stringify(data));
    } else {
      console.log(logEntry);
    }
  }

  connect(msg, data) { this.log("INFO", "CONNECT", msg, data); }
  disconnect(msg, data) { this.log("INFO", "DISCONNECT", msg, data); }
  error(msg, data) { this.log("ERROR", "ERROR", msg, data); }
  chat(msg, data) { if(config.logLevel === "DEBUG" || config.logLevel === "INFO") this.log("INFO", "CHAT", msg, data); }
  join(msg, data) { this.log("INFO", "JOIN", msg, data); }
  like(msg, data) { this.log("INFO", "LIKE", msg, data); }
  follow(msg, data) { this.log("INFO", "FOLLOW", msg, data); }
  share(msg, data) { this.log("INFO", "SHARE", msg, data); }
  gift(msg, data) { this.log("INFO", "GIFT", msg, data); }
  subscribe(msg, data) { this.log("INFO", "SUBSCRIBE", msg, data); }
}

export const logger = new Logger();
