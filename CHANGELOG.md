# Changelog: CocoLoco Live Manager

All notable changes to this project will be documented in this file.

## [v0.6.0] - 2026-08-06 (Ability System Stability Checkpoint)

### Added
- **Visual Reference System:** Added direct visual test reference buttons in [`OverlayPreview.jsx`](src/components/overlay/OverlayPreview.jsx:1) alongside production pipeline test triggers.
- **Ability Event Pipeline Synchronization:** Synchronized [`giftAbilityResolver.js`](src/core/giftAbilityResolver.js:1) and [`overlay.jsx`](src/components/overlay.jsx:1) state mappings (`donutTeamId`, `hatTeamId`, `galaxyTeamId`, `moneyGunTeamId`, `galaxyPopup`, `epicEvent`) to match direct visual test rendering precisely across [`TeamPanel.jsx`](src/components/overlay/TeamPanel.jsx:1) and [`GiftFeed.jsx`](src/components/overlay/GiftFeed.jsx:1).

### Verified Abilities
- ✅ Donut (`silent_challenge`)
- ✅ Cowboy Hat (`creative_challenge`)
- ✅ Galaxy (`ultimate_galaxy`)
- ✅ Money Gun (`epic_impact`)

### Architecture / Event Flow
- `giftEventBridge.processExternalGift()` -> `normalized:gift` -> `giftAbilityResolver.resolveGiftToAbility()` -> `abilityEventQueue.enqueue()` -> `ability:started` -> `Overlay.jsx` state sync -> `ScoreBoard` / `TeamPanel` / `GiftFeed` visual render.

### Build Status
- Build: Success (`vite build` passed with exit code 0).

## [v0.5.0] - 2026-08-03

### Added
- **Compact Dashboard Grid:** Reorganized the Admin Panel into a clean, two-column layout to eliminate excessive scrolling and improve usability during live broadcasts.
- **Advanced Timer Controls:** Fully functional Start, Pause, Resume, and Reset buttons with persistent initial durations and resume fallbacks.
- **Complete Player Removal Cascade:** Added cascading player deletion that purges participant references from players, teams, and battle rosters instantly.
- **Professional Broadcast Overlay:** Redesigned the stream HUD (`overlay.css` & [`overlay.jsx`](src/components/overlay.jsx:1)) adopting an ESPN/NBA professional sports scoreboard aesthetic with a vibrant tropical sunset theme.
- **Rounds Won Indicator:** Added a dedicated match statistics box inside each team card displaying current round wins (`team.wins`).
- **Tropical Coconut Contributions:** Enhanced player MVP lists with the signature coconut format (`Player Name Number🥥`).

### Changed
- Standardized typography and spacing for high-legibility in OBS and TikTok Live Studio.
- Optimized state polling and synchronization between `gameEngine`, `stateManager`, and `localStorage`.

### Fixed
- Fixed timer resume guards preventing restart when remaining seconds were at zero.
- Fixed orphan references when deleting participants assigned to active teams.
