# CocoLoco TikTok LIVE Bridge

Node.js intermediary bridge server connecting TikTok LIVE via `tiktok-live-connector` to CocoLoco Live Manager clients via WebSockets.

## Setup & Execution
1. Open terminal and navigate to `bridge/`:
   ```bash
   cd bridge
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure `.env` if needed (`PORT`, `USERNAME`).
4. Run the bridge server:
   ```bash
   npm start
   ```

## Architecture Flow
TikTok LIVE → `tiktok-live-connector` → [`bridge/tiktokBridge.js`](bridge/bridge.js:1) → [`bridge/eventTranslator.js`](bridge/eventTranslator.js:1) → [`bridge/bridgeSocket.js`](bridge/bridgeSocket.js:1) (WebSocket Broadcast) → React Client (`tiktokConnector.js`) → [`eventBridge`](src/core/eventBridge.js:1).
