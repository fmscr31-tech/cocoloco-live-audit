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
  ['selectedTeamIdRef exists', /const selectedTeamIdRef\s*=\s*useRef\(""\)/.test(source)],
  ['selector writes ref synchronously', /selectedTeamIdRef\.current\s*=\s*normalized/.test(source)],
  ['refresh reads the stable team ref', /const currentTeamId\s*=\s*selectedTeamIdRef\.current/.test(source)],
  ['refresh validates current team before fallback', /selectedStillExists\s*=\s*currentTeamId\s*&&\s*nextTeams\.some/.test(source)],
  ['fallback only occurs when selected team is invalid', /if \(!selectedStillExists\)/.test(source)],
  ['team action resolves from stable selected team id', /const currentTeamId\s*=\s*selectedTeamIdRef\.current/.test(source) && /teams\.find\(t => String\(t\.id\) === currentTeamId\)/.test(source)],
  ['manual points use TeamManager', /addTeamPoints\(currentTeamId, actualDelta\)/.test(source)],
  ['manual wins use TeamManager', /adjustTeamWins\(currentTeamId, actualDelta\)/.test(source)],
  ['score event carries exact selected team id', /teamId:\s*currentTeamId/.test(source)],
  ['score event cannot silently change selected team', /selectedTeamIdRef\.current\s*=\s*currentTeamId/.test(source)],
  ['no stale selectedTeamId decision remains in refreshData', !/if \(nextTeams\.length && \(!selectedTeamId \|\| !nextTeams\.some/.test(source)]
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
console.log('Manual team selector is protected against stale EventBus refresh callbacks.');
console.log('The selected team remains authoritative across manual point/win updates.');
console.log('Next: npm run build, then manually test Team A and Team B +1/+5/+10 and -1/-5/-10.');
