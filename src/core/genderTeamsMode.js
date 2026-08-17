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

// The overlay reads its persisted game mode before the command configuration
// manager finishes normalizing the gender-team configuration. If an older
// TEAM value survives in localStorage, the overlay can render the generic team
// branch and therefore never receive the CHICOS/CHICAS presentation classes.
// Synchronize that stale mode at module load when the persisted configuration
// explicitly says GENDER_TEAMS. Normal TEAM/TEAMS configurations are untouched.
export function synchronizePersistedGenderMode() {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem("cocoloco_command_config_v3");
    if (!raw) return;
    const config = JSON.parse(raw);
    if (isGenderTeamsMode(config?.gameRegistrationMode)) {
      localStorage.setItem("cocoloco_game_mode", GENDER_TEAMS_MODE);
    }
  } catch (error) {
    console.warn("[GenderTeamsMode] Could not synchronize persisted mode:", error);
  }
}

synchronizePersistedGenderMode();

export function getDefaultGenderTeams() {
  return DEFAULT_GENDER_TEAMS.map(team => ({
    ...team,
    commands: [...team.commands],
    minPlayers: 1,
    maxPlayers: 100,
    gifts: []
  }));
}
