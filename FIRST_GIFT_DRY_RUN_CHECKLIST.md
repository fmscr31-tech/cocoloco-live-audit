# First Real Gift Dry Run Preparation: Operational Checklist v1.0

This operational instruction guide details the exact checklist and steps required to perform the first real Tikfinity gift test successfully. No code changes were made.

---

## 1. How to Start the Application
1. **Start the Frontend Vite Development Server:**
   ```bash
   npm run dev
   ```
   *(Access via local Vite development URL, typically `http://localhost:5173` or similar).*
2. **Start the Bridge Server (if using WebSocket/Webhook bridge):**
   ```bash
   cd bridge
   npm start
   ```
   *(Runs on configured bridge port, typically `3000` or `8080`).*

## 2. Which URL Opens the Production Overlay
- **Broadcast Overlay URL:** `http://localhost:5173/overlay` (or corresponding build/preview route configured in Vite/Router for OBS Browser Source).

## 3. Which URL Opens the Preview / Admin
- **Admin Control Dashboard / Simulator:** `http://localhost:5173` (Main dashboard / admin panel tabs) or `http://localhost:5173/preview` / `OverlayPreview` component.

## 4. How Tikfinity Should Point to CocoLoco
- Configure Tikfinity webhook actions or HTTP post requests to send JSON gift payloads to the bridge endpoint or local webhook URL provided by `bridge/server.js` or [`tikfinityAdapter.js`](src/core/connectors/tikfinityAdapter.js:1).

## 5. How to Verify a Gift Arrived
1. Open the Admin Panel or **Gift Pipeline Monitor** (`GiftPipelineMonitor.jsx`).
2. Watch for real-time log entries indicating normalized gift events and action dispatches.
3. Observe the broadcast overlay (`/overlay`) or [`OverlayPreview.jsx`](src/components/overlay/OverlayPreview.jsx:1) for incoming Epic Gift popups, ability banners, and team card animations.

## 6. Which Logs Should Appear
In browser developer console or Node.js bridge terminal:
- `[GiftEventBridge] Processing normalized gift event: ...`
- `[GiftEventBridge] Ability resolved: ...`
- `[AbilityEventQueue] Enqueuing ability: ...`
- `[AbilityEventQueue] Starting ability: ...`
- `[Overlay] Ability started via queue: ...`

## 7. Which Files Should Be Monitored During the First Test
- [`giftEventBridge.js`](src/core/giftEventBridge.js:20) (Inflow & normalization)
- [`giftAbilityResolver.js`](src/core/giftAbilityResolver.js:14) (Gift matching)
- [`abilityEventQueue.js`](src/core/abilityEventQueue.js:19) (Queue execution)
- [`overlay.jsx`](src/components/overlay.jsx:119) (Overlay event listeners & state updates)

## 8. Recovery Steps if a Gift Arrives but Animation Does Not Trigger
1. **Check Gift Mapping:** Verify that the incoming gift name exactly matches a configured gift in [`giftAbilityMap.js`](src/config/giftAbilityMap.js:5) (case-insensitive, including aliases).
2. **Check Console Logs:** Inspect browser developer console for unhandled exceptions or dropped events.
3. **Verify Active Session:** Ensure a match session, active round, and teams are initialized in the Admin Panel so target team IDs exist.
4. **Use Direct Visual Test Buttons:** If pipeline simulation fails, use the Direct Visual Test buttons in [`OverlayPreview.jsx`](src/components/overlay/OverlayPreview.jsx:1) to verify that the local render engine and CSS animations operate correctly.
