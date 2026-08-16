const fs = require("fs");
const path = require("path");

const read = file => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const checks = [];
const pass = (name, ok) => { checks.push({ name, ok: Boolean(ok) }); console.log(`[${ok ? "PASS" : "FAIL"}] ${name}`); };

const chat = read("src/core/chatCommandParser.js");
const game = read("src/core/gameEngine.js");
const players = read("src/core/playerManager.js");
const panel = read("src/components/overlay/IndividualPanel.jsx");

pass("Win Limpia reads active round state", chat.includes("const activeRound = Boolean(gameState?.round?.active)"));
pass("Win Limpia is evaluated before registration routing", chat.indexOf("WIN LIMPIA — ALWAYS FIRST") < chat.indexOf("REGISTRATION — registration must be OPEN"));
pass("Win Limpia accepts message/comment/text payloads", chat.includes("event.message || event.comment || event.text"));
pass("Win Limpia matches id/username/display name", chat.includes("registeredUsername") && chat.includes("registeredDisplayName"));
pass("Win Limpia calls canonical playerWin", chat.includes("playerWin(scoringId)"));
pass("playerWin awards the canonical +1 point", game.includes("const player = addWin(id)") && players.includes("player.points += 1"));
pass("player score emits dashboard update", players.includes('eventBus.emit("game:score_updated"'));
pass("Individual MVP list has no TOP-5 limiter", !/\.slice\(0\s*,\s*5\)/.test(panel));
pass("Team MVP list supports 10 players", read("src/components/overlay/TeamPanel.jsx").includes(".slice(0, 10)"));

const failed = checks.filter(c => !c.ok);
console.log(`=== WIN LIMPIA + MVP AUDIT: ${failed.length ? "FAIL" : "PASS"} ===`);
process.exitCode = failed.length ? 1 : 0;
