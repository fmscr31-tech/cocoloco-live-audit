import test from 'node:test';
import assert from 'node:assert';
import { startTimer, pauseTimer, resumeTimer, stopTimer, resetTimer, getTimer } from '../src/core/timerManager.js';
import { registrationManager } from '../src/core/registrationManager.js';
import { getState, startGameTimer, pauseGameTimer, resumeGameTimer, resetGameTimer } from '../src/core/gameEngine.js';
import { eventBus } from '../src/core/eventBus.js';

test('Test 1 & 2 & 5: Timer Isolation in Individual and Team Modes with Persistence', () => {
  registrationManager.clearRegistration();
  registrationManager.openRegistration();
  registrationManager.registerPlayer({ playerId: 'p1', name: 'Carlos', teamId: 'team1', points: 100 });
  registrationManager.registerPlayer({ playerId: 'p2', name: 'Ana', teamId: 'team2', points: 150 });
  registrationManager.closeRegistration();

  const stateBefore = getState();
  const participantsBefore = JSON.parse(JSON.stringify(stateBefore.players));
  const teamsBefore = JSON.parse(JSON.stringify(stateBefore.teams));
  const regBefore = JSON.parse(JSON.stringify(stateBefore.registeredPlayers));

  const eventsEmitted = [];
  const unsubStarted = eventBus.subscribe("timer:started", (e) => eventsEmitted.push({ type: "started", e }));
  const unsubTick = eventBus.subscribe("timer:tick", (e) => eventsEmitted.push({ type: "tick", e }));
  const unsubPaused = eventBus.subscribe("timer:paused", (e) => eventsEmitted.push({ type: "paused", e }));
  const unsubResumed = eventBus.subscribe("timer:resumed", (e) => eventsEmitted.push({ type: "resumed", e }));
  const unsubStopped = eventBus.subscribe("timer:stopped", (e) => eventsEmitted.push({ type: "stopped", e }));
  const unsubReset = eventBus.subscribe("timer:reset", (e) => eventsEmitted.push({ type: "reset", e }));

  startGameTimer(5);
  assert.strictEqual(getTimer().running, true);

  pauseGameTimer();
  assert.strictEqual(getTimer().running, false);

  resumeGameTimer();
  assert.strictEqual(getTimer().running, true);

  stopTimer();
  assert.strictEqual(getTimer().running, false);

  resetGameTimer(5);
  assert.strictEqual(getTimer().running, false);

  unsubStarted();
  unsubTick();
  unsubPaused();
  unsubResumed();
  unsubStopped();
  unsubReset();

  const stateAfter = getState();
  const participantsAfter = JSON.parse(JSON.stringify(stateAfter.players));
  const teamsAfter = JSON.parse(JSON.stringify(stateAfter.teams));
  const regAfter = JSON.parse(JSON.stringify(stateAfter.registeredPlayers));

  assert.deepStrictEqual(participantsBefore, participantsAfter, "Participants must remain identical after timer lifecycle operations");
  assert.deepStrictEqual(teamsBefore, teamsAfter, "Teams must remain identical after timer lifecycle operations");
  assert.deepStrictEqual(regBefore, regAfter, "Registered players must remain identical after timer lifecycle operations");
  assert.ok(eventsEmitted.length > 0, "Timer events should be successfully emitted");
});

test('Test 3 & 4: Event Trace & React Isolation Check', () => {
  let participantChangeTriggered = false;
  const unsubPlayerUpdate = eventBus.subscribe("player:updated", () => {
    participantChangeTriggered = true;
  });
  const unsubPlayerCreated = eventBus.subscribe("player:created", () => {
    participantChangeTriggered = true;
  });

  startTimer(2);
  const t = getTimer();
  eventBus.emit("timer:tick", { timer: t, timestamp: Date.now() });
  pauseTimer();
  resumeTimer();
  stopTimer();
  resetTimer(10);

  unsubPlayerUpdate();
  unsubPlayerCreated();

  assert.strictEqual(participantChangeTriggered, false, "Timer events must NEVER trigger player creation or update events");
});
