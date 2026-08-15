import { config } from "./config.js";
import { logger } from "./logger.js";
import { bridgeSocket } from "./bridgeSocket.js";
import { tiktokBridge } from "./tiktokBridge.js";
import { tikfinityClient } from "./tikfinityClient.js";

async function main() {
  logger.connect("Starting CocoLoco TikTok & Tikfinity Bridge Server...");

  // 1. Start WebSocket & Webhook Server for React clients
  bridgeSocket.start(config.heartbeatInterval);

  // 2. Connect to Tikfinity Browser Bridge WebSocket
  tikfinityClient.setUrl(config.tikfinityWsUrl);
  tikfinityClient.connect();

  // 3. Configure TikTok Bridge and bind event translation to WebSocket broadcast
  tiktokBridge.setUsername(config.username);
  tiktokBridge.onEvent((translatedEvent) => {
    bridgeSocket.broadcast(translatedEvent);
  });

  // 4. Connect to TikTok LIVE
  await tiktokBridge.connect();

  // Graceful Shutdown Handlers
  const shutdown = async (signal) => {
    logger.disconnect(`Received ${signal}. Shutting down gracefully...`);
    tiktokBridge.disconnect();
    tikfinityClient.disconnect();
    bridgeSocket.stop();
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch(err => {
  logger.error(`Fatal error in bridge server: ${err.message}`, err);
  process.exit(1);
});
