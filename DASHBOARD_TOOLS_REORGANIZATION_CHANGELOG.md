# Dashboard Tools & Utilities Reorganization Changelog v1.0

This changelog records the safe UI organization review and confirmation of testing and debugging utilities across the Admin Dashboard (`src/App.jsx`).

---

## Changes & Confirmation

### 1. Separation of Production vs. Testing Tools (`App.jsx`)
- **Production Control Tabs:**
  - `live` (Live operator control center: connection, monitor, timers, battle controls, effects).
  - `config` (Pre-match battle preparation center: team setup, registration, ability manager, gift config).
  - `gifts`, `abilities`, `players`, `registration`.
- **Developer / Testing Lab (`activeTab === "debug"`):**
  - [`SimulationControls.jsx`](src/components/admin/SimulationControls.jsx:1) (Local event simulation)
  - [`EventSimulatorControls.jsx`](src/components/admin/EventSimulatorControls.jsx:1) (Manual chat/event dispatches)
  - [`GiftPipelineMonitor.jsx`](src/components/admin/GiftPipelineMonitor.jsx:1) (Real-time gift pipeline trace)
- **Standalone Verification Utility:**
  - [`OverlayPreview.jsx`](src/components/overlay/OverlayPreview.jsx:1) (Launched independently via the top header action button "Abrir Preview Visual").

### 2. Safety & Integrity
- All testing systems, simulation tools, and pipeline monitors remain fully functional, preserved, and safely isolated in the Test / Debug tab and preview window. No game logic or event pathways were altered.

---

## Validation
- Build status: Success (`vite build` passed with exit code 0).
