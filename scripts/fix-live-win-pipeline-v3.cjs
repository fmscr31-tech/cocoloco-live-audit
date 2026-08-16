const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function write(file, content) {
  fs.writeFileSync(path.join(root, file), content, 'utf8');
  console.log(`[FIX] ${file}`);
}

function findEffectContaining(src, token) {
  const startToken = 'useEffect(() => {';
  let search = 0;
  while (true) {
    const start = src.indexOf(startToken, search);
    if (start < 0) return null;
    let depth = 0;
    let inSingle = false;
    let inDouble = false;
    let inTemplate = false;
    let escaped = false;
    for (let i = start; i < src.length; i++) {
      const c = src[i];
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (!inDouble && !inTemplate && c === "'") { inSingle = !inSingle; continue; }
      if (!inSingle && !inTemplate && c === '"') { inDouble = !inDouble; continue; }
      if (!inSingle && !inDouble && c === '`') { inTemplate = !inTemplate; continue; }
      if (inSingle || inDouble || inTemplate) continue;
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

function addOverlayWinListener() {
  const file = 'src/components/overlay.jsx';
  let src = read(file);

  if (!src.includes('eventBus.subscribe("win:correct"')) {
    const effect = findEffectContaining(src, 'eventBus.subscribe("ability:started"');
    if (!effect) throw new Error('Overlay: could not locate effect containing ability:started');

    const listener = `\n    const unsubWinCorrect = eventBus.subscribe("win:correct", (payload) => {\n      console.log("[WIN LIMPIA RECEIVED]", payload);\n      const winnerPayload = {\n        id: payload?.playerId || payload?.id || payload?.player?.id,\n        name: payload?.name || payload?.username || payload?.player?.name || "GANADOR",\n        points: Number(payload?.points ?? payload?.player?.points) || 0,\n        wins: Number(payload?.wins ?? payload?.player?.wins) || 0\n      };\n      setWinner(winnerPayload);\n      setShowWin(true);\n      setAlert(\`👑 ¡WIN LIMPIA: \${winnerPayload.name}!\`);\n      window.setTimeout(() => {\n        setShowWin(false);\n        setAlert(null);\n      }, 4000);\n    });\n\n`;

    const marker = 'eventBus.subscribe("ability:started"';
    const absoluteMarker = src.indexOf(marker, effect.start);
    if (absoluteMarker < 0 || absoluteMarker >= effect.end) throw new Error('Overlay: ability listener marker not inside effect');
    src = src.slice(0, absoluteMarker) + listener + src.slice(absoluteMarker);
  }

  const effect = findEffectContaining(src, 'eventBus.subscribe("win:correct"');
  if (!effect) throw new Error('Overlay: win listener effect not found');

  if (!src.includes('unsubWinCorrect();')) {
    const cleanup = effect.block.indexOf('return () => {');
    if (cleanup < 0) throw new Error('Overlay: cleanup return not found in win effect');
    const absoluteCleanup = effect.start + cleanup;
    src = src.slice(0, absoluteCleanup) + 'return () => {\n      unsubWinCorrect();\n      ' + src.slice(absoluteCleanup + 'return () => {'.length);
  }

  if (!src.includes('[LIVE SCORE EVENT]')) {
    const refreshed = findEffectContaining(src, 'eventBus.subscribe("win:correct"');
    if (!refreshed) throw new Error('Overlay: refreshed win effect not found');
    const cleanup = refreshed.block.indexOf('return () => {');
    if (cleanup < 0) throw new Error('Overlay: cleanup marker not found for score diagnostics');
    const absoluteCleanup = refreshed.start + cleanup;
    const scoreListener = 'const unsubLiveScore = eventBus.subscribe("game:score_updated", (payload) => {\n      console.log("[LIVE SCORE EVENT]", payload);\n    });\n    ';
    src = src.slice(0, absoluteCleanup) + scoreListener + src.slice(absoluteCleanup);
    const second = findEffectContaining(src, 'eventBus.subscribe("game:score_updated"');
    const secondCleanup = second.block.indexOf('return () => {');
    const absoluteSecondCleanup = second.start + secondCleanup;
    src = src.slice(0, absoluteSecondCleanup) + 'return () => {\n      unsubLiveScore();\n      ' + src.slice(absoluteSecondCleanup + 'return () => {'.length);
  }

  write(file, src);
}

function addAudioWinListener() {
  const file = 'src/core/audioManager.js';
  let src = read(file);

  if (!src.includes('paths.add("/Sounds/NBA punto.mp3");')) {
    const candidates = [
      'const freezeSound = this.getFreezeConfig().sound;',
      'const freezeSound = this.getFreezeConfig?.().sound;',
      'paths.add("/Sounds/Twinkling Star.mp3");',
      'paths.add("/Sounds/Freeze.mp3");'
    ];
    const marker = candidates.find((x) => src.includes(x));
    if (!marker) throw new Error('AudioManager: preload marker not found');
    src = src.replace(marker, 'paths.add("/Sounds/NBA punto.mp3");\n    ' + marker);
  }

  if (!src.includes('eventBus.subscribe("win:correct"')) {
    const marker = 'eventBus.subscribe("normalized:gift"';
    const alt = "eventBus.subscribe('normalized:gift'";
    const chosen = src.includes(marker) ? marker : (src.includes(alt) ? alt : null);
    if (!chosen) throw new Error('AudioManager: normalized:gift listener marker not found');
    const listener = `eventBus.subscribe("win:correct", (payload) => {\n      if (!this.enabled || this.isOverlayContext === false) return;\n      console.log("[AUDIO] WIN LIMPIA -> NBA punto", payload);\n      this.playSound("/Sounds/NBA punto.mp3", { source: "WIN_LIMPIA", payload });\n    });\n\n    `;
    src = src.replace(chosen, listener + chosen);
  }

  write(file, src);
}

function addAdminDiagnostics() {
  const file = 'src/App.jsx';
  let src = read(file);

  if (!src.includes('import { eventBus } from "./core/eventBus"')) {
    const importMarker = src.match(/^import .*?;\n/m);
    if (!importMarker) throw new Error('App: no import marker found');
    src = src.slice(0, importMarker.index) + 'import { eventBus } from "./core/eventBus";\n' + src.slice(importMarker.index);
  }

  if (!src.includes('[ADMIN F12] WIN LIMPIA')) {
    if (!src.match(/import\s+\{[^}]*useEffect[^}]*\}\s+from\s+["']react["']/)) {
      const reactImport = src.match(/^import React.*?;\n/m);
      if (reactImport && !reactImport[0].includes('useEffect')) {
        const replacement = reactImport[0].replace(/\{([^}]*)\}/, (m, inside) => `{${inside.trim()}, useEffect}`);
        src = src.slice(0, reactImport.index) + replacement + src.slice(reactImport.index + reactImport[0].length);
      }
    }

    const componentMarker = src.indexOf('function App(');
    if (componentMarker < 0) throw new Error('App: function App marker not found');
    const bodyStart = src.indexOf('{', componentMarker);
    if (bodyStart < 0) throw new Error('App: component body marker not found');
    const effect = `\n  useEffect(() => {\n    const unsubLiveWinDiagnostics = eventBus.subscribe("win:correct", (payload) => {\n      console.log("[ADMIN F12] WIN LIMPIA", payload);\n    });\n    const unsubLiveScoreDiagnostics = eventBus.subscribe("game:score_updated", (payload) => {\n      console.log("[ADMIN F12] SCORE UPDATE", payload);\n    });\n    return () => {\n      unsubLiveWinDiagnostics && unsubLiveWinDiagnostics();\n      unsubLiveScoreDiagnostics && unsubLiveScoreDiagnostics();\n    };\n  }, []);\n`;
    src = src.slice(0, bodyStart + 1) + effect + src.slice(bodyStart + 1);
  }

  write(file, src);
}

try {
  addOverlayWinListener();
  addAudioWinListener();
  addAdminDiagnostics();
  console.log('=== LIVE WIN PIPELINE V3 REPAIR COMPLETE ===');
  console.log('Overlay: win:correct -> winner state + animation + score diagnostics.');
  console.log('AudioManager: NBA point preload + Win Limpia sound routing.');
  console.log('Admin: F12 Win Limpia + score diagnostics.');
} catch (error) {
  console.error(`[FAIL] ${error.message}`);
  process.exit(1);
}
