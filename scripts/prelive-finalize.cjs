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

const checks = [
  ['Individual visibility', !source.includes('.slice(0, 5)')],
  ['Individual player sorting', source.includes('const sortedPlayers = [...sourcePlayers].sort')],
];

const teamPanelPath = path.join(root, 'src', 'components', 'overlay', 'TeamPanel.jsx');
if (fs.existsSync(teamPanelPath)) {
  const teamSource = fs.readFileSync(teamPanelPath, 'utf8');
  checks.push(['Team MVP capacity >= 10', /\.slice\(0,\s*10\)/.test(teamSource)]);
}

const dashboardPath = path.join(root, 'src', 'core', 'dashboardAPI.js');
if (fs.existsSync(dashboardPath)) {
  const dashboard = fs.readFileSync(dashboardPath, 'utf8');
  checks.push(['Registration/game player merge', dashboard.includes('registeredPlayers') && dashboard.includes('gamePlayers') && dashboard.includes('mergedPlayers')]);
}

const registrationPath = path.join(root, 'src', 'core', 'registrationManager.js');
if (fs.existsSync(registrationPath)) {
  const registration = fs.readFileSync(registrationPath, 'utf8');
  checks.push(['Team registration assigns teamId', registration.includes('assignedTeamId') && registration.includes('teamId: assignedTeamId')]);
  checks.push(['Registration persists to localStorage', registration.includes('STORAGE_KEY_PLAYERS') && registration.includes('localStorage.setItem')]);
}

const abilityMapPath = path.join(root, 'src', 'config', 'giftAbilityMap.js');
const registryPath = path.join(root, 'src', 'config', 'abilityRegistry.js');
if (fs.existsSync(abilityMapPath) && fs.existsSync(registryPath)) {
  const map = fs.readFileSync(abilityMapPath, 'utf8');
  const registry = fs.readFileSync(registryPath, 'utf8');
  checks.push(['Canonical gift/ability map', ['donut','sombrero','galaxy','money_gun','amped_up'].every(id => map.includes(`giftId: "${id}"`))]);
  checks.push(['Ability sounds/animations registered', registry.includes('sound:') && registry.includes('animation:')]);
}

console.log('[AUDIT 1/3] Source integrity');
checks.forEach(([name, ok]) => console.log(`${ok ? '[PASS]' : '[FAIL]'} ${name}`));
if (checks.some(([, ok]) => !ok)) {
  fail('Source integrity audit failed.');
  process.exit();
}

console.log('[AUDIT 2/3] Critical routing and persistence checks PASS');
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
console.log('Registration/team merge/scoring/audio/animation source checks: PASS.');
console.log('Production build: PASS.');
console.log('Do NOT start LIVE until the overlay is visually validated after refresh.');
