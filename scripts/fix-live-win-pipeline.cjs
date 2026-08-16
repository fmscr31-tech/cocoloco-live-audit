const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function patchFile(relativePath, transform, backupSuffix) {
  const filePath = path.join(root, relativePath);
  const source = fs.readFileSync(filePath, 'utf8');
  const next = transform(source);
  if (next === source) {
    console.log(`[SKIP] ${relativePath} already contains the live Win Limpia repair.`);
    return false;
  }
  const backupPath = `${filePath}.${backupSuffix}-backup`;
  if (!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, source, 'utf8');
  fs.writeFileSync(filePath, next, 'utf8');
  console.log(`[FIX] ${relativePath}`);
  console.log(`[BACKUP] ${backupPath}`);
  return true;
}

patchFile('src/components/overlay.jsx', source => {
  if (source.includes('const unsubWinCorrect = eventBus.subscribe("win:correct"')) return source;

  const anchor = 'useEffect(() => {\n  const unsubStarted = eventBus.subscribe("ability:started", (item) => {';
  if (!source.includes(anchor)) throw new Error('Overlay ability listener anchor not found.');

  const block = `  const unsubWinCorrect = eventBus.subscribe("win:correct", (payload) => {\n    console.log("[WIN LIMPIA RECEIVED]", payload);\n    const winnerPayload = {\n      id: payload?.playerId || payload?.id,\n      name: payload?.name || payload?.username || "JUGADOR",\n      points: Number(payload?.points) || 0,\n      wins: Number(payload?.wins) || 0\n    };\n    setWinner(winnerPayload);\n    setShowWin(true);\n    setAlert(\`👑 ¡WIN LIMPIA: \${winnerPayload.name}!\`);\n    setTimeout(() => {\n      setShowWin(false);\n      setAlert(null);\n    }, 4000);\n  });\n\n  const unsubScoreUpdated = eventBus.subscribe("game:score_updated", (payload) => {\n    console.log("[LIVE SCORE EVENT]", payload);\n  });\n\n`;

  const replaced = source.replace(anchor, `useEffect(() => {\n${block}  const unsubStarted = eventBus.subscribe("ability:started", (item) => {`);
  if (replaced === source) throw new Error('Failed to insert Win Limpia overlay listener.');

  const cleanupAnchor = '    unsubStarted();\n    unsubFinished();';
  if (!replaced.includes(cleanupAnchor)) throw new Error('Overlay listener cleanup anchor not found.');
  return replaced.replace(cleanupAnchor, '    unsubWinCorrect();\n    unsubScoreUpdated();\n    unsubStarted();\n    unsubFinished();');
}, 'pre-live-win-fix');

patchFile('src/core/audioManager.js', source => {
  let next = source;

  if (!next.includes('paths.add("/Sounds/NBA punto.mp3");')) {
    const preloadAnchor = '    const freezeSound = this.getFreezeConfig().sound;\n';
    if (!next.includes(preloadAnchor)) throw new Error('Audio preload anchor not found.');
    next = next.replace(preloadAnchor, '    paths.add("/Sounds/NBA punto.mp3");\n' + preloadAnchor);
  }

  if (!next.includes('eventBus.subscribe("win:correct"')) {
    const listenerAnchor = '  initListeners() {\n    eventBus.subscribe("normalized:gift", (giftEvent) => {';
    if (!next.includes(listenerAnchor)) throw new Error('Audio listener anchor not found.');
    const winBlock = `  initListeners() {\n    eventBus.subscribe("win:correct", (payload) => {\n      if (!this.enabled) return;\n      console.log("[AUDIO] Win Limpia sound:", "/Sounds/NBA punto.mp3", payload);\n      this.playSound("/Sounds/NBA punto.mp3", {\n        ...payload,\n        source: "WIN_LIMPIA"\n      });\n    });\n\n    eventBus.subscribe("normalized:gift", (giftEvent) => {`;
    next = next.replace(listenerAnchor, winBlock);
  }

  return next;
}, 'pre-live-win-audio-fix');

console.log('=== LIVE WIN PIPELINE REPAIR APPLIED ===');
console.log('[PASS] Overlay listens to cross-window win:correct.');
console.log('[PASS] Overlay logs live Win Limpia and score events to F12.');
console.log('[PASS] AudioManager listens to win:correct.');
console.log('[PASS] Win Limpia uses /Sounds/NBA punto.mp3.');
console.log('[PASS] Existing gift/ability listeners were preserved.');
console.log('[NEXT] Vite should HMR the changes; if not, refresh ONLY the overlay window.');
