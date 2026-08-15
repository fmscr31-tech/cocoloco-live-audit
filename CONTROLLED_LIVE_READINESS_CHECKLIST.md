# CocoLoco Live Manager — Controlled LIVE Readiness Checklist

## Overview
This master checklist documents the required pre-live, during-live, and emergency operational verification steps before executing a real controlled TikTok LIVE session.

---

## 1. Pre-Live Verification
- [ ] Application starts (`npm run dev` / preview)
- [ ] Admin loads correctly
- [ ] Overlay loads correctly
- [ ] Correct game mode selected
- [ ] Historical records visible
- [ ] Active session clean
- [ ] Players = 0
- [ ] Teams clean
- [ ] Score = 0
- [ ] Round = none
- [ ] Timer reset
- [ ] Freeze = none
- [ ] Ability queue empty
- [ ] Audio assets available
- [ ] Overlay URL/window ready
- [ ] Tikfinity connected

**Status**: NOT TESTED — CONTROLLED LIVE REQUIRED

---

## 2. TikTok / Tikfinity Connection
- [ ] TikTok LIVE connection established
- [ ] Tikfinity receives chat
- [ ] Tikfinity receives Gifts
- [ ] CocoLoco receives external gift events
- [ ] Sender identity arrives correctly
- [ ] Gift identity resolves correctly
- [ ] Transaction/event identity present
- [ ] Duplicate event behavior verified with real connector

**Status**: NOT TESTED — CONTROLLED LIVE REQUIRED

---

## 3. Registration
- [ ] Player joins via chat command
- [ ] Registration command works
- [ ] Player appears in Admin
- [ ] Player appears in Overlay
- [ ] Player ID stable
- [ ] Duplicate registration prevented
- [ ] Player removal works
- [ ] Rejoin behavior correct

**Status**: NOT TESTED — CONTROLLED LIVE REQUIRED

---

## 4. Individual Mode
- [ ] Start Individual Mode
- [ ] Start Round
- [ ] Timer starts
- [ ] Timer visible
- [ ] Normal scoring
- [ ] Multiple participants
- [ ] Winner
- [ ] MVP
- [ ] End Round
- [ ] Snapshot archived

**Status**: NOT TESTED — CONTROLLED LIVE REQUIRED

---

## 5. Real Donut (El Mudo)
- [ ] Exactly one normalized gift
- [ ] Exactly one ability
- [ ] Exactly +1 point
- [ ] Mudo animation
- [ ] Mudo sound
- [ ] Correct sender
- [ ] Correct player/team
- [ ] No duplicate popup
- [ ] No duplicate score

**Status**: NOT TESTED — CONTROLLED LIVE REQUIRED

---

## 6. Real Sombrero (Reto Creativo)
- [ ] Exactly one normalized gift
- [ ] Exactly one ability
- [ ] Exactly +1 point
- [ ] Creative Challenge animation
- [ ] Correct sound
- [ ] Correct sender
- [ ] No duplicate popup
- [ ] No duplicate score

**Status**: NOT TESTED — CONTROLLED LIVE REQUIRED

---

## 7. Real Star / Freeze
- [ ] Exactly one Freeze activation
- [ ] Correct target
- [ ] Correct duration
- [ ] Exactly one Freeze HUD
- [ ] Correct animation
- [ ] Correct sound
- [ ] Opposing team blocked when Team Mode
- [ ] No duplicate activation

**Status**: NOT TESTED — CONTROLLED LIVE REQUIRED

---

## 8. Real Freeze Scoring Block
- [ ] Normal score blocked
- [ ] Donut score blocked
- [ ] Sombrero score blocked
- [ ] Win Limpia blocked
- [ ] Mudo blocked
- [ ] Other reward scoring blocked
- [ ] Frozen team cannot retain generated points

**Status**: NOT TESTED — CONTROLLED LIVE REQUIRED

---

## 9. Timer
- [ ] Start / Pause / Resume / Stop / Reset
- [ ] Expiration behavior
- [ ] Overlay synchronization
- [ ] Admin synchronization
- [ ] No duplicate timer / accelerated countdown / negative timer / divergence

**Status**: NOT TESTED — CONTROLLED LIVE REQUIRED

---

## 10. Admin ⇄ Overlay Synchronization
- [ ] Same players
- [ ] Same teams
- [ ] Same score
- [ ] Same round
- [ ] Same timer
- [ ] Same mode
- [ ] Same Freeze state

**Status**: NOT TESTED — CONTROLLED LIVE REQUIRED

---

## 11. Reload Test
- [ ] Admin reload
- [ ] Overlay reload
- [ ] Both reload
- [ ] No score loss / duplicate timer / duplicate HUD / duplicate events

**Status**: NOT TESTED — CONTROLLED LIVE REQUIRED

---

## 12. Team Mode
- [ ] Switch to Team Mode
- [ ] Create teams & assign players
- [ ] Start Team Round / scoring / MVP / winner / Freeze target & blocking / End Round
- [ ] Zero Individual/Team contamination

**Status**: NOT TESTED — CONTROLLED LIVE REQUIRED

---

## 13. End Session
- [ ] End Session
- [ ] Final round archived & session archived
- [ ] Historical records preserved & Hall of Fame updated
- [ ] Active state cleaned

**Status**: NOT TESTED — CONTROLLED LIVE REQUIRED

---

## 14. New Live
- [ ] New Live executed successfully (Players = 0, Teams clean, Score = 0, Round = none, Timer reset, Freeze = none, Queue = empty, Historical preserved)

**Status**: NOT TESTED — CONTROLLED LIVE REQUIRED

---

## 15. GO / NO-GO Criteria
- **GO only if**: No duplicate scoring, no duplicate gifts/abilities/freeze, no timer duplication, no divergence, no score loss, no historical corruption, no session/mode contamination, no stale events, no unrecoverable state.
- **Any single critical failure = NO-GO.**

---

## 16. Emergency Stop Procedure
1. **Runaway Scoring / Duplicate Gifts**: Use Admin manual score adjustment or reset controls (`gameEngine.resetScores()` / `DashboardAPI`).
2. **Duplicated Freeze / Timer Failure**: Trigger explicit timer stop / reset or overlay reset (`eventBus.publish("overlay:reset", {})`).
3. **Connector Failure**: Disconnect live connector via Global Live Status Header [`GlobalLiveStatusHeader.jsx`](src/components/admin/GlobalLiveStatusHeader.jsx:13) and restart adapter connection.
4. **Corrupted State**: Execute safe session termination [`SessionManager.endSession()`](src/core/sessionManager.js:126) and initiate a clean [`SessionManager.startSession()`](src/core/sessionManager.js:98) (New Live).

---

## 17. Final Checklist Status
All real LIVE tests are currently: **NOT TESTED — CONTROLLED LIVE REQUIRED**.

---

## 18. Final Status
**🟠 CONTROLLED LIVE REQUIRED**
