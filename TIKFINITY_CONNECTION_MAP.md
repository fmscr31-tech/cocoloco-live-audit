# Tikfinity Real Event Connection Map v1.0

This technical map details how real TikTok Live events originating from Tikfinity enter and traverse the CocoLoco Live Manager architecture. No code modifications were performed.

---

## 1. Where Tikfinity Events Enter CocoLoco Live Manager
Tikfinity events enter the system via webhook HTTP requests or WebSocket messages received by the Node.js connector bridge (`bridge/server.js`) or routed directly through the frontend connector adapter layer located at [`src/core/connectors/tikfinityAdapter.js`](src/core/connectors/tikfinityAdapter.js:1).

## 2. Which File Receives the First External Gift Payload
The first file to ingest and process raw external payloads from Tikfinity is [`src/core/connectors/tikfinityAdapter.js`](src/core/connectors/tikfinityAdapter.js:1).

## 3. Which Function Converts It
- **[`tikfinityAdapter.parseTikfinityEvent(rawPayload)`](src/core/connectors/tikfinityAdapter.js:17):** Validates whether the incoming payload is a gift event (checking `event === "gift"`, `type === "gift"`, `giftName`, or `giftId`).
- **[`giftEventBridge.processExternalGift(normalizedPayload)`](src/core/giftEventBridge.js:57):** Normalizes the extracted properties (`giftId`, `username`, `quantity`, `diamondValue`, `teamId`, `duration`) and publishes a `"normalized:gift"` event onto the [`eventBus`](src/core/eventBus.js:1).

## 4. Which Gifts Currently Have Mappings
Defined in [`src/config/giftAbilityMap.js`](src/config/giftAbilityMap.js:5):
- **Donut / Donas / Donuts:** Mapped to ability `silent_challenge` (El Mudo).
- **Sombrero / Cowboy Hat / Hat:** Mapped to ability `creative_challenge` (Reto Creativo).
- **Galaxy / Galaxia:** Mapped to ability `ultimate_galaxy` (Ultimate Energy +1 Round).
- **Money Gun / Pistola de dinero:** Mapped to ability `epic_impact` (Bullet Storm / Score Reset to 0).
- **Star / Freeze:** Mapped via [`battleEffectEngine.js`](src/core/engines/battleEffectEngine.js:27) as activation/counter gifts for team/global freeze effects.

## 5. Example Payload Expected From Tikfinity
```json
{
  "event": "gift",
  "nickname": "TikTokFan99",
  "giftName": "Donut",
  "repeatCount": 5,
  "diamondCount": 30
}
```

## 6. What Happens if the Payload is Missing Fields
- **Missing username/nickname:** Defaults to `"Viewer"` (in [`tikfinityAdapter.js`](src/core/connectors/tikfinityAdapter.js:36)).
- **Missing gift name/id:** Defaults to `"rose"` (in [`tikfinityAdapter.js`](src/core/connectors/tikfinityAdapter.js:37)).
- **Missing quantity/repeatCount:** Defaults to `1` (in [`tikfinityAdapter.js`](src/core/connectors/tikfinityAdapter.js:38)).
- **Missing teamId:** Defaults to `"team1"` (or `"team2"` for `epic_impact`) via [`giftAbilityResolver.js`](src/core/giftAbilityResolver.js:32).
- **Unmapped gifts:** If a gift does not match any ability in [`giftAbilityMap.js`](src/config/giftAbilityMap.js:5), [`giftEventBridge.js`](src/core/giftEventBridge.js:36) falls back to legacy [`giftResolver.js`](src/core/giftResolver.js:16) to award standard points without crashing or breaking the stream.

## 7. What Must Be Configured Before Opening TikTok LIVE
1. **Bridge Server:** Ensure the bridge server (`node bridge/server.js`) is running if ingesting via local websocket/webhook.
2. **Tikfinity Webhook URL:** Point Tikfinity's webhook destination to the running CocoLoco bridge/connector endpoint.
3. **Active Session:** Ensure an active match session and teams are initialized in the Admin Panel.
4. **Overlay Browser Source:** Load the broadcast overlay (`/overlay`) in OBS Studio or TikTok Live Studio.
