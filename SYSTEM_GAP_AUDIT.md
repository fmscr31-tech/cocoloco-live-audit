# System Gap Audit Report v1.0

This technical audit report identifies incomplete features, stubs, placeholders, or un-wired handlers across the entire CocoLoco Live Manager repository. No code changes were performed.

---

## Identified System Gaps

### 1. Legacy Gift Action Handlers (`give_clue`, `bonus`)
- **Component / File:** [`giftActionDispatcher.js`](src/core/giftActionDispatcher.js:95)
- **Current Status:** Placeholder handler logic (`console.log` stubs and event publishing without advanced game mutation).
- **Why it is incomplete:** While legacy gift routing (`giftResolver` -> `giftActionDispatcher`) dispatches these events, the specific secondary game actions (clue unlocking, bonus multipliers) are stubbed with console logs rather than fully wired to active game state modifiers.
- **Missing Dependency:** Active game state state-machine hooks for clue tracking and bonus multipliers.
- **Priority:** **LOW** (Core gift ability pipeline and point accumulation are fully functional via `giftAbilityResolver` and `abilityEventQueue`).

### 2. Live WebSocket Connector Direct Connection vs. Bridge Server
- **Component / File:** [`tiktokConnector.js`](src/core/connectors/tiktokConnector.js:1), [`TikTokConnectorControl.jsx`](src/components/admin/TikTokConnectorControl.jsx:1)
- **Current Status:** Relies on the Node.js bridge server (`bridge/server.js`) for socket ingestion. Direct browser-side WebSocket connection to live TikTok Webcast is restricted by CORS/browser protocols.
- **Why it is incomplete:** Frontend UI controls allow entering a username, but actual raw stream ingestion requires the external bridge process to be running locally.
- **Missing Dependency:** Active local Node.js bridge process (`node bridge/server.js`).
- **Priority:** **MEDIUM** (Operational checklist successfully documents running the bridge server).
