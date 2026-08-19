const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const bridgeDir = path.join(projectRoot, "bridge");
const bridgeNodeModules = path.join(bridgeDir, "node_modules");
const bridgePackageLock = path.join(bridgeDir, "package-lock.json");

// The bridge has its own package.json because it is a standalone Node service.
// Only install its dependencies when they are actually missing; normal startup
// stays fast after the first successful install.
const required = ["dotenv", "ws", "tiktok-live-connector"];
const missing = required.filter((name) => {
  const packageJson = path.join(bridgeNodeModules, name, "package.json");
  return !fs.existsSync(packageJson);
});

if (missing.length === 0) {
  process.exit(0);
}

console.log(`[CocoLoco] Bridge dependencies missing: ${missing.join(", ")}`);
console.log("[CocoLoco] Installing bridge dependencies...");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npmCommand, ["install", "--no-audit", "--no-fund"], {
  cwd: bridgeDir,
  stdio: "inherit",
  shell: false,
});

if (result.error) {
  console.error(`[CocoLoco] Could not run npm: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`[CocoLoco] Bridge dependency installation failed with code ${result.status}.`);
  process.exit(result.status || 1);
}

if (!fs.existsSync(bridgePackageLock)) {
  console.warn("[CocoLoco] Warning: bridge/package-lock.json was not created.");
}

console.log("[CocoLoco] Bridge dependencies ready.");
