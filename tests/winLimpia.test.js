import test from "node:test";
import assert from "node:assert/strict";
import { eventBus } from "../src/core/eventBus.js";
import { addPlayer, getPlayers, clearPlayers } from "../src/core/playerManager.js";
import { playerWin } from "../src/core/gameEngine.js";

// Importing gameEngine wires the authoritative win:detected -> playerWin consumer.
// This test verifies the actual production event path, not a test-only helper.
test("WIN LIMPIA authoritative event pipeline", () => {
  clearPlayers();

  const player = addPlayer({
    playerId: "winner-001",
    username: "winner_user",
    displayName: "Winner User"
  });

  eventBus.publish("win:detected", {
    type: "WIN_LIMPIA",
    winLimpia: true,
    playerId: "winner-001",
    userId: "winner-001",
    username: "winner_user",
    displayName: "Winner User",
    source: "INTERACTIVE_CONTEXT"
  });

  const afterWin = getPlayers().find(p => p.id === player.id);
  assert.equal(afterWin.wins, 1);
  assert.equal(afterWin.points, 1);
  assert.equal(afterWin.wordsFound, 1);

  // A repeated signal for the same winner in the same round must be idempotent.
  eventBus.publish("win:detected", {
    type: "WIN_LIMPIA",
    winLimpia: true,
    playerId: "winner-001",
    source: "INTERACTIVE_CONTEXT"
  });

  const afterDuplicate = getPlayers().find(p => p.id === player.id);
  assert.equal(afterDuplicate.wins, 1);
  assert.equal(afterDuplicate.points, 1);

  // Direct canonical API remains functional and returns the same player without
  // creating a second win inside the same round.
  const direct = playerWin(player.id);
  assert.equal(direct.wins, 1);
  assert.equal(direct.points, 1);
});
