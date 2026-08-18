import { eventBus } from "./eventBus";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";

const MODE = "GENDER_TEAMS";

const normalize = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^\p{L}\p{N}\s]/gu, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

let installed = false;

function getGenderTeams() {
  const config = commandConfigManager.refreshFromStorage();
  if (String(config.gameRegistrationMode || "").toUpperCase() !== MODE) return [];
  return Array.isArray(config.teams) ? config.teams.slice(0, 2) : [];
}

function registerForGenderTeam(event, team) {
  if (!event || !team) return;

  const result = registrationManager.registerPlayer({
    playerId: event.playerId || event.userId || event.uniqueId || event.username,
    displayName: event.displayName || event.username || event.nickname || "Viewer",
    username: event.username || event.uniqueId || event.displayName || "Viewer",
    avatar: event.profilePictureUrl || event.avatar || event.profilePicture || "",
    teamId: team.id,
    source: "CHAT_GENDER_TEAM"
  });

  if (result?.success) {
    eventBus.publish("chat:command_accepted", {
      event,
      player: result.player,
      teamId: team.id,
      registrationMethod: "COMMAND",
      genderTeam: true
    });
    eventBus.publish("registration:gender_team_registered", {
      player: result.player,
      teamId: team.id,
      command: event.message || event.comment || ""
    });
  } else {
    eventBus.publish("chat:command_rejected", {
      event,
      reason: result?.reason || "REGISTRATION_FAILED",
      teamId: team.id,
      registrationMethod: "COMMAND",
      genderTeam: true
    });
  }
}

function handleChat(event) {
  if (!event || event.type !== "CHAT") return;
  const teams = getGenderTeams();
  if (teams.length < 2) return;

  const message = normalize(event.message || event.comment || event.text);
  if (!message) return;

  const team = teams.find(t => Array.isArray(t.commands) && t.commands.some(command => normalize(command) === message));
  if (!team) return;

  registerForGenderTeam(event, team);
}

if (!installed) {
  installed = true;
  eventBus.subscribe("normalized:chat", handleChat);
  console.log("[GENDER TEAM REGISTRATION] Command bridge installed.");
}

export { handleChat as handleGenderTeamRegistration };
