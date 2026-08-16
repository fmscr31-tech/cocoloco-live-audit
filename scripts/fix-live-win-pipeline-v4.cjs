const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.resolve(__dirname, '..');

function filePath(file) { return path.join(root, file); }
function read(file) { return fs.readFileSync(filePath(file), 'utf8'); }
function write(file, content) { fs.writeFileSync(filePath(file), content, 'utf8'); console.log(`[FIX] ${file}`); }

function restore(file) {
  cp.execFileSync('git', ['checkout', '--', file], { cwd: root, stdio: 'inherit' });
  console.log(`[RESTORE] ${file} from current HEAD`);
}

function findEffectContaining(src, token) {
  const startToken = 'useEffect(() => {';
  let search = 0;
  while (true) {
    const start = src.indexOf(startToken, search);
    if (start < 0) return null;
    let depth = 0, quote = null, escaped = false;
    for (let i = start; i < src.length; i++) {
      const c = src[i];
      if (escaped) { escaped = false; continue; }
      if (quote) {
        if (c === '\\') { escaped = true; continue; }
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          const end = i + 1;
          const block = src.slice(start, end);
          if (block.includes(token)) return { start, end, block };
          search = end;
          break;
        }
      }
    }
    if (search <= start) search = start + startToken.length;
  }
}

function patchOverlay() {
  const file = 'src/components/overlay.jsx';
  let src = read(file);
  const effect = findEffectContaining(src, 'eventBus.subscribe("ability:started"');
  if (!effect) throw new Error('Overlay ability effect not found');

  let block = effect.block;
  if (!block.includes('eventBus.subscribe("win:correct"')) {
    const marker = '  const unsubStarted = eventBus.subscribe("ability:started"';
    const pos = block.indexOf(marker);
    if (pos < 0) throw new Error('Overlay ability listener marker not found');
    const listener = `  const unsubWinCorrect = eventBus.subscribe("win:correct", (payload) => {\n    console.log("[WIN LIMPIA RECEIVED]", payload);\n    const winnerPayload = {\n      id: payload?.playerId || payload?.id || payload?.player?.id,\n      name: payload?.name || payload?.username || payload?.player?.name || "GANADOR",\n      points: Number(payload?.points ?? payload?.player?.points) || 0,\n      wins: Number(payload?.wins ?? payload?.player?.wins) || 0\n    };\n    setWinner(winnerPayload);\n    setShowWin(true);\n    setAlert(\`👑 ¡WIN LIMPIA: \${winnerPayload.name}!\`);\n    window.setTimeout(() => {\n      setShowWin(false);\n      setAlert(null);\n    }, 4000);\n  });\n\n`;
    block = block.slice(0, pos) + listener + block.slice(pos);
  }

  if (!block.includes('eventBus.subscribe("game:score_updated"')) {
    const cleanupPos = block.indexOf('  return () => {');
    if (cleanupPos < 0) throw new Error('Overlay cleanup not found');
    const scoreListener = `  const unsubLiveScore = eventBus.subscribe("game:score_updated", (payload) => {\n    console.log("[LIVE SCORE EVENT]", payload);\n  });\n\n`;
    block = block.slice(0, cleanupPos) + scoreListener + block.slice(cleanupPos);
  }

  if (!block.includes('unsubWinCorrect();')) {
    const cleanupPos = block.indexOf('  return () => {');
    if (cleanupPos < 0) throw new Error('Overlay cleanup not found for win listener');
    const insertAt = cleanupPos + '  return () => {'.length;
    block = block.slice(0, insertAt) + '\n    unsubWinCorrect();' + block.slice(insertAt);
  }

  if (!block.includes('unsubLiveScore();')) {
    const cleanupPos = block.indexOf('  return () => {');
    if (cleanupPos < 0) throw new Error('Overlay cleanup not found for score listener');
    const insertAt = cleanupPos + '  return () => {'.length;
    block = block.slice(0, insertAt) + '\n    unsubLiveScore();' + block.slice(insertAt);
  }

  src = src.slice(0, effect.start) + block + src.slice(effect.end);
  write(file, src);
}

function patchAudio() {
  const file = 'src/core/audioManager.js';
  let src = read(file);
  if (!src.includes('paths.add("/Sounds/NBA punto.mp3");')) {
    const marker = '    const freezeSound = this.getFreezeConfig().sound;';
    if (!src.includes(marker)) throw new Error('Audio preload marker not found');
    src = src.replace(marker, '    paths.add("/Sounds/NBA punto.mp3");\n' + marker);
  }
  if (!src.includes('eventBus.subscribe("win:correct"')) {
    const marker = '    eventBus.subscribe("normalized:gift", (giftEvent) => {';
    if (!src.includes(marker)) throw new Error('Audio normalized gift listener marker not found');
    const listener = `    eventBus.subscribe("win:correct", (payload) => {\n      if (!this.enabled || this.isOverlayContext === false) return;\n      console.log("[AUDIO] WIN LIMPIA -> NBA punto", payload);\n      this.playSound("/Sounds/NBA punto.mp3", { source: "WIN_LIMPIA", payload });\n    });\n\n`;
    src = src.replace(marker, listener + marker);
  }
  write(file, src);
}

function patchAdmin() {
  const file = 'src/App.jsx';
  let src = read(file);
  if (!src.includes('import { eventBus } from "./core/eventBus";')) {
    const marker = 'import { dashboardAPI } from "./core/dashboardAPI";';
    if (!src.includes(marker)) throw new Error('App dashboard import marker not found');
    src = src.replace(marker, marker + '\nimport { eventBus } from "./core/eventBus";');
  }
  if (!src.includes('[ADMIN F12] WIN LIMPIA')) {
    const marker = 'function Admin(){';
    const pos = src.indexOf(marker);
    if (pos < 0) throw new Error('Admin component marker not found');
    const bodyPos = pos + marker.length;
    const effect = `\n\n  useEffect(() => {\n    const unsubLiveWinDiagnostics = eventBus.subscribe("win:correct", (payload) => {\n      console.log("[ADMIN F12] WIN LIMPIA", payload);\n    });\n    const unsubLiveScoreDiagnostics = eventBus.subscribe("game:score_updated", (payload) => {\n      console.log("[ADMIN F12] SCORE UPDATE", payload);\n    });\n    return () => {\n      unsubLiveWinDiagnostics && unsubLiveWinDiagnostics();\n      unsubLiveScoreDiagnostics && unsubLiveScoreDiagnostics();\n    };\n  }, []);\n`;
    src = src.slice(0, bodyPos) + effect + src.slice(bodyPos);
  }
  write(file, src);
}

try {
  console.log('=== LIVE WIN PIPELINE V4 REPAIR ===');
  // The V3 script was executed locally and malformed three files. Restore only those files,
  // then apply deterministic patches from the clean repository HEAD.
  restore('src/components/overlay.jsx');
  restore('src/core/audioManager.js');
  restore('src/App.jsx');
  patchOverlay();
  patchAudio();
  patchAdmin();
  console.log('=== V4 REPAIR COMPLETE ===');
} catch (error) {
  console.error(`[FAIL] ${error.message}`);
  process.exit(1);
}
