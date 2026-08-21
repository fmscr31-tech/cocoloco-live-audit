import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");
const urlFile = path.join(publicDir, "tunnel-url.txt");

mkdirSync(publicDir, { recursive: true });
try { rmSync(urlFile, { force: true }); } catch {}

console.log("[Cloudflare] Starting Quick Tunnel for http://localhost:5173 ...");

const child = spawn(
  "cloudflared",
  ["tunnel", "--url", "http://localhost:5173"],
  {
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);

let buffer = "";
let published = false;

const handleOutput = (chunk) => {
  const text = String(chunk);
  process.stdout.write(`[cloudflared] ${text}`);
  buffer += text;
  const matches = buffer.match(/https:\/\/[-a-z0-9]+\.trycloudflare\.com/gi);
  if (!published && matches?.length) {
    const url = matches[matches.length - 1].replace(/\/$/, "");
    published = true;
    writeFileSync(urlFile, url, "utf8");
    console.log(`[Cloudflare] PUBLIC_URL=${url}`);
    console.log(`[Cloudflare] OVERLAY_URL=${url}/overlay`);
  }
  if (buffer.length > 12000) buffer = buffer.slice(-6000);
};

child.stdout.on("data", handleOutput);
child.stderr.on("data", handleOutput);

child.on("error", (error) => {
  console.error(`[Cloudflare] Unable to start cloudflared: ${error.message}`);
  console.error("[Cloudflare] Install with: winget install --id Cloudflare.cloudflared");
});

const cleanup = () => {
  try { rmSync(urlFile, { force: true }); } catch {}
  if (!child.killed) child.kill();
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", () => {
  try { rmSync(urlFile, { force: true }); } catch {}
});

child.on("close", (code, signal) => {
  try { rmSync(urlFile, { force: true }); } catch {}
  console.log(`[Cloudflare] Tunnel stopped (code=${code}, signal=${signal ?? "none"}).`);
  process.exit(code ?? 0);
});
