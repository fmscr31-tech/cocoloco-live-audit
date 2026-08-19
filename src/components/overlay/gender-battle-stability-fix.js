import { dashboardAPI } from "../../core/dashboardAPI";
import { CANONICAL_GIFTS, resolveCanonicalGiftId } from "../../config/canonicalGifts";

const normalize = value => String(value ?? "").trim().toLowerCase();

function playerKeys(player = {}) {
  return [player.id, player.playerId, player.tiktokId, player.uniqueId, player.username, player.displayName, player.name]
    .filter(Boolean).map(normalize);
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
  return team ? { id: team.id, name: team.name || (normalize(team.id) === "team1" ? "CHICOS" : "CHICAS") } : null;
}

function resolveGiftAsset(giftName, giftId) {
  const canonical = resolveCanonicalGiftId({ giftName, giftId });
  return canonical?.image || null;
}

function flashAnnouncement(announcement, signature) {
  if (announcement.dataset.cocoFlashSignature === signature) return;
  announcement.dataset.cocoFlashSignature = signature;
  announcement.style.display = "";
  announcement.classList.remove("coco-win-flash", "coco-gift-flash");
  void announcement.offsetWidth;
  announcement.classList.add(announcement.classList.contains("is-gift") ? "coco-gift-flash" : "coco-win-flash");
  window.setTimeout(() => {
    if (announcement.dataset.cocoFlashSignature !== signature) return;
    announcement.classList.remove("coco-win-flash", "coco-gift-flash");
    announcement.style.display = "none";
  }, 1900);
}

function repairAnnouncements() {
  const root = document.querySelector(".gender-battle-overlay");
  if (!root) return;

  const legacyWin = root.querySelector(".gbo-win");
  const announcement = root.querySelector(".gbo-unified-announcement");
  if (legacyWin) legacyWin.style.display = "none";
  if (!announcement) return;

  const sub = announcement.querySelector(".gbo-announcement-sub");
  const kicker = announcement.querySelector(".gbo-announcement-kicker");
  if (!sub || !kicker) return;

  if (announcement.classList.contains("is-clean")) {
    const playerName = sub.textContent.trim();
    const team = resolveWinnerTeam(playerName, dashboardAPI.getLiveDashboard());
    if (team) kicker.textContent = `🏆 PUNTO PARA ${String(team.name).toUpperCase()}`;
    const celebration = announcement.querySelector(".gbo-announcement-celebration")?.textContent?.trim() || "";
    flashAnnouncement(announcement, `clean|${playerName}|${celebration}`);
    return;
  }

  if (announcement.classList.contains("is-gift")) {
    const image = announcement.querySelector("img");
    const title = announcement.querySelector(".gbo-announcement-title")?.textContent?.trim() || "";
    const text = sub.textContent.trim();
    const giftMatch = text.match(/^(.+?)\s+→/);
    const giftName = giftMatch?.[1] || "";
    const asset = resolveGiftAsset(giftName, image?.getAttribute("alt") || image?.getAttribute("src") || "");
    if (asset && image && image.src !== asset) image.src = asset;
    flashAnnouncement(announcement, `gift|${title}|${text}`);
  }
}

let observer;
let scheduled = false;
function scheduleRepair() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; repairAnnouncements(); });
}

export function installGenderBattleStabilityFix() {
  if (observer) return () => {};
  observer = new MutationObserver(scheduleRepair);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "src"] });
  scheduleRepair();
  return () => { observer?.disconnect(); observer = null; };
}
