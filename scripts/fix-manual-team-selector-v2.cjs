const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/components/admin/ManualScoreControl.jsx');
if (!fs.existsSync(file)) {
  console.error(`[FAIL] File not found: ${file}`);
  process.exit(1);
}

let source = fs.readFileSync(file, 'utf8');
const backup = `${file}.pre-selector-v2-backup`;
fs.copyFileSync(file, backup);

const oldState = '  const [selectedTeamId, setSelectedTeamId] = useState("");\n  const [feedback, setFeedback] = useState(null);';
const newState = '  const [selectedTeamId, setSelectedTeamId] = useState("");\n  const selectedTeamIdRef = useRef("");\n  const [feedback, setFeedback] = useState(null);';

if (!source.includes('selectedTeamIdRef')) {
  source = source.replace('import { useState, useEffect } from "react";', 'import { useState, useEffect, useRef } from "react";');
  if (!source.includes(oldState)) {
    console.error('[FAIL] Could not locate team selection state block. Backup preserved; no source changes made.');
    process.exit(1);
  }
  source = source.replace(oldState, newState);
}

const oldRefresh = `    if (selectedPlayerId && !players.some(p => String(p.id || p.playerId) === String(selectedPlayerId))) setSelectedPlayerId("");\n    if (nextTeams.length && (!selectedTeamId || !nextTeams.some(t => String(t.id) === String(selectedTeamId)))) {\n      setSelectedTeamId(String(nextTeams[0].id));\n    }`;
const newRefresh = `    const currentTeamId = selectedTeamIdRef.current;\n    if (selectedPlayerId && !players.some(p => String(p.id || p.playerId) === String(selectedPlayerId))) setSelectedPlayerId("");\n    if (nextTeams.length) {\n      const hasCurrentTeam = currentTeamId && nextTeams.some(t => String(t.id) === String(currentTeamId));\n      if (!hasCurrentTeam) {\n        const fallbackTeamId = String(nextTeams[0].id);\n        selectedTeamIdRef.current = fallbackTeamId;\n        setSelectedTeamId(fallbackTeamId);\n      }\n    } else {\n      selectedTeamIdRef.current = "";\n      setSelectedTeamId("");\n    }`;
if (source.includes(oldRefresh)) {
  source = source.replace(oldRefresh, newRefresh);
} else if (!source.includes('const currentTeamId = selectedTeamIdRef.current;')) {
  console.error('[FAIL] Could not locate refreshData selector block. Backup preserved; no source changes made.');
  process.exit(1);
}

const oldSelect = '<select value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)}';
const newSelect = '<select value={selectedTeamId} onChange={e => { const value = e.target.value; selectedTeamIdRef.current = value; setSelectedTeamId(value); }}';
if (source.includes(oldSelect)) {
  source = source.replace(oldSelect, newSelect);
} else if (!source.includes('selectedTeamIdRef.current = value')) {
  console.error('[FAIL] Could not locate team selector control. Backup preserved; no source changes made.');
  process.exit(1);
}

// Ensure the ref is synchronized if React state is initialized/fallback-selected elsewhere.
const marker = '  const showFeedback = (message, isError = false) => {';
if (!source.includes('selectedTeamIdRef.current = selectedTeamId;')) {
  const sync = '  useEffect(() => { selectedTeamIdRef.current = selectedTeamId; }, [selectedTeamId]);\n\n';
  if (!source.includes(marker)) {
    console.error('[FAIL] Could not locate insertion point for selector ref synchronization. Backup preserved; no source changes made.');
    process.exit(1);
  }
  source = source.replace(marker, sync + marker);
}

fs.writeFileSync(file, source, 'utf8');
console.log(`[FIX] Manual team selector now preserves the selected team across refresh events.`);
console.log(`[FIX] Selector changes update a ref immediately, preventing stale-event fallback to team 1.`);
console.log(`[BACKUP] ${backup}`);
console.log('[NEXT] Run: node scripts/audit-manual-team-selector-v2.cjs');
