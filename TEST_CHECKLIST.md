# CocoLoco Live Manager - Master QA & Controlled Live Test Protocol

This document serves as the **single master source of truth** for functional tracking, QA status, regression guidelines, and controlled Live testing protocols.

## Status Legend
- ✅ **VERIFIED / PASS**: Audited, tested, and confirmed fully operational.
- 🟡 **PARTIAL / NEEDS VERIFICATION**: Exists and appears functional, but requires specific targeted testing.
- 🔴 **FAILED / PENDING FIX**: Known issue or failing test requiring investigation/fix.
- 🔵 **PLANNED IMPROVEMENT**: Non-bug enhancement or refactoring planned for future sessions.
- ⚠️ **INVESTIGATION REQUIRED**: Behavior or root cause requires architectural analysis.

---

## 1. LIVE INCIDENTS AUDIT & FIX LOG (INCIDENTS 015–071)

| Incident ID | Description | Root Cause | Files Responsible | Correction Applied | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LIVE-056** | Win Limpia configuration missing from Dashboard UI | Win Limpia settings were only stored in code without a dedicated operator control panel. | [`CommandConfigControls.jsx`](src/components/admin/CommandConfigControls.jsx) | Added dedicated Win Limpia operational UI panel (State ON/OFF, Correct Answer, Points, Save) outside of Gift Configuration. | 🟢 PASS |
| **LIVE-057** | Win visual event must update canonical score | Score desync between visual notification and canonical player record. | [`gameEngine.js`](src/core/gameEngine.js), [`playerManager.js`](src/core/playerManager.js) | Enforced canonical score mutation pipeline with immediate scoring events and state sync. | 🟢 PASS |
| **LIVE-058** | Win Limpia must update leaderboard immediately | Leaderboard state was cached or independent. | [`IndividualPanel.jsx`](src/components/overlay/IndividualPanel.jsx), [`DashboardAPI.js`](src/core/dashboardAPI.js) | Refactored leaderboard to consume live canonical state with immediate propagation on `game:score_updated`. | 🟢 PASS |
| **LIVE-059** | Tikfinity / Contexto Interactivo real Win event integration | Chat parsing mismatch with raw win messages. | [`chatCommandParser.js`](src/core/chatCommandParser.js) | Configured chat parser against registered player match and Win Limpia correct answer. | 🟢 PASS |
| **LIVE-060** | Win idempotency | Multiple listeners causing duplicate score increments. | [`gameEngine.js`](src/core/gameEngine.js), [`playerManager.js`](src/core/playerManager.js) | Single canonical mutation in `addWin()` executed exactly once per matched win event. | 🟢 PASS |
| **LIVE-061** | Leaderboard V2 compact layout | UI overflow from bulky physics bubbles and giant cards. | [`IndividualPanel.jsx`](src/components/overlay/IndividualPanel.jsx) | Replaced with fixed compact Leaderboard V2 arena keeping exact overlay dimensions. | 🟢 PASS |
| **LIVE-062** | Top 3 compact recognition | Bulky podium taking up half the overlay. | [`IndividualPanel.jsx`](src/components/overlay/IndividualPanel.jsx) | Compact Top 3 podium badges with clean typography and full nickname visibility. | 🟢 PASS |
| **LIVE-063** | 10–15 visible participants | Insufficient player rows shown in ranking table. | [`IndividualPanel.jsx`](src/components/overlay/IndividualPanel.jsx) | Configured slicing to display 10 to 15 participants in the ranking table. | 🟢 PASS |
| **LIVE-064** | No avatars/initial circles in leaderboard | Unwanted avatar and fallback initials circles cluttering compact layout. | [`IndividualPanel.jsx`](src/components/overlay/IndividualPanel.jsx) | Removed all avatars and initials circles; display name / nickname is primary identifier. | 🟢 PASS |
| **LIVE-065** | Fixed overlay dimensions | Overlay canvas resizing unpredictably during broadcast. | [`IndividualPanel.jsx`](src/components/overlay/IndividualPanel.jsx), [`overlay.css`](src/components/overlay.css) | Maintained strict container dimensions and fixed box sizing. | 🟢 PASS |
| **LIVE-066** | Win glow/highlight tied to player | Lack of visual feedback on player row upon scoring. | [`IndividualPanel.jsx`](src/components/overlay/IndividualPanel.jsx) | Added dynamic win glow and temporary scale highlight tied to player ID on score update. | 🟢 PASS |
| **LIVE-067** | Team Mode minimum 5 visible | Team panel only showing top 3 MVPs. | [`TeamPanel.jsx`](src/components/overlay/TeamPanel.jsx) | Expanded team ranking box to display minimum 5 up to 10 visible participants. | 🟢 PASS |
| **LIVE-068** | Team Mode up to 10 visible | Overflow in team ranking box. | [`TeamPanel.jsx`](src/components/overlay/TeamPanel.jsx) | Configured scrollable ranking box supporting up to 10 visible players per team. | 🟢 PASS |
| **LIVE-069** | Gift configuration explicit real identifier | Ambiguity between TikTok gift ID and display name. | [`GiftConfigControls.jsx`](src/components/admin/GiftConfigControls.jsx) | Explicit configuration interface separating match identifier key from friendly display name. | 🟢 PASS |
| **LIVE-070** | Last Received Gift diagnostics | Lack of real-time diagnostic visibility for incoming gifts. | [`GiftPipelineMonitor.jsx`](src/components/admin/GiftPipelineMonitor.jsx) | Added live diagnostic card showing last received gift identifier, name, quantity, user, event ID, rule, action, and points. | 🟢 PASS |
| **LIVE-071** | Leaderboard V3 Compact Vertical Layout | Top 3 cards taking up too much space and multi-column layout. | [`IndividualPanel.jsx`](src/components/overlay/IndividualPanel.jsx) | Redesigned leaderboard into a single compact vertical list with color/glow/accent for Top 3, right-aligned scores, and 0 avatars/initial circles. | 🟢 PASS |

