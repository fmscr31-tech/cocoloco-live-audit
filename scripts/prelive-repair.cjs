const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const individualPath = path.join(root, "src", "components", "overlay", "IndividualPanel.jsx");
const teamPath = path.join(root, "src", "components", "overlay", "TeamPanel.jsx");
const dashboardPath = path.join(root, "src", "core", "dashboardAPI.js");
const chatPath = path.join(root, "src", "core", "chatCommandParser.js");
const audioPath = path.join(root, "src", "core", "audioManager.js");
const overlayPath = path.join(root, "src", "components", "overlay.jsx");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log("=== COCOLOCO PRE-LIVE SAFE REPAIR ===");

const individual = read(individualPath);
const oldBlock = `  }).slice(0, 5);\n\n  const topPlayer`;
const newBlock = `  });\n\n  const topPlayer`;

if (individual.includes(oldBlock)) {
  const backup = `${individualPath}.prelive-backup`;
  if (!fs.existsSync(backup)) fs.writeFileSync(backup, individual, "utf8");
  fs.writeFileSync(individualPath, individual.replace(oldBlock, newBlock), "utf8");
  console.log("[FIX] Individual Mode: removed artificial TOP-5 limit.");
} else if (individual.includes("const sortedPlayers = [...sourcePlayers].sort")) {
  console.log("[OK] Individual Mode: no TOP-5 limiter found in sortedPlayers block.");
} else {
  throw new Error("Could not safely locate IndividualPanel sortedPlayers block; no change made.");
}

const team = read(teamPath);
assert(team.includes(".slice(0, 10)"), "TeamPanel no longer contains the expected 10-player visibility limit.");
console.log("[OK] Team Mode: TeamPanel keeps up to 10 MVPs per team (6+ supported).");

const dashboard = read(dashboardPath);
assert(dashboard.includes("registeredPlayers.forEach"), "Dashboard registration/player merge is missing.");
assert(dashboard.includes("game = { ...game, players: mergedPlayers }"), "Dashboard game/player synchronization is missing.");
console.log("[OK] Dashboard: registered players are merged with live game players.");

const chat = read(chatPath);
assert(chat.includes("playerWin(scoringId)"), "Win Limpia scoring path is missing.");
assert(chat.includes("matchedRegPlayer"), "Win Limpia registered-player identity matching is missing.");
console.log("[OK] Win Limpia: registered identity matching + playerWin() path present.");

const audio = read(audioPath);
assert(audio.includes('eventBus.subscribe("ability:started"'), "Ability sound listener is missing.");
assert(audio.includes('configManager.get("giftSounds")'), "Independent gift sound configuration is missing.");
assert(audio.includes('eventBus.subscribe("freeze:activated"'), "Freeze sound listener is missing.");
console.log("[OK] Audio: ability, independent gift, and Freeze routing are present.");

const overlay = read(overlayPath);
assert(overlay.includes('eventBus.subscribe("ability:started"'), "Overlay ability animation/event listener is missing.");
assert(overlay.includes("currentMode"), "Overlay mode switching state is missing.");
console.log("[OK] Overlay: ability event routing and mode state are present.");

console.log("[AUDIT 1/3] Source integrity checks: PASS");
console.log("[AUDIT 2/3] Visibility/registration/scoring/audio/animation checks: PASS");
console.log("[AUDIT 3/3] Running production build...");

const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
  cwd: root,
  stdio: "inherit",
  shell: false
});

if (result.status !== 0) {
  console.error("[FAIL] Production build failed. The backup remains at IndividualPanel.jsx.prelive-backup.");
  process.exit(result.status || 1);
}

console.log("=== PRE-LIVE REPAIR COMPLETE: BUILD PASS ===");
console.log("Refresh the admin panel and open the overlay before starting LIVE.");
