# Project Memory: CocoLoco Live Manager

## Project Purpose
[`CocoLoco Live Manager`](PROJECT_MEMORY.md:1) is a specialized event management platform for live-streamed competitions (specifically optimized for TikTok-style formats). It allows a moderator to manage teams, players, battles, and rounds while providing a real-time, high-impact visual overlay for the audience.

## Architecture Overview
The project follows a **Decoupled Manager Architecture** (fully documented in [`ARCHITECTURE.md`](ARCHITECTURE.md:1)):
- **Core Logic**: Pure JavaScript modules in [`src/core/`](src/core/gameEngine.js:1) handle all business rules, data manipulation, and persistence.
- **State Synchronization**: A custom Pub/Sub system in [`stateManager.js`](src/core/stateManager.js:1) and [`eventManager.js`](src/core/eventManager.js:1) facilitates communication between the logic layer and the UI.
- **Configuration & Event Bus**: [`src/core/configManager.js`](src/core/configManager.js:1) serves as the centralized single source of truth for all system settings, while [`src/core/eventBus.js`](src/core/eventBus.js:1) provides decoupled pub/sub inter-module messaging.
- **Connectors & Monitoring**: [`src/core/connectors/baseConnector.js`](src/core/connectors/baseConnector.js:1), [`src/core/connectors/tiktokConnector.js`](src/core/connectors/tiktokConnector.js:1), [`src/core/connectors/tiktokAdapter.js`](src/core/connectors/tiktokAdapter.js:1), [`src/core/connectors/connectorManager.js`](src/core/connectorManager.js:1), and [`src/core/connectors/eventMonitor.js`](src/core/connectorManager.js:1) provide standardized external platform integration and real-time diagnostics.
- **Dashboard Data API**: [`src/core/dashboardAPI.js`](src/core/dashboardAPI.js:1) acts as a unified, read-only data layer that decouples engine logic from visual interfaces.
- **UI Layer**: React 19 components consume data through [`dashboardAPI`](src/core/dashboardAPI.js:1) and are modularized into independent domain components (`src/components/admin/` and [`src/components/overlay/`](src/components/overlay/ScoreBoard.jsx:1)).
- **Persistence**: Data is persisted in the browser's [`localStorage`](PROJECT_MEMORY.md:11) through various manager-level handlers, ensuring that refreshes do not reset the game state.

## Architecture Status
- **Base Architecture Defined**: Established in [`ARCHITECTURE.md`](ARCHITECTURE.md:1).
- **Sprints 2-29 Completed**: Event Pipeline, Reward Engine, Event Bus, Player Lifecycle, Session Manager, Configuration Manager, Statistics & Ranking, Dashboard Data API, Modular Overlay 2.0, Admin Dashboard, Simulation Engine, Game Rules Engine, Mission Engine, Test Scenarios, External Connectors, Event Monitoring, Battle Effects Engine, Power-Up Engine, Overlay Polish, Live Battle Presentation, TikTok Connector Prep, Stress Testing, Real Connector, Node.js TikTok Bridge, Frontend Bridge Integration, Visual Polish Sprint, Dynamic Broadcast Header v1 Sprint, Live Phase Timer v1 Sprint, Live Flow Manager v1 Sprint, Registration Manager v1 (Core) Sprint, Registration Admin Controls v1 Sprint, Command Configuration Manager v1 Sprint, Chat Command Parser v1 Sprint, Event Simulator v1 Sprint, Admin Dashboard Tabs Sprint, Gift Configuration UI v1 Sprint, Gift Database Foundation v1 Sprint, Gift Configuration UI v2 Sprint, Gift Catalog Foundation v1.1 Sprint, TikTok Gift Event Bridge Foundation v1 Sprint, Gift Action Dispatcher Foundation v1 Sprint, Gift Simulation Pipeline Test v1 Sprint, Gift Pipeline Monitor v1 Sprint, Normalized Gift Event Bridge v1 Sprint, External Event Simulator v2 Sprint, and Tikfinity Connector Foundation v1 Sprint.
- **Tikfinity Connector Foundation v1 Sprint Completed**: Created [`src/core/connectors/tikfinityAdapter.js`](src/core/connectors/tikfinityAdapter.js:1) to convert raw Tikfinity payloads into normalized gift events via [`giftEventBridge.js`](src/core/giftEventBridge.js:1). It validates payloads, detects gift events, extracts `username`, `giftId`, `quantity`, and `diamondValue`, logs debugging telemetry, and exposes a browser console test helper (`window.__cocoTikfinityTest`) without opening network sockets or modifying game engines.

