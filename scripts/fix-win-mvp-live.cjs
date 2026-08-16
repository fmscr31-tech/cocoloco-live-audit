const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "src/components/overlay/IndividualPanel.jsx");
const backup = `${file}.pre-win-mvp-backup`;
const source = fs.readFileSync(file, "utf8");

if (!fs.existsSync(backup)) fs.writeFileSync(backup, source, "utf8");

const patterns = [
  /\}\)\.slice\(0, 5\);/g,
  /\}\)\.slice\(0,5\);/g
];

let updated = source;
for (const pattern of patterns) updated = updated.replace(pattern, "});");

if (updated === source) {
  console.log("[OK] IndividualPanel already has unrestricted MVP list; no source change needed.");
} else {
  fs.writeFileSync(file, updated, "utf8");
  console.log("[FIX] Removed the obsolete Individual Mode TOP-5 limiter so the MVP/player list can display all registered players and use the existing scroll container.");
  console.log(`[BACKUP] ${backup}`);
}

console.log("[NEXT] Run: node scripts/audit-win-mvp-live.cjs");
