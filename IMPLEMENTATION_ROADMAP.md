# Safe Implementation Roadmap: CocoLoco Live Manager Evolution

## 1. Current Project Status
- **What Already Works:** 
  - Complete manual battle and round management.
  - Team creation, score tracking, and round counter indicators.
  - Manual player creation, team assignment, point awarding (`+Win`), and participant deletion.
  - Timer controls (Start/Resume, Pause, Reset).
  - Professional ESPN/NBA-styled stream overlay with tropical sunset theme, MVP lists, alerts, and penalties.
- **What Must Remain Untouched:**
  - Existing `localStorage` keys (`cocoloco_battle`, `cocoloco_teams`).
  - Current manual admin workflows (manual player additions and win triggers) as a fallback mode.
  - The core stream overlay visual layout for standard 2-team matches.

---

## 2. Implementation Phases

### Phase 1: Core Competition Layer
- **Description:** Establish the master competition state container and adapter layer.
- **Files Created:** `src/core/competitionManager.js`
- **Files Modified:** `src/core/stateManager.js`
- **Dependencies:** None.
- **Risks:** State divergence between legacy managers and the new master state.
- **Testing Requirements:** Verify that creating a competition initializes the state correctly without altering legacy storage.

### Phase 2: Game Mode System
- **Description:** Implement rulesets for Individual, Team, and Themed battles.
- **Files Created:** `src/core/gameModeManager.js`
- **Files Modified:** `src/core/competitionManager.js`
- **Dependencies:** Phase 1.
- **Risks:** Incorrect score calculation rules when switching modes mid-game.
- **Testing Requirements:** Unit test point allocation for individual vs. team modes.

### Phase 3: Integration with Current `gameEngine` Architecture
- **Description:** Connect the new competition layer to the existing engine with backward compatibility.
- **Files Created:** None.
- **Files Modified:** `src/core/gameEngine.js`
- **Dependencies:** Phase 1, Phase 2.
- **Risks:** Breaking existing game initialization routines.
- **Testing Requirements:** Run end-to-end simulation of manual battles using the adapter layer.

### Phase 4: Admin Panel Evolution
- **Description:** Add controls in the dashboard for game mode selection and advanced competition rules.
- **Files Created:** None.
- **Files Modified:** `src/App.jsx`
- **Dependencies:** Phase 3.
- **Risks:** Cluttering the compact admin dashboard UI.
- **Testing Requirements:** Verify toggle between manual mode and advanced competition mode.

### Phase 5: Dynamic Overlay Evolution
- **Description:** Enhance the stream overlay to adapt layouts based on active competition modes (e.g., individual rankings vs. multi-team grids).
- **Files Created:** None.
- **Files Modified:** `src/components/overlay.jsx`, `src/components/overlay.css`
- **Dependencies:** Phase 3.
- **Risks:** Layout breaking during live stream rendering.
- **Testing Requirements:** Test overlay responsiveness with 1 to 4 teams and individual leaderboards.

### Phase 6: TikTok Live / Interactive Context Integration
- **Description:** Connect external chat and gift webhooks to the registration and event pipeline.
- **Files Created:** `src/core/tiktokConnector.js`, `src/core/registrationManager.js`
- **Files Modified:** `src/core/gameEngine.js`
- **Dependencies:** Phase 1, Phase 3.
- **Risks:** Network latency, rate limits, or WebSocket disconnection issues.
- **Testing Requirements:** Mock incoming chat commands (`!join`) and gift payloads.

### Phase 7: Gift Processing and Ranking System
- **Description:** Automatic conversion of TikTok gifts into player/team points and real-time leaderboard sorting.
- **Files Created:** `src/core/giftManager.js`, `src/core/rankingManager.js`
- **Files Modified:** `src/core/competitionManager.js`
- **Dependencies:** Phase 6.
- **Risks:** Incorrect point multipliers causing score inflation.
- **Testing Requirements:** Validate gift-to-point conversion against predefined mapping tables.

---

## 3. Safe Migration Strategy
1. **Fallback Architecture:** If no advanced competition mode is selected, CocoLoco Live Manager will default to the existing legacy manual mode, guaranteeing zero disruption to ongoing live streams.
2. **Schema Versioning:** Any new data stored in `localStorage` will use namespaced keys (e.g., `cocoloco_competition_v2`) to prevent corrupting legacy saved battles.
3. **Non-Destructive UI Updates:** New admin controls will be added as collapsible sections or secondary tabs so the primary manual control dashboard remains lightning-fast and familiar.

---

## 4. Recommended Development Order
1. **Phase 1 & 2:** Build core competition and game mode logic in isolation.
2. **Phase 3:** Integrate via `gameEngine.js` with full backward compatibility.
3. **Phase 4 & 5:** Expose controls in Admin (`App.jsx`) and render dynamics in Overlay (`overlay.jsx`).
4. **Phase 6 & 7:** Implement external TikTok integrations and automated gift scoring as the final enhancement layer.
