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

let installed = false;

function getConfiguredTeams() {
  const config = commandConfigManager.refreshFromStorage();
  const mode = String(config.gameRegistrationMode || "").toUpperCase();
  if (!SUPPORTED_MODES.has(mode)) return [];
  return Array.isArray(config.teams) ? config.teams.slice(0, 2) : [];
}

function registerForTeam(event, team, source, registrationMethod) {
  if (!event || !team) return;

  const result = registrationManager.registerPlayer({
    playerId: event.playerId || event.userId || event.uniqueId || event.username,
    displayName: event.displayName || event.username || event.nickname || "Viewer",
    username: event.username || event.uniqueId || event.displayName || "Viewer",
    avatar: event.profilePictureUrl || event.avatar || event.profilePicture || "",
    teamId: team.id,
    source
  });

  const acceptedEvent = registrationMethod === "GIFT"
    ? "gift:registration_accepted"
    : "chat:command_accepted";
  const rejectedEvent = registrationMethod === "GIFT"
    ? "gift:registration_rejected"
    : "chat:command_rejected";

  eventBus.publish(result?.success ? acceptedEvent : rejectedEvent, {
    event,
    player: result?.player,
    teamId: team.id,
    registrationMethod,
    alreadyRegistered: result?.alreadyRegistered === true,
    reason: result?.reason,
    giftName: event.giftName,
    giftId: event.giftId
  });

  if (result?.success) {
    eventBus.publish("registration:team_registered", {
      player: result.player,
      teamId: team.id,
      registrationMethod,
      command: registrationMethod === "COMMAND" ? (event.message || event.comment || "") : undefined,
      giftName: registrationMethod === "GIFT" ? event.giftName : undefined,
      giftId: registrationMethod === "GIFT" ? event.giftId : undefined
    });
  }
}

function handleChat(event) {
  if (!event || event.type !== "CHAT") return;
  const teams = getConfiguredTeams();
  if (teams.length < 1) return;

  const message = normalize(event.message || event.comment || event.text);
  if (!message) return;

  const team = teams.find(t => Array.isArray(t.commands) && t.commands.some(command => normalize(command) === message));
  if (!team) return;

  registerForTeam(event, team, "CHAT_TEAM", "COMMAND");
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
  registerForTeam(event, team, "GIFT_TEAM", "GIFT");
}

if (!installed) {
  installed = true;
  eventBus.subscribe("normalized:chat", handleChat);
  eventBus.subscribe("normalized:gift", handleGift);
  console.log("[TEAM REGISTRATION] Command + gift registration bridge installed.");
}

export { handleChat as handleGenderTeamRegistration, handleGift as handleTeamGiftRegistration };
