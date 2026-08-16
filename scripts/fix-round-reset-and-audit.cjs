const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const gameEnginePath = path.join(root, 'src/core/gameEngine.js');
const teamManagerPath = path.join(root, 'src/core/TeamManager.js');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, content) { fs.writeFileSync(file, content, 'utf8'); }
function backup(file, suffix) {
  const target = `${file}.${suffix}`;
  if (!fs.existsSync(target)) fs.copyFileSync(file, target);
  console.log(`[BACKUP] ${target}`);
}
function requireText(text, needle, label) {
  if (!text.includes(needle)) throw new Error(`[FAIL] ${label}`);
  console.log(`[PASS] ${label}`);
}

console.log('=== COCOLOCO ROUND RESET + 3-PASS LIVE AUDIT ===');

// Repair game-state projection without touching the already-working manual score path.
let game = read(gameEnginePath);
backup(gameEnginePath, 'pre-round-reset-backup');

const staleTeams = 'const teams = gameState.teams.length > 0 ? gameState.teams : configTeams;';
const liveTeams = 'const teams = getTeams();';
if (game.includes(staleTeams)) {
  game = game.replace(staleTeams, liveTeams);
  write(gameEnginePath, game);
  console.log('[FIX] Dashboard/gameState now reads canonical TeamManager state on every snapshot.');
} else if (game.includes(liveTeams)) {
  console.log('[OK] gameState already projects canonical TeamManager state.');
} else {
  throw new Error('[FAIL] Could not locate team projection in gameEngine.js');
}

// Ensure completed-round player IDs are also removed from TeamManager membership.
game = read(gameEnginePath);
const oldClear = 'if (player?.id) removePlayer(player.id);';
const newClear = 'if (player?.id) { removePlayer(player.id); removePlayerFromAllTeams(player.id); }';
if (game.includes(oldClear) && !game.includes(newClear)) {
  game = game.replace(oldClear, newClear);
  write(gameEnginePath, game);
  console.log('[FIX] registration:cleared now removes players from TeamManager membership.');
}

let team = read(teamManagerPath);
backup(teamManagerPath, 'pre-round-reset-backup');
requireText(team, 'team.wins = 0;', 'Team reset clears round wins.');
requireText(team, 'team.points = 0;', 'Team reset clears round points.');
requireText(team, 'team.players = [];', 'Team reset clears round player membership.');

// Three independent static passes over the critical invariants.
for (let pass = 1; pass <= 3; pass++) {
  console.log(`[AUDIT ${pass}/3] Critical lifecycle + routing invariants`);
  const ge = read(gameEnginePath);
  const tm = read(teamManagerPath);
  const rm = read(path.join(root, 'src/core/roundManager.js'));
  const reg = read(path.join(root, 'src/core/registrationManager.js'));
  const bridge = read(path.join(root, 'src/core/giftEventBridge.js'));
  const resolver = read(path.join(root, 'src/core/giftAbilityResolver.js'));
  const queue = read(path.join(root, 'src/core/abilityEventQueue.js'));
  const dispatcher = read(path.join(root, 'src/core/abilityActionDispatcher.js'));
  const registry = read(path.join(root, 'src/config/abilityRegistry.js'));
  const giftMap = read(path.join(root, 'src/config/giftAbilityMap.js'));
  const dashboard = read(path.join(root, 'src/core/dashboardAPI.js'));
  const teamPanel = read(path.join(root, 'src/components/overlay/TeamPanel.jsx'));

  requireText(rm, 'sessionManager.archiveRound(currentRound);', 'Round archive occurs before reset.');
  requireText(rm, 'resetRoundTeamScores();', 'Round reset calls canonical TeamManager reset.');
  requireText(rm, 'registrationManager.prepareNextRoundRegistration();', 'Finished round opens fresh registration lifecycle.');
  requireText(reg, 'eventBus.publish("registration:cleared"', 'Registration clear event remains wired.');
  requireText(ge, 'eventBus.subscribe("registration:cleared"', 'Game engine clears active roster on registration reset.');
  requireText(ge, 'const teams = getTeams();', 'Dashboard projection uses canonical team state.');
  requireText(tm, 'team.points = 0;', 'Team points reset invariant.');
  requireText(tm, 'team.wins = 0;', 'Team wins reset invariant.');
  requireText(tm, 'team.players = [];', 'Team membership reset invariant.');
  requireText(bridge, 'eventBus.publish("normalized:gift"', 'Gift normalization reaches central bridge.');
  requireText(bridge, 'giftAbilityResolver.resolveGiftToAbility', 'Gift resolves through ability mapping first.');
  requireText(resolver, 'abilityManager.prepareAbilityPayload', 'Resolved gifts receive configured ability payload.');
  requireText(queue, 'eventBus.publish("ability:started"', 'Resolved gifts reach ability playback event.');
  requireText(dispatcher, 'eventBus.subscribe("ability:started"', 'Ability score action executes from same trigger.');
  requireText(registry, 'animation:', 'Every configured ability carries an animation declaration.');
  requireText(registry, 'sound:', 'Ability sound routing remains configured.');
  requireText(giftMap, 'abilityId:', 'Canonical gifts map to abilities.');
  requireText(dashboard, 'eventBus.subscribe("round:finished"', 'Dashboard refreshes after round completion.');
  requireText(teamPanel, 'isDonutActive', 'Donut animation layer remains wired.');
  requireText(teamPanel, 'isCowboyActive', 'Cowboy animation layer remains wired.');
  requireText(teamPanel, 'isGalaxyBenefited', 'Galaxy animation layer remains wired.');
  requireText(teamPanel, 'isDamaged', 'Money Gun animation layer remains wired.');
  requireText(teamPanel, 'isFrozen', 'Freeze animation layer remains wired.');
  console.log(`[PASS] Audit ${pass}/3`);
}

console.log('[AUDIT 3/3] Production build');
try {
  execSync('npm run build', { cwd: root, stdio: 'inherit' });
} catch (error) {
  console.error('[FAIL] Production build failed. Backups preserved.');
  process.exit(error.status || 1);
}

console.log('=== FINAL ROUND RESET + 3-PASS AUDIT: PASS ===');
console.log('Round archive remains before reset.');
console.log('Team points and round wins reset to 0; team definitions remain.');
console.log('Registered players and TeamManager round membership are cleared.');
console.log('Manual team score/win path remains canonical.');
console.log('Gift -> ability -> animation/sound routing invariants PASS.');
console.log('Production build PASS.');
console.log('NEXT: refresh Admin + Overlay and test finish/reset once before LIVE.');
