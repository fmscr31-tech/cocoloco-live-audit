import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 8080,
  // Do not use process.env.USERNAME here: on Windows it is the OS login name.
  // The TikTok account must be configured explicitly with TIKTOK_USERNAME.
  username: process.env.TIKTOK_USERNAME || "cocolococr",
  tikfinityWsUrl: process.env.TIKFINITY_WS_URL || "ws://localhost:21213",
  autoReconnect: process.env.AUTO_RECONNECT !== "false",
  heartbeatInterval: Number(process.env.HEARTBEAT_INTERVAL) || 30000,
  logLevel: process.env.LOG_LEVEL || "INFO"
};
