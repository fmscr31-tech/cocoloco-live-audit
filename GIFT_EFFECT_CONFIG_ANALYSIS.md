# Gift & Effect Configuration Analysis Report v1.0

This analysis report identifies existing components, hardcoded values, and integration touchpoints prior to implementing dynamic gift and effect configuration from the Dashboard without creating new tabs or modifying overlay logic.

---

## 1. Reusable Existing Component
- **[`GiftConfigControls.jsx`](src/components/admin/GiftConfigControls.jsx:1) / [`AbilityManagerControls.jsx`](src/components/admin/AbilityManagerControls.jsx:1):** 
  - [`GiftConfigControls.jsx`](src/components/admin/GiftConfigControls.jsx:1) already provides rule management (selecting gifts, actions like add points / special event, values, and game modes).
  - [`AbilityManagerControls.jsx`](src/components/admin/AbilityManagerControls.jsx:1) provides toggles and duration configuration for abilities (`silent_challenge`, `creative_challenge`, `ultimate_galaxy`, `epic_impact`).
  - **Reused Space:** These existing config panels (housed in the Game Configuration / Gift Configuration tabs) can be extended or unified to manage gift-to-ability mappings, effect types, point/round values, and durations.

## 2. Currently Hardcoded Values
- **Ability Durations & Actions:** Defined statically in [`abilityRegistry.js`](src/config/abilityRegistry.js:5) (e.g., `duration: 2500` for Donut/Cowboy, `6500` for Galaxy, `4000` for Money Gun).
- **Gift-to-Ability Mappings:** Defined statically in [`giftAbilityMap.js`](src/config/giftAbilityMap.js:5) (`donut`, `sombrero`, `galaxy`, `money_gun`).
- **Freeze Effect Parameters:** Defined statically in [`battleEffectEngine.js`](src/core/engines/battleEffectEngine.js:22) (`duration: 30`, `activationGift: "STAR"`).
- **Gift Rules & Point Values:** Defined statically in [`giftRules.js`](src/data/giftRules.js:2) and [`gifts.js`](src/data/gifts.js:1).

## 3. Files That Need to Read New Dynamic Configuration
- **[`configManager.js`](src/core/configManager.js:1):** Central configuration hub acting as source of truth for dynamic settings.
- **[`giftAbilityResolver.js`](src/core/giftAbilityResolver.js:1):** Should consult dynamic config (via `configManager` or `abilityManager`) for ability parameters, mapped gifts, and durations.
- **[`battleEffectEngine.js`](src/core/engines/battleEffectEngine.js:1):** Should consult dynamic config for freeze duration and activation gift instead of hardcoded defaults.
- **[`abilityManager.js`](src/core/abilityManager.js:1):** Should support runtime updates to ability properties (duration, points, rounds).
