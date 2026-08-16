const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'components', 'overlay', 'TeamPanel.jsx');

if (!fs.existsSync(file)) {
  console.error(`[FAIL] Missing ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, 'utf8');
const broken = '  }, [topPlayers]);';
const fixed = `  }, [topPlayers.map(player => {\n    const id = player?.id ?? "";\n    const points = Number(player?.points) || 0;\n    const wins = Number(player?.wins) || 0;\n    const messages = Number(player?.messages) || 0;\n    return \`${id}:${points}:${wins}:${messages}\`;\n  }).join("|")]);`;

if (!source.includes(broken)) {
  const alreadyFixed = source.includes('topPlayers.map(player => {') && source.includes('.join("|")]);');
  if (alreadyFixed) {
    console.log('[OK] TeamPanel rank effect is already protected from render-loop updates.');
    process.exit(0);
  }
  console.error('[FAIL] Expected TeamPanel dependency pattern was not found. No changes made.');
  process.exit(1);
}

const backup = `${file}.pre-overlay-score-fix-backup`;
if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);

const updated = source.replace(broken, fixed);
fs.writeFileSync(file, updated, 'utf8');

console.log('[FIX] TeamPanel rank-delta effect no longer depends on a freshly-created array reference.');
console.log('[FIX] Overlay score updates now rerender without recursively retriggering the rank effect.');
console.log(`[BACKUP] ${backup}`);
console.log('[NEXT] Run: npm run build');
