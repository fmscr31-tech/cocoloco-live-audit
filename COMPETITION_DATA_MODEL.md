# Competition Data Model & State Architecture: CocoLoco Live Manager

## 1. Competition Main Object
The master state container representing any active competition session:
```json
{
  "id": "comp_1722680000000",
  "name": "Epic TikTok Battle",
  "status": "waiting | running | finished",
  "activeGameMode": "individual | team | themed",
  "timers": {
    "duration": 1200,
    "remainingSeconds": 1200,
    "running": false
  },
  "registrationSettings": {
    "isOpen": false,
    "entryGiftId": "rose",
    "minGiftsRequired": 1,
    "autoApprove": true
  },
  "scoringRules": {
    "pointsPerWin": 100,
    "giftMultiplier": 1,
    "streakBonus": 10
  }
}
```

---

## 2. Individual Competition Data
Data structure for tracking individual participant performance:
```json
{
  "players": [
    {
      "id": "player_uuid_1",
      "name": "TikTokUser123",
      "displayName": "User 123",
      "avatar": "https://...",
      "score": 1250,
      "wins": 5,
      "streak": 3,
      "giftsContributed": 12,
      "rank": 1
    }
  ],
  "rankings": ["player_uuid_1", "player_uuid_2"],
  "prizes": {
    "1st": "Diamond Gift",
    "2nd": "Rose Bouquet"
  }
}
```

---

## 3. Team Competition Data
Data structure supporting multi-team wars and factions:
```json
{
  "teams": [
    {
      "id": "team_uuid_red",
      "name": "Red Titans",
      "color": "#ff3366",
      "icon": "🔥",
      "score": 4500,
      "wins": 2,
      "members": ["player_uuid_1", "player_uuid_3"]
    },
    {
      "id": "team_uuid_blue",
      "name": "Blue Vipers",
      "color": "#00bfff",
      "icon": "⚡",
      "score": 4200,
      "wins": 1,
      "members": ["player_uuid_2", "player_uuid_4"]
    }
  ]
}
```

---

## 4. Registration System Data
Payload tracking for automatic or manual participant onboarding:
```json
{
  "registration": {
    "periodActive": true,
    "requirements": {
      "command": "!join",
      "giftId": "rose"
    },
    "participants": [
      {
        "userId": "tik_tok_user_99",
        "username": "GamerGirl99",
        "registeredAt": 1722680100000,
        "status": "approved"
      }
    ]
  }
}
```

---

## 5. Gift Scoring Data
Mapping structure for real-time TikTok gift processing:
```json
{
  "giftMapping": {
    "rose": { "value": 1, "points": 10 },
    "ice_cream": { "value": 5, "points": 60 },
    "universe": { "value": 5000, "points": 50000 }
  },
  "contributionLog": [
    {
      "timestamp": 1722680200000,
      "playerId": "player_uuid_1",
      "giftId": "rose",
      "count": 5,
      "pointsEarned": 50
    }
  ]
}
```

---

## 6. Overlay Data Requirements
Regardless of the active competition mode, the stream overlay (`overlay.jsx`) requires a standardized normalized state payload:
```json
{
  "competitionName": "Epic TikTok Battle",
  "mode": "team",
  "teams": [ /* Array of active teams with scores and top 5 MVPs */ ],
  "players": [ /* Sorted global leaderboard if individual mode */ ],
  "timer": { "minutes": 18, "seconds": 45 },
  "activeAlert": "🔥 BATTLE STARTED",
  "penalty": { "active": false }
}
```

---

## 7. Admin Panel Requirements
The control dashboard (`App.jsx`) requires configuration hooks to manage:
- Mode selector (Individual vs. Team).
- Registration toggle (Open/Close entry).
- Gift conversion rule inputs.
- Manual participant override (Add/Remove/Assign).
- Timer controls (Start, Pause, Resume, Reset).

---

## 8. Integration with Current CocoLoco Architecture
- **[`src/core/gameEngine.js`](src/core/gameEngine.js):** Will consume the master competition object and delegate scoring events to respective mode rules.
- **[`src/core/stateManager.js`](src/core/stateManager.js):** Will broadcast normalized state updates (`getState()`) to all subscribed UI components.
- **[`src/core/playerManager.js`](src/core/playerManager.js):** Will continue managing player entities, extended with gift contribution counters.
- **[`src/core/TeamManager.js`](src/core/TeamManager.js):** Will manage multi-team arrays and aggregated scores.
- **[`src/components/overlay.jsx`](src/components/overlay.jsx):** Will render dynamic layouts based on `mode` provided in the standardized state payload.
- **[`src/App.jsx`](src/App.jsx):** Will provide form controls and dashboards to manipulate competition parameters.