---

## 2. CONTROLLED LIVE TEST PROTOCOL (ACCEPTANCE TESTS 1 - 8)

| Test ID | System / Feature | Operator Action | Expected Result | Actual Result | Status | Stop Live? | File / Component to Investigate if Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TEST-01** | Win Limpia Canonical Score | Registered player (0 pts) answers correctly via Tikfinity/Contexto chat event | Player points 0 → 1, Leaderboard 1, MVP updated, Win animation shown simultaneously | PASS | ✅ VERIFIED | YES | [`gameEngine.js`](src/core/gameEngine.js), [`IndividualPanel.jsx`](src/components/overlay/IndividualPanel.jsx) |
| **TEST-02** | Second Win Idempotency | Second correct answer by another player | Second player +1 point reflected correctly | PASS | ✅ VERIFIED | YES | [`playerManager.js`](src/core/playerManager.js) |
| **TEST-03** | Configured Gift Value | Send configured Gift (Value 1) | +1 point awarded exactly | PASS | ✅ VERIFIED | YES | [`giftResolver.js`](src/core/giftResolver.js) |
| **TEST-04** | Unknown Gift | Send unknown unconfigured gift | +0 points awarded | PASS | ✅ VERIFIED | YES | [`giftResolver.js`](src/core/giftResolver.js) |
| **TEST-05** | 10+ Registered Players | Register 12 players and start round | 10+ visible in leaderboard | PASS | ✅ VERIFIED | YES | [`IndividualPanel.jsx`](src/components/overlay/IndividualPanel.jsx) |
| **TEST-06** | 50 Registered Players | Register 50 players | Maximum 15 visible in leaderboard, overlay dimensions unchanged | PASS | ✅ VERIFIED | YES | [`IndividualPanel.jsx`](src/components/overlay/IndividualPanel.jsx) |
| **TEST-07** | Team Mode Visibility | Send team mode events | Minimum 5 visible per team | PASS | ✅ VERIFIED | YES | [`TeamPanel.jsx`](src/components/overlay/TeamPanel.jsx) |
| **TEST-08** | Leaderboard V3 Compact Vertical Layout | Inspect overlay preview / live stream | Single vertical column, Top 3 colored/glowed without giant cards, 10-15 compact rows, no avatars | PASS | ✅ VERIFIED | YES | [`IndividualPanel.jsx`](src/components/overlay/IndividualPanel.jsx) |

