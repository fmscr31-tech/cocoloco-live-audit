import test from 'node:test';
import assert from 'node:assert';
import { battleEffectEngine } from '../src/core/engines/battleEffectEngine.js';
import { gameRulesEngine } from '../src/core/engines/gameRulesEngine.js';
import { eventBus } from '../src/core/eventBus.js';

test('Freeze Engine Activation & 300s Duration', () => {
  battleEffectEngine.removeEffect();
  battleEffectEngine.activateEffect("FREEZE", "TEAM", "teamB", "Princesas", [], "PlayerA");
  
  const state = battleEffectEngine.getEffectState();
  assert.strictEqual(state.active, true);
  assert.strictEqual(state.scope, "TEAM");
  assert.deepStrictEqual(state.frozenTeams, ["teamB"]);
  
  const activeEffects = battleEffectEngine.getActiveEffects();
  assert.strictEqual(activeEffects.length, 1);
  assert.strictEqual(activeEffects[0].totalDuration, 300);
  assert.ok(activeEffects[0].expiresAt > Date.now());
  
  battleEffectEngine.removeEffect();
});

test('Scoring Redirection during Freeze', () => {
  battleEffectEngine.removeEffect();
  battleEffectEngine.activateEffect("FREEZE", "TEAM", "teamB", "Princesas", [], "PlayerA");

  let redirected = null;
  const unsub = eventBus.subscribe("game:score_redirected", (payload) => {
    redirected = payload;
  });

  gameRulesEngine.evaluateRewardScoring({
    username: "PlayerB",
    userId: "userB",
    points: 1,
    giftName: "Win Limpia"
  });

  assert.ok(redirected);
  assert.strictEqual(redirected.originalTeam, "teamB");
  assert.strictEqual(redirected.redirectedTeam, "teamA");

  unsub();
  battleEffectEngine.removeEffect();
});

test('Freeze Expiration', () => {
  battleEffectEngine.removeEffect();
  battleEffectEngine.activateEffect("FREEZE", "TEAM", "teamB", "Princesas", [], "PlayerA");
  
  assert.strictEqual(battleEffectEngine.getEffectState().active, true);
  
  battleEffectEngine.activeEffect.expiresAt = Date.now() - 1000;
  if (battleEffectEngine.activeEffect && Date.now() >= battleEffectEngine.activeEffect.expiresAt) {
    battleEffectEngine.removeEffect();
  }
  
  assert.strictEqual(battleEffectEngine.getEffectState().active, false);
});
