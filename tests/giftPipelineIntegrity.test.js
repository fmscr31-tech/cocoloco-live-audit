import test from "node:test";
import assert from "node:assert/strict";
import { resolveCanonicalGiftId } from "../src/config/canonicalGifts.js";
import { giftEventBridge } from "../src/core/giftEventBridge.js";
import { getPlayers, clearPlayers } from "../src/core/playerManager.js";

const canonicalCases = [
  ["Ice Cream Cone", "ice_cream"],
  ["Doughnut", "doughnut"],
  ["Hat and Mustache", "hat_and_mustache"],
  ["Twinkling Star", "twinkling_star"],
  ["Coconut", "coconut"],
  ["Amped Up", "amped_up"],
  ["Money Gun", "money_gun"],
  ["Galaxy", "galaxy"]
];

test("Gift pipeline canonical registry covers the eight official gifts", () => {
  for (const [name, expectedId] of canonicalCases) {
    const resolved = resolveCanonicalGiftId({ giftName: name });
    assert.ok(resolved, `Expected canonical gift for ${name}`);
    assert.equal(resolved.canonicalId, expectedId, `Wrong canonical ID for ${name}`);
  }
});

test("Gift pipeline ignores intermediate TikTok streak events", () => {
  clearPlayers();

  giftEventBridge.processExternalGift({
    source: "tikfinity",
    giftId: "rose",
    giftName: "Rose",
    username: "StreakPlayer",
    quantity: 1,
    giftType: 1,
    repeatEnd: false,
    eventId: "STREAK-1"
  });

  assert.equal(getPlayers().length, 0, "Intermediate streak event must not execute the gift action");

  giftEventBridge.processExternalGift({
    source: "tikfinity",
    giftId: "rose",
    giftName: "Rose",
    username: "StreakPlayer",
    quantity: 3,
    giftType: 1,
    repeatEnd: true,
    eventId: "STREAK-3"
  });

  const player = getPlayers().find(p => p.name === "StreakPlayer");
  assert.ok(player, "Final streak event should execute");
  assert.equal(player.points, 3, "Only the final repeatCount should be awarded");
});
