# Dashboard Audit: Tools and Utilities v1.0

This technical audit report evaluates all testing controls, simulators, debug tools, preview utilities, and manual event triggers across the Admin Dashboard prior to any modifications. No code changes were performed.

---

## Tool & Utility Audit Breakdown

### 1. [`OverlayPreview.jsx`](src/components/overlay/OverlayPreview.jsx:1) (Abrir Preview Visual)
- **What it does:** Provides a standalone side-by-side simulator and visual reference system with direct visual test buttons and pipeline test triggers for OBS/stream verification.
- **Required during LIVE?** No (used primarily for pre-broadcast verification and setup testing).
- **Required during preparation?** Yes (crucial for verifying overlay rendering and animations).
- **Developer/Testing only?** Yes / Operator testing.
- **Dependencies:** `Overlay.jsx`, `giftEventBridge.js`, team/player managers.
- **Classification:** **KEEP** (Dedicated Development / Verification Tool).

### 2. [`SimulationControls.jsx`](src/components/admin/SimulationControls.jsx:1) (Test / Debug Tab)
- **What it does:** Simulates player actions, chat messages, and gift events locally for engine testing.
- **Required during LIVE?** No.
- **Required during preparation?** Yes (testing rules and triggers).
- **Developer/Testing only?** Yes.
- **Dependencies:** `simulationEngine.js`, `gameEngine.js`.
- **Classification:** **KEEP** (Developer/Testing Area).

### 3. [`EventSimulatorControls.jsx`](src/components/admin/EventSimulatorControls.jsx:1) (Test / Debug Tab)
- **What it does:** Manually dispatches simulated chat and event messages.
- **Required during LIVE?** No (except emergency fallback).
- **Developer/Testing only?** Yes.
- **Dependencies:** `eventDispatcher.js`, `eventBus.js`.
- **Classification:** **KEEP** (Developer/Testing Area).

### 4. [`GiftPipelineMonitor.jsx`](src/components/admin/GiftPipelineMonitor.jsx:1) (Test / Debug Tab)
- **What it does:** Real-time logging of incoming gift events, resolver evaluations, and action dispatches.
- **Required during LIVE?** Yes (highly valuable for monitoring raw gift ingestion during broadcasts).
- **Developer/Testing only?** No (useful for live pipeline verification).
- **Dependencies:** `giftEventBridge.js`, `eventBus.js`.
- **Classification:** **MOVE / KEEP IN LIVE MONITORING OR DEBUG** (Currently correctly placed in Debug/Test tab, but acts as a helpful live diagnostic).

---

## Summary of Classifications
- **KEEP (Developer / Testing Area):** `SimulationControls`, `EventSimulatorControls`, `GiftPipelineMonitor` (all housed in the Test / Debug tab `activeTab === "debug"`).
- **KEEP (Dedicated Verification Tool):** `OverlayPreview` (launched via top navigation bar).
- **MOVE:** None currently required.
- **REMOVE:** None (all utilities serve active testing, debugging, and verification roles).