---

## 3. CONTROLLED LIVE GIFT VALIDATION PROTOCOL (LIVE-001 TO LIVE-010)

> **⚠️ WARNING**: LIVE runtime validation has NOT yet been completed. Results P6.1/P6.2 are static runtime/execution audits and DO NOT substitute a real gift test received from TikFinity during Controlled LIVE.
> **⚠️ NOTE**: `amped_up` still holds `PENDING_REAL_TIKTOK_ID`. Do not mark as LIVE READY until confirmed.

| Test ID | Gift / Event | Operator Action / Procedure | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **LIVE-001** | Ice Cream Cone | Send real Ice Cream gift via TikFinity | canonicalGiftId = `ice_cream` → Generate Clue. No Mudo/Freeze. Unique execution. | ⬜ NOT TESTED |
| **LIVE-002** | Doughnut | Send real Doughnut gift via TikFinity | canonicalGiftId = `doughnut` → `silent_challenge` → Mudo → `/mudo.mp3` → animation. Unique execution. | ⬜ NOT TESTED |
| **LIVE-003** | Hat and Mustache | Send real Cowboy Hat gift via TikFinity | canonicalGiftId = `hat_and_mustache` → `creative_challenge` → sound → animation → +5 pts once. | ⬜ NOT TESTED |
| **LIVE-004** | Amped Up | Send real Amped Up gift via TikFinity | canonicalGiftId = `amped_up` → `susto_coco` → sound → animation. | ⬜ BLOCKED — REAL TIKFINITY ID REQUIRED |
| **LIVE-005** | Twinkling Star | Send real Star gift via TikFinity | canonicalGiftId = `twinkling_star` → FREEZE → opposing team frozen 5 min. Scoring protection active. | ⬜ NOT TESTED |
| **LIVE-006** | Coconut | Send real Coconut gift via TikFinity | canonicalGiftId = `coconut` → FREEZE → opposing team frozen 5 min (same `battleEffectEngine`). | ⬜ NOT TESTED |
| **LIVE-007** | Galaxy | Send real Galaxy gift via TikFinity | canonicalGiftId = `galaxy` → `ultimate_galaxy` → +1 ROUND for sender team. Unique execution. | ⬜ NOT TESTED |
| **LIVE-008** | Money Gun | Send real Money Gun gift via TikFinity | canonicalGiftId = `money_gun` → `epic_impact` → `RESET_SCORE` → opponent score = 0. Unique execution. | ⬜ NOT TESTED |
| **LIVE-009** | Duplicate Event | Send real gift, then re-inject same `eventId` / `transactionId` | First entry: EXECUTE. Second entry: IGNORE (0 points/animations/sounds added). | ⬜ NOT TESTED |
| **LIVE-010** | Freeze Protection | 1. Freeze team. 2. Attempt score generation. 3. Verify blocking | Win Limpia, gift scoring, and other rewards blocked for frozen team. Unfreezing works normally. | ⬜ NOT TESTED |

---

## 4. STOP CRITERIA & STATUS

### Current Project Status:
```text
🟠 CONTROLLED LIVE REQUIRED (LIVE SAFE = NO)
NEXT ACTION: Begin LIVE-001 with a real Ice Cream Cone Gift from TikFinity.
```
