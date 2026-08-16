const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const parserFile = path.join(root, 'src/core/chatCommandParser.js');
const overlayFile = path.join(root, 'src/components/overlay.jsx');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}
function write(file, src) {
  fs.writeFileSync(file, src, 'utf8');
}
function backup(file) {
  const target = file + '.pre-win-v7-backup';
  if (!fs.existsSync(target)) fs.copyFileSync(file, target);
}

// ---------------------------------------------------------------------------
// 1) CHAT PARSER: RoundManager canonical lifecycle + resilient answer source
// ---------------------------------------------------------------------------
backup(parserFile);
let parser = read(parserFile);

const oldActive = 'const activeRound = Boolean(gameState?.round?.active);';
const newActive = `const activeRound = Boolean(\n      gameState?.round?.status === "active" ||\n      gameState?.round?.active === true\n    );`;
if (parser.includes(oldActive)) {
  parser = parser.replace(oldActive, newActive);
}

if (!parser.includes('[WIN LIMPIA V7] ROUND STATE')) {
  const marker = '    console.log("[CHAT LIVE 05] COMMAND CONFIG", config);';
  if (!parser.includes(marker)) throw new Error('Parser command-config marker not found');
  parser = parser.replace(marker, `${marker}\n    console.log("[WIN LIMPIA V7] ROUND STATE", { activeRound, roundStatus: gameState?.round?.status, registrationStatus: regState.status });`);
}

// Replace only the answer extraction expression, preserving all registration logic.
const answerRegex = /const targetAnswer = this\.normalize\(\s*winConfig\.correctAnswer \?\? winConfig\.answer \?\? winConfig\.word \?\? ""\s*\);/;
const answerReplacement = `const targetAnswer = this.normalize(\n        winConfig.correctAnswer ??\n        winConfig.answer ??\n        winConfig.word ??\n        gameState?.round?.correctAnswer ??\n        gameState?.round?.answer ??\n        gameState?.round?.word ??\n        ""\n      );`;
if (answerRegex.test(parser)) {
  parser = parser.replace(answerRegex, answerReplacement);
}

if (!parser.includes('[WIN LIMPIA V7] ANSWER CHECK')) {
  const marker = '      );\n\n      if (\n        winConfig.enabled !== false,';
  const idx = parser.indexOf(marker);
  if (idx === -1) throw new Error('Parser answer-check marker not found');
  parser = parser.replace(marker, `      );\n\n      console.log("[WIN LIMPIA V7] ANSWER CHECK", { cleanMessage, targetAnswer, matches: cleanMessage === targetAnswer, playerId: eventPlayerId, username: eventUsername, displayName: eventDisplayName });\n\n      if (\n        winConfig.enabled !== false,`);
}

write(parserFile, parser);
console.log('[FIX] chatCommandParser: round.status="active" is canonical; legacy round.active remains compatible.');
console.log('[FIX] chatCommandParser: Win Limpia answer can resolve from config or active round.');
console.log('[FIX] chatCommandParser: runtime answer diagnostics added.');

// ---------------------------------------------------------------------------
// 2) OVERLAY: direct Win Limpia visual + cross-context score synchronization
// ---------------------------------------------------------------------------
backup(overlayFile);
let overlay = read(overlayFile);

const effectStart = 'useEffect(() => {\n  const unsubStarted = eventBus.subscribe("ability:started"';
if (!overlay.includes(effectStart)) throw new Error('Overlay ability effect marker not found');

if (!overlay.includes('[WIN LIMPIA V7] OVERLAY RECEIVED')) {
  const insertion = `useEffect(() => {\n  const unsubWinCorrect = eventBus.subscribe("win:correct", (payload) => {\n    console.log("[WIN LIMPIA V7] OVERLAY RECEIVED", payload);\n    if (!payload?.playerId && !payload?.id) return;\n\n    const winnerId = payload.playerId || payload.id;\n    const winnerData = {\n      id: winnerId,\n      name: payload.name || payload.username || "Jugador",\n      points: Number(payload.points) || 0,\n      wins: Number(payload.wins) || 0\n    };\n\n    setWinner(winnerData);\n    setShowWin(true);\n    setAlert(\`👑 ¡WIN LIMPIA: \${winnerData.name} +1!\`);\n\n    setTimeout(() => {\n      setShowWin(false);\n      setAlert(null);\n    }, 4000);\n  });\n\n  const unsubScoreUpdated = eventBus.subscribe("game:score_updated", (payload) => {\n    const snapshot = payload?.playerSnapshot;\n    if (!snapshot) return;\n\n    setState(prev => {\n      const current = Array.isArray(prev.players) ? prev.players : [];\n      const exists = current.some(p => p.id === snapshot.id || p.tiktokId === snapshot.tiktokId || p.playerId === snapshot.playerId);\n      const players = exists\n        ? current.map(p => (p.id === snapshot.id || (snapshot.tiktokId && p.tiktokId === snapshot.tiktokId) || (snapshot.playerId && p.playerId === snapshot.playerId)) ? { ...p, ...snapshot } : p)\n        : [...current, snapshot];\n      return { ...prev, players };\n    });\n  });\n\n  const unsubStarted = eventBus.subscribe("ability:started"`;
  overlay = overlay.replace(effectStart, insertion);

  // The replacement above leaves the original callback's argument intact.
  // We only changed the beginning of the existing effect, so no other effect logic moves.
}

const cleanupMarker = '    unsubStarted();\n    unsubFinished();';
if (overlay.includes('[WIN LIMPIA V7] OVERLAY RECEIVED') && !overlay.includes('unsubWinCorrect();')) {
  if (!overlay.includes(cleanupMarker)) throw new Error('Overlay cleanup marker not found');
  overlay = overlay.replace(cleanupMarker, '    unsubWinCorrect();\n    unsubScoreUpdated();\n    unsubStarted();\n    unsubFinished();');
}

write(overlayFile, overlay);
console.log('[FIX] Overlay: direct win:correct listener added for visible Win Limpia banner/animation.');
console.log('[FIX] Overlay: game:score_updated listener added for cross-context +1 score synchronization.');
console.log('=== LIVE WIN PIPELINE V7 REPAIR COMPLETE ===');
