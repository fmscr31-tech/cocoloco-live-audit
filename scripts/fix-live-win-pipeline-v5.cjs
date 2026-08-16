const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'src/App.jsx');
const backup = file + '.pre-live-win-admin-diagnostics-backup';

let src = fs.readFileSync(file, 'utf8');
if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);

const importNeedle = 'import { eventBus } from "./core/eventBus";';
if (!src.includes(importNeedle)) {
  const dashboardImportBlock = /import \{\s*dashboardAPI\s*\} from "\.\/core\/dashboardAPI";\s*/;
  if (!dashboardImportBlock.test(src)) throw new Error('dashboardAPI import block not found');
  src = src.replace(dashboardImportBlock, match => match + '\n' + importNeedle + '\n');
  console.log('[FIX] App EventBus import added');
}

const winMarker = '[ADMIN F12] WIN LIMPIA';
if (!src.includes(winMarker)) {
  const stateMarker = '  const [dashboard, setDashboard] = useState(dashboardAPI.getLiveDashboard());';
  const pos = src.indexOf(stateMarker);
  if (pos < 0) throw new Error('Admin dashboard state marker not found');

  const insertAt = pos + stateMarker.length;
  const diagnostics = `\n\n  useEffect(() => {\n    const unsubLiveWinDiagnostics = eventBus.subscribe("win:correct", (payload) => {\n      console.log("[ADMIN F12] WIN LIMPIA", payload);\n    });\n\n    const unsubLiveScoreDiagnostics = eventBus.subscribe("game:score_updated", (payload) => {\n      console.log("[ADMIN F12] SCORE UPDATE", payload);\n    });\n\n    return () => {\n      unsubLiveWinDiagnostics && unsubLiveWinDiagnostics();\n      unsubLiveScoreDiagnostics && unsubLiveScoreDiagnostics();\n    };\n  }, []);`;

  src = src.slice(0, insertAt) + diagnostics + src.slice(insertAt);
  console.log('[FIX] Admin LIVE Win Limpia + score diagnostics added');
}

fs.writeFileSync(file, src, 'utf8');
console.log('[PASS] Backup:', backup);
console.log('=== LIVE WIN PIPELINE V5 ADMIN DIAGNOSTICS REPAIR COMPLETE ===');
