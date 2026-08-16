const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/components/admin/ManualScoreControl.jsx');
if (!fs.existsSync(file)) {
  console.error('[FAIL] ManualScoreControl.jsx not found.');
  process.exit(1);
}

const source = fs.readFileSync(file, 'utf8');
const checks = [
  ['useRef imported for stable selector state', /import \{[^}]*useRef[^}]*\} from ["']react["']/.test(source)],
  ['selectedTeamIdRef exists', /selectedTeamIdRef/.test(source)],
  ['selector writes ref immediately', /selectedTeamIdRef\.current\s*=\s*value/.test(source)],
  ['refresh reads ref instead of stale selectedTeamId', /const currentTeamId = selectedTeamIdRef\.current/.test(source)],
  ['valid selected team is preserved', /hasCurrentTeam\s*=\s*currentTeamId/.test(source)],
  ['fallback only occurs when current team is invalid', /if \(!hasCurrentTeam\)/.test(source)],
  ['team action resolves from selectedTeamId', /teams\.find\(t => String\(t\.id\) === String\(selectedTeamId\)\)/.test(source)],
  ['manual points use TeamManager', /addTeamPoints\(team\.id, actualDelta\)/.test(source)],
  ['manual wins use TeamManager', /adjustTeamWins\(team\.id, actualDelta\)/.test(source)],
  ['score event carries exact selected team id', /teamId:\s*team\.id/.test(source)],
  ['no unconditional first-team reset remains', !/\(!selectedTeamId \|\| !nextTeams\.some/.test(source)]
];

let failures = 0;
for (const [label, ok] of checks) {
  if (ok) console.log(`[PASS] ${label}`);
  else { console.log(`[FAIL] ${label}`); failures++; }
}

if (failures) {
  console.log(`=== MANUAL TEAM SELECTOR V2 AUDIT: FAIL (${failures}) ===`);
  process.exit(1);
}
console.log('=== MANUAL TEAM SELECTOR V2 AUDIT: PASS ===');
console.log('Selector state is protected from stale refresh callbacks.');
console.log('Next: npm run build, then manually test A/B +/− points and wins.');
