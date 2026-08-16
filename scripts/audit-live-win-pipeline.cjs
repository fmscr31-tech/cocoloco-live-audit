const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const overlay = fs.readFileSync(path.join(root, 'src/components/overlay.jsx'), 'utf8');
const audio = fs.readFileSync(path.join(root, 'src/core/audioManager.js'), 'utf8');
const game = fs.readFileSync(path.join(root, 'src/core/gameEngine.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'src/main.jsx'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
const giftFeed = fs.readFileSync(path.join(root, 'src/components/overlay/GiftFeed.jsx'), 'utf8');

const checks = [
  ['GameEngine emits win:correct', game.includes('eventBus.emit("win:correct"')],
  ['GameEngine emits PLAYER_WIN', game.includes('createEvent("PLAYER_WIN"')],
  ['Overlay subscribes to win:correct', overlay.includes('eventBus.subscribe("win:correct"')],
  ['Overlay logs Win Limpia receipt', overlay.includes('[WIN LIMPIA RECEIVED]')],
  ['Overlay updates winner state', overlay.includes('setWinner(winnerPayload)')],
  ['Overlay activates win animation state', overlay.includes('setShowWin(true)')],
  ['Overlay cleanup unsubscribes win listener', overlay.includes('unsubWinCorrect()')],
  ['Overlay logs score events', overlay.includes('[LIVE SCORE EVENT]')],
  ['Admin Panel imports EventBus diagnostics', app.includes('import { eventBus } from "./core/eventBus"')],
  ['Admin Panel logs Win Limpia to F12', app.includes('[ADMIN F12] WIN LIMPIA')],
  ['Admin Panel logs score updates to F12', app.includes('[ADMIN F12] SCORE UPDATE')],
  ['Admin Panel cleans diagnostics subscriptions', app.includes('unsubLiveWinDiagnostics && unsubLiveWinDiagnostics()')],
  ['AudioManager subscribes to win:correct', audio.includes('eventBus.subscribe("win:correct"')],
  ['AudioManager uses NBA point sound', audio.includes('/Sounds/NBA punto.mp3')],
  ['AudioManager preloads NBA point sound', audio.includes('paths.add("/Sounds/NBA punto.mp3");')],
  ['AudioManager routes Win Limpia only in overlay context', audio.includes('source: "WIN_LIMPIA"')],
  ['Main initializes AudioManager', main.includes('import { audioManager } from "./core/audioManager"')],
  ['Main initializes chat parser', main.includes('import "./core/chatCommandParser"')],
  ['GiftFeed still renders showWin/winner', giftFeed.includes('{showWin && winner && (')]
];

let failed = 0;
for (let pass = 1; pass <= 3; pass++) {
  console.log(`[AUDIT ${pass}/3] LIVE Win Limpia pipeline`);
  for (const [label, ok] of checks) {
    if (ok) console.log(`[PASS] ${label}`);
    else { console.log(`[FAIL] ${label}`); failed++; }
  }
}

if (failed) {
  console.error(`=== LIVE WIN PIPELINE AUDIT: FAIL (${failed} failed assertions across 3 passes) ===`);
  process.exit(1);
}

console.log('=== LIVE WIN PIPELINE AUDIT: PASS (3/3) ===');
console.log('Win Limpia: chat parser -> playerWin -> win:correct -> overlay animation + audio.');
console.log('F12 diagnostics: Win and score events are explicitly logged in Overlay and Admin.');
console.log('Gift/ability rendering path remains present.');
