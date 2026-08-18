import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 8080,
  username: process.env.TIKTOK_USERNAME || "cocolococr",
  tikfinityWsUrl: process.env.TIKFINITY_WS_URL || "ws://localhost:21213",
  autoReconnect: process.env.AUTO_RECONNECT !== "false",
  heartbeatInterval: Number(process.env.HEARTBEAT_INTERVAL) || 30000,
  logLevel: process.env.LOG_LEVEL || "INFO"
};
