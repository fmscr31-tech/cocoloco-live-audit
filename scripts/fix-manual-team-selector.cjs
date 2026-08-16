const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'components', 'admin', 'ManualScoreControl.jsx');
const backup = `${file}.pre-team-selector-fix-backup`;

if (!fs.existsSync(file)) {
  console.error(`[FAIL] Missing ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, 'utf8');
if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);

const old = `    setPlayers(buildCanonicalPlayers());\n\n    const configTeams = commandConfigManager.getConfig().teams || [];\n    const runtimeTeams = getTeams();\n    const nextTeams = forceTeamSync || runtimeTeams.length === 0\n      ? syncConfiguredTeams(configTeams)\n      : runtimeTeams;\n    setTeams(nextTeams);\n\n    if (selectedPlayerId && !players.some(p => String(p.id || p.playerId) === String(selectedPlayerId))) setSelectedPlayerId(\"\");\n    if (nextTeams.length && (!selectedTeamId || !nextTeams.some(t => String(t.id) === String(selectedTeamId)))) {\n      setSelectedTeamId(String(nextTeams[0].id));\n    }`;

const replacement = `    const nextPlayers = buildCanonicalPlayers();\n    setPlayers(nextPlayers);\n\n    const configTeams = commandConfigManager.getConfig().teams || [];\n    const runtimeTeams = getTeams();\n    const nextTeams = forceTeamSync || runtimeTeams.length === 0\n      ? syncConfiguredTeams(configTeams)\n      : runtimeTeams;\n    setTeams(nextTeams);\n\n    // IMPORTANT: refreshData is subscribed once on mount. Reading selectedTeamId\n    // or players from that old closure can revert the selector to the first team\n    // after a score event. Preserve the CURRENT React selection and only choose\n    // a default when the selected target no longer exists.\n    setSelectedPlayerId(previousId => (\n      previousId && !nextPlayers.some(p => String(p.id || p.playerId) === String(previousId))\n        ? \"\"\n        : previousId\n    ));\n\n    setSelectedTeamId(previousTeamId => {\n      if (!nextTeams.length) return \"\";\n      const stillExists = previousTeamId && nextTeams.some(t => String(t.id) === String(previousTeamId));\n      return stillExists ? previousTeamId : String(nextTeams[0].id);\n    });`;

if (!source.includes(old)) {
  console.error('[FAIL] Expected refreshData selector block was not found. No source changes made.');
  process.exit(1);
}

const fixed = source.replace(old, replacement);
fs.writeFileSync(file, fixed, 'utf8');

console.log('[FIX] Manual team selector now preserves the currently selected team across score refresh events.');
console.log('[FIX] Default team is selected only when the previous selection is missing/invalid.');
console.log(`[BACKUP] ${backup}`);
console.log('[NEXT] Run: npm run build');
