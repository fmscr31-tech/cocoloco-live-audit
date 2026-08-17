export const GENDER_TEAMS_MODE = "GENDER_TEAMS";

export const DEFAULT_GENDER_TEAMS = [
  { id: "gender_male", name: "Chicos", color: "#3182ce", commands: ["!chicos", "!chico", "!hombres", "!hombre"] },
  { id: "gender_female", name: "Chicas", color: "#e83e8c", commands: ["!chicas", "!chica", "!mujeres", "!mujer"] }
];

export function normalizeGenderMode(mode) {
  return String(mode || "").trim().toUpperCase().replace(/[- ]/g, "_");
}

export function isGenderTeamsMode(mode) {
  return normalizeGenderMode(mode) === GENDER_TEAMS_MODE;
}

export function isPersistentRegistrationMode(mode) {
  return isGenderTeamsMode(mode);
}

export function getDefaultGenderTeams() {
  return DEFAULT_GENDER_TEAMS.map(team => ({
    ...team,
    commands: [...team.commands],
    minPlayers: 1,
    maxPlayers: 100,
    gifts: []
  }));
}
