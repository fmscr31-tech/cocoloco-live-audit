import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const bridgeNodeModules = new URL("../bridge/node_modules/", import.meta.url);

if (existsSync(bridgeNodeModules)) {
  console.log("[BridgeDeps] bridge/node_modules already exists; skipping install.");
  process.exit(0);
}

console.log("[BridgeDeps] Installing bridge dependencies for the first run...");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npm, ["ci", "--no-audit", "--no-fund"], {
  cwd: new URL("../bridge/", import.meta.url),
  stdio: "inherit"
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
