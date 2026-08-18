import { eventBus } from "../../core/eventBus";
import { dashboardAPI } from "../../core/dashboardAPI";

const CLASS_NAME = "gbo-money-gun-target";
const activeTimers = new Map();

function normalize(value) {
  return value == null ? "" : String(value).trim().toLowerCase();
}

function resolveSenderTeamId(payload, dashboard) {
  const direct = payload?.resolvedTeamId || payload?.teamId || payload?.originalTeamId || payload?.senderTeamId;
  if (direct) return String(direct);

  const senderKeys = [payload?.playerId, payload?.username, payload?.uniqueId, payload?.tiktokId, payload?.displayName, payload?.sender]
    .filter(Boolean).map(normalize);
  const player = (dashboard?.game?.players || []).find(p => {
    const keys = [p?.id, p?.playerId, p?.username, p?.uniqueId, p?.tiktokId, p?.displayName, p?.name].filter(Boolean).map(normalize);
    return senderKeys.some(key => keys.includes(key));
  });
  return player?.teamId ? String(player.teamId) : null;
}

function getTeamIds(dashboard) {
  return (dashboard?.game?.teams || []).map(t => String(t?.id ?? "")).filter(Boolean);
}

function clearTarget(teamId) {
  document.querySelectorAll(`.gender-battle-overlay .gbo-team[data-team-id="${CSS.escape(String(teamId))}"]`).forEach(node => {
    node.classList.remove(CLASS_NAME);
  });
  activeTimers.delete(String(teamId));
}

function applyTarget(teamId, executionId) {
  if (!teamId) return;
  const target = String(teamId);
  document.querySelectorAll(`.gender-battle-overlay .gbo-team[data-team-id="${CSS.escape(target)}"]`).forEach(node => {
    node.classList.remove(CLASS_NAME);
    void node.offsetWidth;
    node.classList.add(CLASS_NAME);
  });
  const oldTimer = activeTimers.get(target);
  if (oldTimer) window.clearTimeout(oldTimer);
  const timer = window.setTimeout(() => clearTarget(target), 10000);
  activeTimers.set(target, timer);
  console.debug("[GenderBattleOverlay] Money Gun visual target", { targetTeamId: target, executionId });
}

function onAbilityStarted(payload) {
  if (!payload) return;
  const abilityId = String(payload.abilityId || "").toLowerCase();
  if (abilityId !== "epic_impact") return;

  const dashboard = dashboardAPI.getLiveDashboard();
  const senderTeamId = resolveSenderTeamId(payload, dashboard);
  const teamIds = getTeamIds(dashboard);
  const targetTeamId = teamIds.find(id => id !== senderTeamId) || null;
  if (!targetTeamId) {
    console.warn("[GenderBattleOverlay] Money Gun received without resolvable opponent team", payload);
    return;
  }
  applyTarget(targetTeamId, payload.executionId);
}

if (typeof window !== "undefined") {
  eventBus.subscribe("ability:started", onAbilityStarted);
}
