import { eventBus } from "./eventBus";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";

const SUPPORTED_MODES = new Set(["GENDER_TEAMS", "TEAMS", "TEAM"]);

const normalize = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^\p{L}\p{N}\s]/gu, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const giftCandidates = event => [
  event?.canonicalGiftId,
  event?.giftName,
  event?.giftDisplayName,
  event?.giftId,
  event?.rawInput
].map(normalize).filter(Boolean);

const configuredGiftCandidates = team => {
  const configured = team?.registrationGift ?? team?.registrationGiftId ?? team?.registrationGiftName ?? "";
  const values = Array.isArray(configured) ? configured : [configured];
  return values.map(normalize).filter(Boolean);
};

function getConfiguredTeams() {
  const config = commandConfigManager.refreshFromStorage();
  const mode = String(config.gameRegistrationMode || "").toUpperCase();
  if (!SUPPORTED_MODES.has(mode)) return [];
  return Array.isArray(config.teams) ? config.teams.slice(0, 2) : [];
}

function handleGift(event) {
  const teams = getConfiguredTeams();
  if (teams.length < 1) return;

  const received = giftCandidates(event);
  if (!received.length) return;

  const team = teams.find(candidate => {
    if (candidate?.registrationGiftEnabled !== true) return false;
    const expected = configuredGiftCandidates(candidate);
    if (!expected.length) return false;
    return received.some(value => expected.some(gift => value === gift || value.includes(gift) || gift.includes(value)));
  });

  if (!team) return;

  const result = registrationManager.registerPlayer({
    playerId: event.playerId || event.userId || event.uniqueId || event.username,
    displayName: event.displayName || event.username || event.nickname || "Viewer",
    username: event.username || event.uniqueId || event.displayName || "Viewer",
    avatar: event.profilePictureUrl || event.avatar || event.profilePicture || "",
    teamId: team.id,
    source: "GIFT_TEAM"
  });

  if (result?.success) {
    eventBus.publish("gift:registration_accepted", {
      event,
      player: result.player,
      teamId: team.id,
      registrationMethod: "GIFT",
      alreadyRegistered: result.alreadyRegistered === true,
      giftName: event.giftName,
      giftId: event.giftId
    });
    eventBus.publish("registration:team_registered", {
      player: result.player,
      teamId: team.id,
      registrationMethod: "GIFT",
      giftName: event.giftName,
      giftId: event.giftId
    });
  } else {
    eventBus.publish("gift:registration_rejected", {
      event,
      reason: result?.reason || "REGISTRATION_FAILED",
      teamId: team.id,
      registrationMethod: "GIFT",
      giftName: event.giftName,
      giftId: event.giftId
    });
  }
}

let installed = false;
if (!installed) {
  installed = true;
  eventBus.subscribe("normalized:gift", handleGift);
  console.log("[TEAM REGISTRATION] Configurable gift registration bridge installed.");
}

export { handleGift as handleTeamGiftRegistration };
