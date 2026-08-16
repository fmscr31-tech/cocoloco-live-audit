const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'src/core/chatCommandParser.js');
const backup = file + '.pre-win-round-status-fix-backup';

let src = fs.readFileSync(file, 'utf8');
if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);

const old = '    const activeRound = Boolean(gameState?.round?.active);';
const replacement = `    // RoundManager is the canonical lifecycle owner and exposes status: "active".\n    // Older code checked round.active, which does not exist, causing LIVE Win Limpia\n    // answers to be evaluated with an incorrect round lifecycle state.\n    const activeRound = Boolean(\n      gameState?.round?.status === "active" ||\n      gameState?.round?.active === true\n    );`;

if (!src.includes(old)) {
  if (!src.includes('gameState?.round?.status === "active"')) {
    throw new Error('Win Limpia activeRound marker not found');
  }
} else {
  src = src.replace(old, replacement);
}

const oldWinLog = '    console.log("[CHAT LIVE 05] COMMAND CONFIG", config);';
const newWinLog = `${oldWinLog}\n    console.log("[WIN LIMPIA TRACE] ROUND/ANSWER STATE", {\n      activeRound,\n      roundStatus: gameState?.round?.status,\n      roundActiveLegacy: gameState?.round?.active,\n      registrationStatus: regState.status,\n      configuredAnswer: config?.winLimpia?.correctAnswer,\n      winEnabled: config?.winLimpia?.enabled\n    });`;

if (!src.includes('[WIN LIMPIA TRACE] ROUND/ANSWER STATE')) {
  if (!src.includes(oldWinLog)) throw new Error('Command config log marker not found');
  src = src.replace(oldWinLog, newWinLog);
}

const targetMarker = '      const targetAnswer = this.normalize(\n        winConfig.correctAnswer ?? winConfig.answer ?? winConfig.word ?? ""\n      );';
const targetTrace = `${targetMarker}\n\n      console.log("[WIN LIMPIA TRACE] ANSWER CHECK", {\n        cleanMessage,\n        targetAnswer,\n        matches: cleanMessage === targetAnswer,\n        playerId: eventPlayerId,\n        username: eventUsername,\n        displayName: eventDisplayName\n      });`;
if (!src.includes('[WIN LIMPIA TRACE] ANSWER CHECK')) {
  if (!src.includes(targetMarker)) throw new Error('Target answer marker not found');
  src = src.replace(targetMarker, targetTrace);
}

fs.writeFileSync(file, src, 'utf8');
console.log('[BACKUP]', backup);
console.log('[FIX] chatCommandParser now recognizes roundManager status="active" as an active round.');
console.log('[FIX] Added Win Limpia lifecycle + answer diagnostics.');
console.log('=== LIVE WIN PIPELINE V6 REPAIR COMPLETE ===');
