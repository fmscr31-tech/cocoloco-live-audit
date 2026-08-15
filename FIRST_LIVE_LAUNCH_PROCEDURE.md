# First Live Launch Procedure v1.0

This simple operational launch procedure guides the operator through the exact steps required for the first real TikTok Live broadcast. No code modifications were performed.

---

## 1. Exact Startup Order
1. **Application / Bridge Server:**
   ```bash
   cd bridge
   npm start
   ```
2. **Dashboard Server:**
   ```bash
   npm run dev
   ```
3. **Dashboard / Admin Panel:** Open `http://localhost:5173` in your browser. Initialize battle session, teams, and players under **Game Configuration**.
4. **Overlay (OBS / Live Studio):** Add a Browser Source pointing to `http://localhost:5173/overlay` (Width: 480, Height: 700).
5. **Tikfinity & TikTok Live Studio:** Start TikTok Live Studio / TikTok Live broadcast and connect Tikfinity webhook/events to the CocoLoco bridge endpoint.

## 2. What Screen Should Remain Open During LIVE
- The **Admin Dashboard** (`http://localhost:5173`) must remain open on the operator's monitor (or secondary stream deck setup) on the **Live Control** tab to monitor round timers, battle status, and incoming events.

## 3. What Indicators Confirm Everything is Working
- **Connector Monitor (`ConnectorMonitor.jsx`):** Shows active connection status and stream telemetry.
- **Gift Pipeline Monitor (`GiftPipelineMonitor.jsx`):** Displays incoming gift events and resolver evaluations in real time.
- **Broadcast Overlay (`overlay.jsx`):** Instantly reflects score updates, active timers, round wins, and ability animations.

## 4. First Test Gift Sequence
Execute this sequence during test mode or pre-live check:
1. **Normal Gift (e.g., Rose):** Verify points increment on scoreboard / player ranking without triggering abilities.
2. **Donut:** Verify Epic Gift popup appears, followed by El Mudo challenge banner and cyan team pulse.
3. **Cowboy Hat:** Verify Epic Gift popup appears, followed by Reto Creativo banner and orange team pulse.
4. **Galaxy:** Verify Epic Gift popup appears, followed by Ultimate Galaxy core glow and +1 Round increase.
5. **Money Gun:** Verify Epic Gift popup appears, followed by Bullet Storm banner and score destruction to 0.
6. **Freeze (Star):** Verify freeze ice particles and countdown timer appear on the affected team.

## 5. What to Do If...
- **Gift arrives but no points:** Check **Gift Configuration** to ensure the gift is mapped and active for the current game mode.
- **Gift arrives but no animation:** Check **Gift Pipeline Monitor** to see if the gift mapped to an ability ID; verify match session and teams are active.
- **Tikfinity disconnects:** Restart the Node.js bridge server (`npm start` in `bridge/`) and verify webhook destination URL.
- **Overlay stops updating:** Click "Refresh" or reload the browser source in OBS / TikTok Live Studio.

## 6. Final Pre-Live Checklist
- [ ] Bridge server running (`bridge/server.js`)
- [ ] Dashboard active (`http://localhost:5173`)
- [ ] Battle session & teams created in **Game Configuration**
- [ ] TikTok channel username configured in **Live Control**
- [ ] OBS / TikTok Live Studio Browser Source connected (`/overlay`)
- [ ] Test gift sequence verified successfully
