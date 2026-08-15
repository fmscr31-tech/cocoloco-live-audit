# Dashboard Audit: Live Control Tab v1.0

This audit document evaluates every component currently residing in the **Live Control** tab of the Admin Dashboard (`src/App.jsx`) prior to any reorganization.

---

## Current Elements & Audit Breakdown

### 1. [`TikTokConnectorControl.jsx`](src/components/admin/TikTokConnectorControl.jsx:1)
- **Purpose:** Manages TikTok live connection configuration, channel username inputs, and connection toggles.
- **Decision:** **KEEP HERE**
- **Reason:** Essential core telemetry required immediately when opening the control center for a live session.
- **Dependencies:** `tiktokConnector.js`, `connectorManager.js`.

### 2. [`BattleControls.jsx`](src/components/admin/BattleControls.jsx:1)
- **Purpose:** Creates, begins, and ends competitive matches/battles.
- **Decision:** **KEEP HERE**
- **Reason:** Directly controls match lifecycle states (Waiting, Active, Ended) which govern live stream flow.
- **Dependencies:** `competitionManager.js`, `gameEngine.js`.

### 3. [`RoundControls.jsx`](src/components/admin/RoundControls.jsx:1)
- **Purpose:** Configures round names and triggers start/next round actions.
- **Decision:** **KEEP HERE**
- **Reason:** Crucial active broadcast controls used constantly between live match segments.
- **Dependencies:** `roundManager.js`, `gameEngine.js`.

### 4. [`TimerControls.jsx`](src/components/admin/TimerControls.jsx:1)
- **Purpose:** Provides Start, Pause, Resume, and Reset buttons for the match countdown clock.
- **Decision:** **KEEP HERE**
- **Reason:** Operators need immediate clock control during live broadcasts without navigating away.
- **Dependencies:** `timerManager.js`, `gameEngine.js`.

### 5. [`ConnectorMonitor.jsx`](src/components/admin/ConnectorMonitor.jsx:1)
- **Purpose:** Real-time monitoring of bridge connectivity, event monitoring, and websocket data streams.
- **Decision:** **KEEP HERE**
- **Reason:** Provides immediate visual confirmation that external TikTok/Tikfinity events are arriving successfully.
- **Dependencies:** `connectorManager.js`, `eventMonitor.js`.

### 6. [`BattleEffectsControl.jsx`](src/components/admin/BattleEffectsControl.jsx:1)
- **Purpose:** Controls battle effects such as freeze and counterattacks during live battles.
- **Decision:** **KEEP HERE**
- **Reason:** Moderation and manual effect triggers are core live control actions.
- **Dependencies:** `battleEffectEngine.js`, `simulationEngine.js`.

---

## Summary of Decisions
- **Keep:** All 6 current components (`TikTokConnectorControl`, `BattleControls`, `RoundControls`, `TimerControls`, `ConnectorMonitor`, `BattleEffectsControl`) are vital to live broadcast operation. No components are completely unused or redundant in this tab; rather, they form the comprehensive control deck for a live operator.
- **Move:** None.
- **Remove:** None.
