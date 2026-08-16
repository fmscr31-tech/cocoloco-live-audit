const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const parserFile = path.join(root, 'src/core/chatCommandParser.js');
const overlayFile = path.join(root, 'src/components/overlay.jsx');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, src) { fs.writeFileSync(file, src, 'utf8'); }
function backup(file) {
  const target = file + '.pre-win-v7-backup';
  if (!fs.existsSync(target)) fs.copyFileSync(file, target);
}

// 1) Parser: use RoundManager's canonical status and add runtime diagnostics.
backup(parserFile);
let parser = read(parserFile);

const oldActive = 'const activeRound = Boolean(gameState?.round?.active);';
const newActive = `const activeRound = Boolean(\n      gameState?.round?.status === "active" ||\n      gameState?.round?.active === true\n    );`;
if (parser.includes(oldActive)) parser = parser.replace(oldActive, newActive);

if (!parser.includes('[WIN LIMPIA V7] ROUND STATE')) {
  const marker = '    console.log("[CHAT LIVE 05] COMMAND CONFIG", config);';
  if (!parser.includes(marker)) throw new Error('Parser command-config marker not found');
  parser = parser.replace(marker, `${marker}\n    console.log("[WIN LIMPIA V7] ROUND STATE", { activeRound, roundStatus: gameState?.round?.status, registrationStatus: regState.status });`);
}

const answerRegex = /const targetAnswer = this\.normalize\(\s*winConfig\.correctAnswer \?\? winConfig\.answer \?\? winConfig\.word \?\? ""\s*\);/;
const answerReplacement = `const targetAnswer = this.normalize(\n        winConfig.correctAnswer ??\n        winConfig.answer ??\n        winConfig.word ??\n        gameState?.round?.correctAnswer ??\n        gameState?.round?.answer ??\n        gameState?.round?.word ??\n        ""\n      );`;
if (answerRegex.test(parser)) parser = parser.replace(answerRegex, answerReplacement);

if (!parser.includes('[WIN LIMPIA V7] ANSWER CHECK')) {
  const marker = '      );\n\n      if (\n        winConfig.enabled !== false,';
  if (!parser.includes(marker)) throw new Error('Parser answer-check marker not found');
  parser = parser.replace(marker, `      );\n\n      console.log("[WIN LIMPIA V7] ANSWER CHECK", { cleanMessage, targetAnswer, matches: cleanMessage === targetAnswer, playerId: eventPlayerId, username: eventUsername, displayName: eventDisplayName });\n\n      if (\n        winConfig.enabled !== false,`);
}
write(parserFile, parser);
console.log('[FIX] Parser: round.status="active" is canonical; legacy round.active remains compatible.');
console.log('[FIX] Parser: answer can resolve from config or active round.');
console.log('[FIX] Parser: runtime Win Limpia diagnostics added.');

// 2) Overlay: preserve the V3 win listener if already installed. Never create
// a second win animation listener. Add only the missing score snapshot sync.
backup(overlayFile);
let overlay = read(overlayFile);

const hasWinListener = overlay.includes('eventBus.subscribe("win:correct"');
if (!hasWinListener) {
  throw new Error('Overlay has no win:correct listener. Run fix-live-win-pipeline-v3.cjs first.');
}

if (!overlay.includes('[WIN LIMPIA V7] SCORE SNAPSHOT')) {
  const abilityMarker = '  const unsubStarted = eventBus.subscribe("ability:started"';
  const markerPos = overlay.indexOf(abilityMarker);
  if (markerPos < 0) throw new Error('Overlay ability listener marker not found');

  const scoreListener = `  const unsubScoreSnapshot = eventBus.subscribe("game:score_updated", (payload) => {\n    const snapshot = payload?.playerSnapshot;\n    if (!snapshot) return;\n    console.log("[WIN LIMPIA V7] SCORE SNAPSHOT", snapshot);\n\n    setState(prev => {\n      const current = Array.isArray(prev.players) ? prev.players : [];\n      const same = (p) => p.id === snapshot.id || (snapshot.tiktokId && p.tiktokId === snapshot.tiktokId) || (snapshot.playerId && p.playerId === snapshot.playerId);\n      const players = current.some(same)\n        ? current.map(p => same(p) ? { ...p, ...snapshot } : p)\n        : [...current, snapshot];\n      return { ...prev, players };\n    });\n  });\n\n`;
  overlay = overlay.slice(0, markerPos) + scoreListener + overlay.slice(markerPos);
}

if (!overlay.includes('unsubScoreSnapshot();')) {
  const cleanupMarker = '    unsubStarted();\n    unsubFinished();';
  if (!overlay.includes(cleanupMarker)) throw new Error('Overlay cleanup marker not found');
  overlay = overlay.replace(cleanupMarker, '    unsubScoreSnapshot();\n    unsubStarted();\n    unsubFinished();');
}

write(overlayFile, overlay);
console.log('[FIX] Overlay: game:score_updated snapshot synchronization added.');
console.log('[FIX] Overlay: existing Win Limpia listener preserved; no duplicate animation listener created.');
console.log('=== LIVE WIN PIPELINE V7 REPAIR COMPLETE ===');
