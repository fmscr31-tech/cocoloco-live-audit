# Game Modes Architecture & Future Design: CocoLoco Live Manager

## 1. Purpose of the Game Mode System
The Game Mode System is designed to expand CocoLoco Live Manager from a static manual scoring tool into a dynamic, automated, and versatile live-streaming competition platform. It decouples the core scoring engine from specific event formats, allowing hosts to seamlessly switch between individual tournaments, team wars, and community-driven themed events with automated participant registration and real-time gift/interaction tracking.

---

## 2. Supported Competition Modes
- **Individual Tournament (Free-for-All):** 
  - All participating players compete individually on a global leaderboard.
  - Rankings are determined purely by accumulated points, wins, or gifts received during active rounds.
- **Team Battles (Multi-Team Wars):**
  - Players are grouped into 2 or more distinct teams (e.g., Red Team vs. Blue Team).
  - Both individual contributions and collective team totals are tracked simultaneously.
- **Special Themed Battles:**
  - Custom matchmaking formats such as "Boys vs. Girls", "Creators vs. Followers", or community faction battles.
  - Supports dynamic team assignment based on chat keywords, gifts, or moderator selection.

---

## 3. Registration System
- **Entry Period:** 
  - A configurable pre-game phase where the registration window is open before a round or battle officially begins.
- **TikTok Gifts & Commands Registration:**
  - Users automatically register as participants by sending a specific entry gift (e.g., a rose or designated coin gift) or typing a chat command (e.g., `!join`, `!participar`).
- **Configurable Entry Requirements:**
  - Hosts can set minimum requirements, such as requiring specific follow status, subscriber badges, or entry gift thresholds to enter active brackets.

---

## 4. Scoring System
- **Individual Player Points:** 
  - Tracks specific metrics per user: wins, matches played, gift value contributed, and win streaks.
- **Team Accumulated Points:** 
  - Aggregates individual member scores into a collective team score in real-time.
- **Gift-to-Points Conversion Concept:** 
  - A configurable multiplier system where TikTok gifts (Diamonds/Coins) automatically convert into game points or wins based on host rules (e.g., 1 Rose = 1 Point, 1 Universe = 1000 Points).

---

## 5. Overlay Requirements
- **Individual Rankings:** 
  - Dynamic top-player (MVP) leaderboards that update instantly as points are scored.
- **Multi-Team Display:** 
  - Ability to render 2, 3, or 4 teams simultaneously on the broadcast HUD with responsive scaling.
- **Dynamic Layout Adaptation:** 
  - The overlay automatically switches its visual template depending on the active competition mode (e.g., 1v1 split screen, 4-way team battle grid, or individual free-for-all podium).

---

## 6. Future TikTok Live / Interactive Context Integration
- **Gifts:** Automatic detection of incoming TikTok gifts to trigger points, win increments, and screen celebrations.
- **Chat Commands:** Real-time processing of chat messages for registration (`!join`), voting, or mini-games.
- **Automatic Player Registration:** Zero-touch participant onboarding directly from the live stream stream feed.
- **Real-Time Score Updates:** Instantaneous synchronization between live events and the stream overlay without manual moderator intervention.

---

## 7. Required Future Modules
To support this architecture cleanly without disrupting current functionality, the following modules will be introduced in `src/core/`:
1. **`gameModeManager.js`**: Defines and switches between active competition rulesets (Individual, Team, Themed).
2. **`competitionManager.js`**: Handles bracket creation, round lifecycles, and match progression.
3. **`registrationManager.js`**: Manages entry periods, chat registration queues, and whitelist/blacklist rules.
4. **`giftManager.js`**: Handles incoming gift payloads, conversion rates, and point attribution.
5. **`rankingManager.js`**: Computes sophisticated leaderboards, tie-breakers, and MVP standings across different modes.

---

## 8. Integration with Current CocoLoco Architecture
- **Non-Breaking Extension:** The new managers will hook directly into the existing [`src/core/gameEngine.js`](src/core/gameEngine.js) and [`src/core/stateManager.js`](src/core/stateManager.js) layers using the established Pub/Sub pattern.
- **Unified State:** The global state tree managed by `stateManager.js` will be expanded to include `competitionMode`, `registrationStatus`, and `activeRules`, allowing both the Admin Panel and the Overlay to remain fully synchronized.
- **Backward Compatibility:** Manual mode (current functionality) will remain fully supported as the default fallback mode when automated TikTok integrations are inactive.
