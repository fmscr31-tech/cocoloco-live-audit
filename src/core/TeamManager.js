const STORAGE_KEY = "cocoloco_teams";

let teams = [];

function saveTeams() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

function loadTeams() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) teams = JSON.parse(saved);
}

function createTeam({ id = crypto.randomUUID(), name, color = "#ffffff", icon = "🏳️" }) {
  const exists = teams.find(team => team.name.toLowerCase() === name.toLowerCase());
  if (exists) return exists;

  const team = { id, name, color, icon, points: 0, wins: 0, players: [] };
  teams.push(team);
  saveTeams();
  return team;
}

function syncConfiguredTeams(configTeams = []) {
  if (!Array.isArray(configTeams) || configTeams.length === 0) return getTeams();

  const next = configTeams.map((configTeam, index) => {
    const id = configTeam.id || `team_${index + 1}`;
    const normalizedName = String(configTeam.name || `Equipo ${index + 1}`).trim().toLowerCase();

    const existing = teams.find(team =>
      String(team.id) === String(id) ||
      String(team.name || "").trim().toLowerCase() === normalizedName
    );

    return {
      ...(existing || {}),
      id,
      name: configTeam.name || existing?.name || `Equipo ${index + 1}`,
      color: configTeam.color || existing?.color || "#ffffff",
      icon: configTeam.icon || existing?.icon || "🏳️",
      points: Number(existing?.points) || 0,
      wins: Number(existing?.wins) || 0,
      players: Array.isArray(existing?.players) ? existing.players : []
    };
  });

  // IMPORTANT: configured order is canonical visual order.
  // Never reorder teams by score, wins, MVPs, or any ranking value.
  teams = next;
  saveTeams();
  return getTeams();
}

function deleteTeam(teamId) {
  teams = teams.filter(team => team.id !== teamId);
  saveTeams();
}

function addPlayerToTeam(teamId, playerId) {
  const team = teams.find(team => team.id === teamId);
  if (!team) return;
  if (team.players.includes(playerId)) return;
  team.players.push(playerId);
  saveTeams();
}

function removePlayerFromTeam(teamId, playerId) {
  const team = teams.find(team => team.id === teamId);
  if (!team) return;
  team.players = team.players.filter(id => id !== playerId);
  saveTeams();
}

function removePlayerFromAllTeams(playerId) {
  teams.forEach(team => {
    team.players = team.players.filter(id => id !== playerId);
  });
  saveTeams();
}

function addPointsToTeam(teamId, points) {
  const team = teams.find(team => String(team.id) === String(teamId));
  if (!team) return null;
  team.points = Math.max(0, (Number(team.points) || 0) + Number(points || 0));
  saveTeams();
  return { ...team };
}

function addTeamPoints(teamId, points) {
  return addPointsToTeam(teamId, points);
}

function addWinToTeam(teamId) {
  const team = teams.find(team => String(team.id) === String(teamId));
  if (!team) return null;
  team.wins = Math.max(0, (Number(team.wins) || 0) + 1);
  saveTeams();
  return { ...team };
}

function adjustTeamWins(teamId, delta) {
  const team = teams.find(team => String(team.id) === String(teamId));
  if (!team) return null;
  team.wins = Math.max(0, (Number(team.wins) || 0) + Number(delta || 0));
  saveTeams();
  return { ...team };
}

function getTeam(teamId) {
  loadTeams();
  return teams.find(team => String(team.id) === String(teamId));
}

function getTeams() {
  loadTeams();
  // DO NOT SORT HERE.
  // The configured TeamManager order is the canonical left-to-right overlay order.
  // Team 1 stays left and Team 2 stays right regardless of score/wins.
  return [...teams];
}

function resetTeams() {
  teams = [];
  saveTeams();
}

/**
 * Resets only the round scoreboard. Team definitions remain intact.
 * Historical/session data is archived by roundManager before this function runs.
 * Points, round wins, and round player assignments all belong to the completed
 * round and therefore return to their clean-round state.
 */
function resetRoundTeamScores() {
  loadTeams();
  teams.forEach(team => {
    team.points = 0;
    team.wins = 0;
    team.players = [];
  });
  saveTeams();
  return getTeams();
}

loadTeams();

export {
  loadTeams,
  saveTeams,
  createTeam,
  syncConfiguredTeams,
  deleteTeam,
  addPlayerToTeam,
  removePlayerFromTeam,
  removePlayerFromAllTeams,
  addPointsToTeam,
  addTeamPoints,
  addWinToTeam,
  adjustTeamWins,
  getTeam,
  getTeams,
  resetTeams,
  resetRoundTeamScores
};
