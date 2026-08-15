import test from "node:test";
import assert from "node:assert";
import { giftEventBridge } from "../src/core/giftEventBridge.js";
import { giftResolver } from "../src/core/giftResolver.js";
import { giftActionDispatcher } from "../src/core/giftActionDispatcher.js";
import { tikfinityAdapter } from "../src/core/connectors/tikfinityAdapter.js";
import { configManager } from "../src/core/configManager.js";
import { getPlayers, clearPlayers } from "../src/core/playerManager.js";

test("Forensic Gift Scoring & Idempotency Test Suite", async (t) => {
  // Setup mock configuration rules
  configManager.set("giftRules", {
    context: [
      { giftId: "rose", name: "Rose", value: 1, action: "Add points", active: true },
      { giftId: "ice_cream", name: "Ice Cream", value: 5, action: "Add points", active: true }
    ]
  });

  clearPlayers();

  await t.test("Test 1: 1 Gift (1 pt)", () => {
    clearPlayers();
    const payload = {
      source: "tikfinity",
      giftId: "rose",
      username: "PlayerOne",
      quantity: 1,
      diamondValue: 1,
      eventId: "EVT-101"
    };
    tikfinityAdapter.handleTikfinityPayload(payload);
    const players = getPlayers();
    const p = players.find(x => x.name === "PlayerOne");
    assert.strictEqual(p.points, 1, "Expected 1 point for 1 gift");
  });

  await t.test("Test 2: 2 Gifts", () => {
    clearPlayers();
    const payload = {
      source: "tikfinity",
      giftId: "rose",
      username: "PlayerTwo",
      quantity: 2,
      diamondValue: 1,
      eventId: "EVT-102"
    };
    tikfinityAdapter.handleTikfinityPayload(payload);
    const players = getPlayers();
    const p = players.find(x => x.name === "PlayerTwo");
    assert.strictEqual(p.points, 2, "Expected 2 points for quantity 2");
  });

  await t.test("Test 3: 3 Gifts", () => {
    clearPlayers();
    const payload = {
      source: "tikfinity",
      giftId: "rose",
      username: "PlayerThree",
      quantity: 3,
      diamondValue: 1,
      eventId: "EVT-103"
    };
    tikfinityAdapter.handleTikfinityPayload(payload);
    const players = getPlayers();
    const p = players.find(x => x.name === "PlayerThree");
    assert.strictEqual(p.points, 3, "Expected 3 points for quantity 3");
  });

  await t.test("Test 4: Duplicate ID idempotency (same eventId received twice)", () => {
    clearPlayers();
    const payload = {
      source: "tikfinity",
      giftId: "rose",
      username: "PlayerDup",
      quantity: 1,
      diamondValue: 1,
      eventId: "TEST-DUPLICATE-001"
    };
    // First transmission
    tikfinityAdapter.handleTikfinityPayload(payload);
    // Second transmission (duplicate eventId)
    tikfinityAdapter.handleTikfinityPayload(payload);

    const players = getPlayers();
    const p = players.find(x => x.name === "PlayerDup");
    assert.strictEqual(p.points, 1, "Duplicate eventId must be ignored; points should remain 1");
  });

  await t.test("Test 5: Different IDs", () => {
    clearPlayers();
    tikfinityAdapter.handleTikfinityPayload({
      source: "tikfinity",
      giftId: "rose",
      username: "PlayerDiff",
      quantity: 1,
      eventId: "TEST-DIFF-001"
    });
    tikfinityAdapter.handleTikfinityPayload({
      source: "tikfinity",
      giftId: "rose",
      username: "PlayerDiff",
      quantity: 1,
      eventId: "TEST-DIFF-002"
    });

    const players = getPlayers();
    const p = players.find(x => x.name === "PlayerDiff");
    assert.strictEqual(p.points, 2, "Different eventIds must both be processed (+2 total)");
  });

  await t.test("Test 6: Different point values (Rose = 1pt, Ice Cream = 5pt)", () => {
    clearPlayers();
    tikfinityAdapter.handleTikfinityPayload({
      source: "tikfinity",
      giftId: "rose",
      username: "PlayerVal",
      quantity: 1,
      eventId: "VAL-001"
    });
    tikfinityAdapter.handleTikfinityPayload({
      source: "tikfinity",
      giftId: "ice_cream",
      username: "PlayerVal",
      quantity: 1,
      eventId: "VAL-002"
    });

    const players = getPlayers();
    const p = players.find(x => x.name === "PlayerVal");
    assert.strictEqual(p.points, 6, "1 Rose (1) + 1 Ice Cream (5) = 6 points");
  });
});
