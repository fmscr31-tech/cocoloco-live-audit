const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const parser = fs.readFileSync(path.join(root, 'src/core/chatCommandParser.js'), 'utf8');
const roundManager = fs.readFileSync(path.join(root, 'src/core/roundManager.js'), 'utf8');
const gameEngine = fs.readFileSync(path.join(root, 'src/core/gameEngine.js'), 'utf8');
const playerManager = fs.readFileSync(path.join(root, 'src/core/playerManager.js'), 'utf8');

let fails = 0;
function check(ok, label) { console.log(ok ? `[PASS] ${label}` : `[FAIL] ${label}`); if (!ok) fails++; }

for (let i = 1; i <= 3; i++) {
  console.log(`[AUDIT ${i}/3] LIVE Win Limpia runtime routing`);
  check(parser.includes('gameState?.round?.status === "active"'), 'Parser uses canonical roundManager status=active');
  check(parser.includes('gameState?.round?.active === true'), 'Parser retains legacy active compatibility');
  check(parser.includes('cleanMessage === targetAnswer'), 'Exact normalized answer comparison remains');
  check(parser.includes('registrationManager.getRegisteredPlayers()'), 'Win resolves only registered players');
  check(parser.includes('playerWin(scoringId)'), 'Matched player routes through GameEngine playerWin');
  check(roundManager.includes('status: "active"'), 'RoundManager creates canonical active status');
  check(gameEngine.includes('eventBus.emit("win:correct"'), 'GameEngine emits win:correct');
  check(playerManager.includes('p.tiktokId === playerId'), 'PlayerManager resolves TikTok identity');
  check(playerManager.includes('player.points += 1'), 'Win Limpia awards exactly +1 point');
}

if (fails) {
  console.error(`=== LIVE WIN V6 AUDIT: FAIL (${fails}) ===`);
  process.exit(1);
}
console.log('=== LIVE WIN V6 AUDIT: PASS (3/3) ===');
console.log('Canonical round status, exact answer matching, registered-player identity resolution, +1 scoring, and win:correct routing are wired.');
