const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function edit(file, transform) {
  const full = path.join(root, file);
  const original = fs.readFileSync(full, 'utf8');
  const updated = transform(original);
  if (updated === original) {
    console.log(`[SKIP] ${file}: no change required`);
    return;
  }
  fs.writeFileSync(full, updated, 'utf8');
  console.log(`[FIX] ${file}`);
}

edit('src/components/overlay.jsx', (src) => {
  if (src.includes('const unsubWinCorrect = eventBus.subscribe("win:correct"')) return src;
  const marker = '  const unsubStarted = eventBus.subscribe("ability:started", (item) => {';
  const insert = `  const unsubWinCorrect = eventBus.subscribe("win:correct", (payload) => {\n    console.log("[WIN LIMPIA RECEIVED]", payload);\n    const winnerPayload = {\n      id: payload?.playerId || payload?.id,\n      name: payload?.name || payload?.username || "GANADOR",\n      points: Number(payload?.points) || 0,\n      wins: Number(payload?.wins) || 0\n    };\n    setWinner(winnerPayload);\n    setShowWin(true);\n    setAlert(\`👑 ¡WIN LIMPIA: \${winnerPayload.name}!\`);\n    window.setTimeout(() => {\n      setShowWin(false);\n      setAlert(null);\n    }, 4000);\n  });\n\n`;
  if (!src.includes(marker)) throw new Error('Overlay ability listener marker not found');
  src = src.replace(marker, insert + marker);
  const cleanup = '    unsubStarted();\n';
  if (!src.includes(cleanup)) throw new Error('Overlay cleanup marker not found');
  src = src.replace(cleanup, '    unsubWinCorrect();\n' + cleanup);
  return src;
});

edit('src/core/audioManager.js', (src) => {
  if (src.includes('eventBus.subscribe("win:correct"')) return src;
  const preloadMarker = '    const freezeSound = this.getFreezeConfig().sound;';
  const preloadInsert = '    paths.add("/Sounds/NBA punto.mp3");\n';
  if (!src.includes(preloadMarker)) throw new Error('Audio preload marker not found');
  src = src.replace(preloadMarker, preloadInsert + preloadMarker);

  const listenerMarker = '    eventBus.subscribe("normalized:gift", (giftEvent) => {';
  const listenerInsert = `    eventBus.subscribe("win:correct", (payload) => {\n      if (!this.enabled || !this.isOverlayContext) return;\n      console.log("[AUDIO] WIN LIMPIA -> NBA punto", payload);\n      this.playSound("/Sounds/NBA punto.mp3", { source: "WIN_LIMPIA", payload });\n    });\n\n`;
  if (!src.includes(listenerMarker)) throw new Error('Audio listener marker not found');
  return src.replace(listenerMarker, listenerInsert + listenerMarker);
});

console.log('=== LIVE WIN PIPELINE V2 REPAIR COMPLETE ===');
console.log('Cross-window win:correct listener installed in Overlay.');
console.log('Win Limpia audio installed in AudioManager.');
console.log('No registration, scoring, gift, or ability routing code was changed.');
