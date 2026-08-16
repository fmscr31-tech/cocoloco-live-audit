const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const individualPath = path.join(root, 'src', 'components', 'overlay', 'IndividualPanel.jsx');
const backupPath = `${individualPath}.final-prelive-backup`;

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exitCode = 1;
}

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

console.log('=== COCOLOCO FINAL PRE-LIVE REPAIR + 3-PASS AUDIT ===');

if (!fs.existsSync(individualPath)) {
  fail('IndividualPanel.jsx not found.');
  process.exit();
}

let source = fs.readFileSync(individualPath, 'utf8');
const limiter = /const sortedPlayers = \[\.\.\.sourcePlayers\]\.sort\(([\s\S]*?)\)\.slice\(0,\s*5\);/;

if (limiter.test(source)) {
  fs.copyFileSync(individualPath, backupPath);
  source = source.replace(limiter, 'const sortedPlayers = [...sourcePlayers].sort($1);');
  fs.writeFileSync(individualPath, source, 'utf8');
  console.log('[FIX] Removed Individual Mode TOP-5 limiter.');
} else if (source.includes('.slice(0, 5)')) {
  fs.copyFileSync(individualPath, backupPath);
  source = source.replace('.slice(0, 5)', '');
  fs.writeFileSync(individualPath, source, 'utf8');
  console.log('[FIX] Removed remaining Individual Mode TOP-5 limiter.');
} else {
  console.log('[OK] Individual Mode has no TOP-5 limiter.');
}

source = fs.readFileSync(individualPath, 'utf8');
const teamPanel = read('src/components/overlay/TeamPanel.jsx');
const dashboard = read('src/core/dashboardAPI.js');
const registration = read('src/core/registrationManager.js');
const roundManager = read('src/core/roundManager.js');
const gameEngine = read('src/core/gameEngine.js');
const manualScore = read('src/components/admin/ManualScoreControl.jsx');
const teamManager = read('src/core/TeamManager.js');
const giftBridge = read('src/core/giftEventBridge.js');
const abilityMap = read('src/config/giftAbilityMap.js');
const registry = read('src/config/abilityRegistry.js');

const checks = [
  ['Individual visibility', !source.includes('.slice(0, 5)')],
  ['Individual player sorting', source.includes('const sortedPlayers = [...sourcePlayers].sort')],
  ['Team MVP capacity >= 10', /\.slice\(0,\s*10\)/.test(teamPanel)],
  ['Registration/game player merge', dashboard.includes('registeredPlayers') && dashboard.includes('gamePlayers') && dashboard.includes('mergedPlayers')],
  ['Team registration assigns teamId', registration.includes('assignedTeamId') && registration.includes('teamId: assignedTeamId')],
  ['Registration persists to localStorage', registration.includes('STORAGE_KEY_PLAYERS') && registration.includes('localStorage.setItem')],
  ['Fresh registration method exists', registration.includes('prepareNextRoundRegistration') && registration.includes('reason: "ROUND_FINISHED"')],
  ['Finished round prepares fresh registration', roundManager.includes('registrationManager.prepareNextRoundRegistration()')],
  ['Game engine finishes active round through roundManager', gameEngine.includes('const finished = endRound()')],
  ['Manual team selector uses canonical configured teams', manualScore.includes('commandConfigManager.getConfig().teams') && manualScore.includes('syncConfiguredTeams')],
  ['Manual team points persist', manualScore.includes('addTeamPoints(team.id, actualDelta)')],
  ['Manual team wins persist', manualScore.includes('adjustTeamWins(team.id, actualDelta)')],
  ['TeamManager supports configured-team synchronization', teamManager.includes('function syncConfiguredTeams')],
  ['TeamManager supports persisted win adjustments', teamManager.includes('function adjustTeamWins')],
  ['Unregistered gift path has no registration gate', giftBridge.includes('eventBus.publish("normalized:gift", normalized)') && !giftBridge.includes('registrationManager.registerPlayer')],
  ['Canonical gift/ability map', ['donut','sombrero','galaxy','money_gun','amped_up'].every(id => abilityMap.includes(`giftId: "${id}"`))],
  ['Ability sounds/animations registered', registry.includes('sound:') && registry.includes('animation:')]
];

console.log('[AUDIT 1/3] Source integrity and lifecycle');
checks.forEach(([name, ok]) => console.log(`${ok ? '[PASS]' : '[FAIL]'} ${name}`));
if (checks.some(([, ok]) => !ok)) {
  fail('Source integrity audit failed.');
  process.exit();
}

console.log('[AUDIT 2/3] Regression/routing invariants');
const regressionChecks = [
  ['Registration clear event remains wired to game state cleanup', gameEngine.includes('eventBus.subscribe("registration:cleared"')],
  ['Round archive occurs before registration cleanup', roundManager.indexOf('sessionManager.archiveRound(currentRound);') < roundManager.indexOf('registrationManager.prepareNextRoundRegistration();')],
  ['Gift bridge still resolves abilities before legacy fallback', giftBridge.indexOf('giftAbilityResolver.resolveGiftToAbility') < giftBridge.indexOf('giftResolver.resolveGiftEvent')],
  ['Manual scoring remains independent from registration lock', !manualScore.includes('registrationManager.lockRegistration()')],
  ['Team reset remains limited to round points', read('src/core/TeamManager.js').includes('team.points = 0') && !read('src/core/TeamManager.js').includes('team.wins = 0;\n  });')]
];
regressionChecks.forEach(([name, ok]) => console.log(`${ok ? '[PASS]' : '[FAIL]'} ${name}`));
if (regressionChecks.some(([, ok]) => !ok)) {
  fail('Regression audit failed.');
  process.exit();
}

console.log('[AUDIT 3/3] Running production build...');
try {
  execSync('npm run build', { cwd: root, stdio: 'inherit' });
} catch {
  fail('Production build failed. Backup remains available.');
  process.exit();
}

console.log('=== FINAL PRE-LIVE AUDIT: PASS ===');
console.log('Individual: all registered players visible.');
console.log('Teams: up to 10 MVPs per team.');
console.log('Manual team points and round wins: routed through canonical TeamManager.');
console.log('Each finished round archives first, then clears old registrations and opens a fresh registration window.');
console.log('Unregistered viewers can still trigger configured gift/ability processing.');
console.log('Production build: PASS.');
console.log('Do NOT start LIVE until the overlay and Admin panel are visually validated after refresh.');
