import { dashboardAPI } from "../../core/dashboardAPI";

const normalize = value => String(value ?? "").trim().toLowerCase();

function playerKeys(player = {}) {
  return [player.id, player.playerId, player.tiktokId, player.uniqueId, player.username, player.displayName, player.name]
    .filter(Boolean)
    .map(normalize);
}

function resolveWinnerTeam(playerName, dashboard) {
  const game = dashboard?.game || {};
  const players = Array.isArray(game.players) ? game.players : [];
  const teams = Array.isArray(game.teams) ? game.teams : [];
  const target = normalize(playerName);
  if (!target) return null;
  const player = players.find(item => playerKeys(item).includes(target));
  if (!player?.teamId) return null;
  const team = teams.find(item => normalize(item?.id) === normalize(player.teamId));
  if (!team) return null;
  return { id: team.id, name: team.name || (normalize(team.id) === "team1" ? "CHICOS" : "CHICAS") };
}

function repairAnnouncements() {
  const root = document.querySelector(".gender-battle-overlay");
  if (!root) return;
  const announcement = root.querySelector(".gbo-unified-announcement.is-clean");
  const legacyWin = root.querySelector(".gbo-win");
  if (announcement && legacyWin) legacyWin.style.display = "none";
  if (!announcement) return;

  const sub = announcement.querySelector(".gbo-announcement-sub");
  const kicker = announcement.querySelector(".gbo-announcement-kicker");
  if (!sub || !kicker) return;

  const playerName = sub.textContent.trim();
  const team = resolveWinnerTeam(playerName, dashboardAPI.getLiveDashboard());
  if (!team) return;

  const expected = `🏆 PUNTO PARA ${String(team.name).toUpperCase()}`;
  if (kicker.textContent.trim() !== expected) kicker.textContent = expected;
}

let observer;
let scheduled = false;

function scheduleRepair() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    repairAnnouncements();
  });
}

export function installGenderBattleStabilityFix() {
  if (observer) return () => {};
  observer = new MutationObserver(scheduleRepair);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  scheduleRepair();
  return () => {
    observer?.disconnect();
    observer = null;
  };
}
