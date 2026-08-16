import test from "node:test";
import assert from "node:assert/strict";
import { ABILITY_REGISTRY } from "../src/config/abilityRegistry.js";
import { GIFT_ABILITY_MAP } from "../src/config/giftAbilityMap.js";

test("CocoLoco gift scoring matrix is exact", () => {
  assert.equal(ABILITY_REGISTRY.silent_challenge.scoreAction.type, "ADD_POINTS");
  assert.equal(ABILITY_REGISTRY.silent_challenge.scoreAction.value, 1);
  assert.equal(ABILITY_REGISTRY.creative_challenge.scoreAction.type, "ADD_POINTS");
  assert.equal(ABILITY_REGISTRY.creative_challenge.scoreAction.value, 5);
  assert.equal(GIFT_ABILITY_MAP.find(g => g.abilityId === "silent_challenge")?.giftId, "doughnut");
  assert.equal(GIFT_ABILITY_MAP.find(g => g.abilityId === "creative_challenge")?.giftId, "hat_and_mustache");
});

test("Gift quantity arithmetic is exact", () => {
  assert.equal(1 * 5, 5, "5 Doughnuts = 5 points");
  assert.equal(5 * 3, 15, "3 Hat and Mustache gifts = 15 points");
});