## Folder Structure
- [`src/core/`](src/core/gameEngine.js:1): Business logic, managers, and engines.
- [`src/core/connectors/`](src/core/connectors/baseConnector.js:1): Platform adapters and connectors (Tikfinity adapter, TikTok adapter, etc.).
- [`src/data/`](src/data/gifts.js:1): Master static data repositories (gifts, game modes, gift rules).
- [`src/components/admin/`](src/components/admin/BattleControls.jsx:1): Modular administrative components.
- [`src/components/overlay/`](src/components/overlay/ScoreBoard.jsx:1): Modular stream overlay visual components.
- [`src/config/`](src/config/tiktok.js:1): External platform configurations.
- [`src/components/`](src/components/overlay.jsx:1): Reusable React components (Overlay container, HUD elements).
- [`src/pages/`](src/pages/OverlayPage.jsx:1): Main application views (Admin, OverlayPage).
- [`src/assets/`](src/assets/hero.png): Static resources and global styles.
- [`public/`](public/favicon.svg): Unprocessed static assets.

## Important Files
- [`src/core/connectors/tikfinityAdapter.js`](src/core/connectors/tikfinityAdapter.js:1): Tikfinity payload normalization adapter module.
- [`src/core/giftEventBridge.js`](src/core/giftEventBridge.js:1): Neutral gift event normalization and auto-wiring bridge module.
- [`src/components/admin/GiftPipelineMonitor.jsx`](src/components/admin/GiftPipelineMonitor.jsx:1): Real-time gift pipeline debugging monitor component.
- [`src/core/giftSimulatorTest.js`](src/core/giftSimulatorTest.js:1): Complete gift pipeline validation and test utility module.
- [`src/core/giftActionDispatcher.js`](src/core/giftActionDispatcher.js:1): Resolved gift action router and execution dispatcher module.
- [`src/core/giftResolver.js`](src/core/giftResolver.js:1): Neutral gift event resolver module.
- [`src/data/gifts.js`](src/data/gifts.js:1): Extended TikTok gift master catalog schema.
- [`src/data/gameModes.js`](src/data/gameModes.js:1): Game modes definition catalog.
- [`src/data/giftRules.js`](src/data/giftRules.js:1): Mode-specific gift mapping rules.
- [`src/components/admin/GiftConfigControls.jsx`](src/components/admin/GiftConfigControls.jsx:1): Production-grade gift configuration console v2.
- [`src/App.jsx`](src/App.jsx:1): Admin dashboard with tab-based navigation system.
- [`src/core/dashboardAPI.js`](src/core/dashboardAPI.js:1): Unified read-only data layer for external interfaces.
- [`AGENTS.MD`](AGENTS.MD:1): Development instructions and project rules.

