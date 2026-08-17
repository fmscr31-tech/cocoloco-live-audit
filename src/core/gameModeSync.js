import { dashboardAPI } from "./dashboardAPI";
import { commandConfigManager } from "./commandConfigManager";
import { eventBus } from "./eventBus";

function normalize(mode) {
  const value = String(mode || "").trim().toUpperCase().replace(/[- ]/g, "_");
  if (value === "TEAM" || value === "TEAMS" || value === "EQUIPOS") return "TEAM";
  if (value === "GENDER_TEAMS" || value === "CHICOS_VS_CHICAS") return "GENDER_TEAMS";
  return "INDIVIDUAL";
}

function sync(mode) {
  const normalized = normalize(mode);
  const current = commandConfigManager.getConfig().gameRegistrationMode;
  if (current === normalized) return;
  commandConfigManager.updateFullConfig({ gameRegistrationMode: normalized });
  console.log("[GAME MODE SYNC] Dashboard mode -> registration mode", normalized);
}

sync(dashboardAPI.getGameMode());
eventBus.subscribe("GAME_MODE_CHANGED", payload => sync(payload?.mode || payload));
