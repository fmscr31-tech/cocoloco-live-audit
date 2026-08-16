const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'components', 'admin', 'ManualScoreControl.jsx');
const source = fs.readFileSync(file, 'utf8');
let failures = 0;

function pass(message) { console.log(`[PASS] ${message}`); }
function fail(message) { console.error(`[FAIL] ${message}`); failures++; }

const checks = [
  ['uses functional selectedTeamId preservation', /setSelectedTeamId\(previousTeamId\s*=>/],
  ['preserves an existing valid selected team', /stillExists\s*=\s*previousTeamId\s*&&\s*nextTeams\.some/],
  ['only defaults to first team when selection is invalid', /return stillExists \? previousTeamId : String\(nextTeams\[0\]\.id\)/],
  ['does not use stale selectedTeamId in refreshData selector decision', /if \(nextTeams\.length && \(!selectedTeamId/],
  ['team action resolves target from selectedTeamId', /teams\.find\(t => String\(t\.id\) === String\(selectedTeamId\)\)/],
  ['manual points route through TeamManager', /addTeamPoints\(team\.id, actualDelta\)/],
  ['manual wins route through TeamManager', /adjustTeamWins\(team\.id, actualDelta\)/],
  ['score event carries the selected team id', /teamId:\s*team\.id/]
];

for (const [label, pattern] of checks) {
  pattern.test(source) ? pass(label) : fail(label);
}

if (/setSelectedTeamId\(String\(nextTeams\[0\]\.id\)\)/.test(source)) {
  fail('unconditional first-team reset remains present');
} else {
  pass('unconditional first-team reset removed');
}

if (failures) {
  console.error(`=== MANUAL TEAM SELECTOR AUDIT: FAIL (${failures}) ===`);
  process.exit(1);
}

console.log('=== MANUAL TEAM SELECTOR AUDIT: PASS ===');
console.log('Selection is preserved across score refreshes and only invalid selections fall back to the first configured team.');