## Current Features
- **Tikfinity Connector Adapter**: Neutral adapter converting Tikfinity webhook payloads into normalized gift events.
- **External Event Simulator v2**: Upgraded test utility validating external event injection into `giftEventBridge` with console tracing across all pipeline stages.
- **Gift Event Bridge**: Neutral gateway accepting external platform payloads, neutralizing them into standard `normalized:gift` events, and automatically piping them through `giftResolver` and `giftActionDispatcher`.
- **Gift Pipeline Monitor**: Real-time debugging console panel displaying received gift events, resolver evaluations, and action dispatches via `eventBus`.
- **Gift Simulation Pipeline Test**: Developer test utility providing end-to-end trace logging and browser console bindings (`window.__cocoGiftTest`, `window.__cocoGiftBridge`, `window.__cocoTikfinityTest`) for validating gift events through the resolution, dispatch, and event bus pipeline.
- **Gift Action Dispatcher**: Action routing layer mapping resolved gift actions (`points`, `clue`, `register_player`, `bonus`, `special_event`) to execution handlers with event publishing.
- **Gift Resolver**: Neutral bridge module mapping normalized gift events (`{ giftId, username, quantity }`) against master catalogs and mode-specific gift rules into structured game actions.
- **Gift Catalog Foundation v1.1**: Extended TikTok gift schema (`tiktokGiftId`, `displayName`, `diamondValue`, `image`, `category`, `active`) for real TikTok gift integration readiness.
- **Gift Configuration UI v2**: Production-grade production console featuring Game Mode selection (`Context`, `VS Battle`, `Tournament`), professional rules tables, rule editor (`Add`, `Edit`, `Delete`, `Toggle`), and live active gift preview badges.
- **Gift Database Foundation**: Mode-aware gift mapping architecture supporting mode-specific rules for `Context`, `VS Battle`, and `Tournament` game modes.
- **Admin Dashboard Tabs**: Professional production-grade tab navigation organizing control panels into `LIVE CONTROL`, `GIFT CONFIGURATION`, `PLAYERS`, `REGISTRATION`, `GAME MODES / CONFIG`, and `TEST / DEBUG`.
- **Event Simulator**: Interactive admin panel enabling testing of normalized chat events (`normalized:chat`) through the standard event bus pipeline.
- **Chat Command Parser**: Independent parser processing normalized chat events against `registrationManager` status and `commandConfigManager` rules to register participants via chat commands (`CHAT` or `MIXED` modes).
- **Command & Gift Configuration**: Dedicated configuration module and admin panel (`CommandConfigControls`) allowing moderators to configure registration mode and assign team-specific chat commands and valid gifts.
- **Registration Admin Controls**: Dedicated admin panel providing live status badges (OPEN/CLOSED/LOCKED), signup counts, recent registered participants list, and action buttons for managing registration lifecycle.
- **Player Registration**: Comprehensive registration queue management supporting `openRegistration()`, `closeRegistration()`, `lockRegistration()`, `registerPlayer()`, `removePlayer()`, and `clearRegistration()` with duplicate prevention and event distribution.
- **Live Flow Management**: Centralized broadcast stage management supporting WAITING, PREPARATION, COUNTDOWN, ACTIVE_ROUND, ROUND_END, and CELEBRATION phases with reactive event distribution.
- **Player Management**: Creation of players, assignment to teams, and manual win/point tracking.
- **Team Management**: Support for team-based competitions with individual icons and cumulative scores.
- **Battle & Round Logic**: Hierarchical structure where battles contain rounds, with associated timers and prizes.
- **Live HUD**: Highly optimized compact overlay for TikTok Live Studio featuring ESPN/NBA esports broadcast styling, dynamic broadcast header with 5 states, reusable live phase countdown timer, protagonist freeze alerts, top 5 impact-sorted MVPs with Coco units, scoreboard, and countdown timer.
- **Power-Ups & Effects**: Special stream power-ups and temporary team freezing with point interception, redirection, unlock, and counterattack mechanics.
- **TikTok LIVE E2E Integration**: Fully integrated frontend WebSocket client (`tiktokConnector`) connecting securely to the Node.js Bridge (`bridge/`) with heartbeat and auto-reconnection.
- **Connectors & Monitoring**: Standardized external platform connector infrastructure with real-time diagnostics.
- **Missions & Objectives**: Dynamic stream goals with automatic progress tracking and completion rewards.
- **Game Rules**: Automated scoring adjustments, multiplier rules, scoring interception during freeze, and victory threshold evaluation.
- **Simulation & Testing**: Automated end-to-end test scenarios and offline TikTok LIVE event simulator.
- **Persistence**: Auto-save and auto-load functionality using [`localStorage`](PROJECT_MEMORY.md:11).

## Known Risks
- **Performance**: Minor polling interval retained for the second-by-second countdown clock; ready for reactive timer migration in future sprints.
- **Scalability**: [`src/App.jsx`](src/App.jsx:1) and [`src/components/overlay.jsx`](src/components/overlay.jsx:1) are successfully modularized.
- **State Leakage**: Some systems (like the Penalty box) are UI-only and not yet part of the persistent core logic.
- **Concurrency**: Direct [`localStorage`](PROJECT_MEMORY.md:11) manipulation across multiple tabs could lead to sync delays or race conditions.

## Development Rules
- **Full Files Only**: Never provide partial code snippets.
- **No Manual Intervention**: Always provide code that can be safely copied/applied.
- **Preserve Structure**: Do not refactor the project organization without explicit instruction.
- **Safety First**: Verify imports, exports, and hook usage before delivering modifications.
- **Reference**: Follow the detailed guidelines in [`AGENTS.MD`](AGENTS.MD:1).

## Future Roadmap
1. **State Sync Refactor**: Implement the `subscribe` pattern across all UI components.
2. **Admin Dashboard Refinement**: Expand modular admin panels with statistics and configuration management views.
3. **Core Expansion**: Integrate the Penalty/Castigo system into core managers.
4. **Style Modernization**: Replace inline styles with CSS Modules or a utility-first framework.
5. **Enhanced Events**: Expand [`eventBus`](src/core/eventBus.js:1) and UI consumers.
