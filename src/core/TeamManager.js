const STORAGE_KEY = "cocoloco_teams";

let teams = [];


// ==============================
// GUARDAR
// ==============================

function saveTeams() {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(teams)
  );

}


// ==============================
// CARGAR
// ==============================

function loadTeams() {

  const saved = localStorage.getItem(
    STORAGE_KEY
  );


  if (saved) {

    teams = JSON.parse(saved);

  }

}



// ==============================
// CREAR EQUIPO
// ==============================

function createTeam({

  id = crypto.randomUUID(),

  name,

  color = "#ffffff",

  icon = "🏳️"

}) {


  const exists = teams.find(

    team =>
      team.name.toLowerCase() === name.toLowerCase()

  );


  if (exists) return exists;



  const team = {


    id,

    name,

    color,

    icon,

    points: 0,

    wins: 0,

    players: []


  };



  teams.push(team);


  saveTeams();


  return team;


}





// ==============================
// ELIMINAR EQUIPO
// ==============================

function deleteTeam(teamId) {


  teams = teams.filter(

    team => team.id !== teamId

  );


  saveTeams();


}





// ==============================
// AGREGAR JUGADOR
// ==============================

function addPlayerToTeam(teamId, playerId) {


  const team = teams.find(

    team => team.id === teamId

  );


  if (!team) return;


  if (team.players.includes(playerId)) return;



  team.players.push(playerId);


  saveTeams();


}





// ==============================
// REMOVER JUGADOR
// ==============================

function removePlayerFromTeam(teamId, playerId) {


  const team = teams.find(

    team => team.id === teamId

  );


  if (!team) return;



  team.players = team.players.filter(

    id => id !== playerId

  );


  saveTeams();


}


function removePlayerFromAllTeams(playerId) {
  teams.forEach(team => {
    team.players = team.players.filter(id => id !== playerId);
  });
  saveTeams();
}





// ==============================
// SUMAR PUNTOS
// ==============================

function addPointsToTeam(teamId, points) {


  const team = teams.find(

    team => team.id === teamId

  );


  if (!team) return;



  team.points += points;


  saveTeams();


  return team;


}





// ==============================
// COMPATIBILIDAD APP.JSX
// ==============================
// No cambia la lógica.
// Solo usa el mismo sistema.

function addTeamPoints(teamId, points) {

  return addPointsToTeam(
    teamId,
    points
  );

}





// ==============================
// SUMAR VICTORIA
// ==============================

function addWinToTeam(teamId) {


  const team = teams.find(

    team => team.id === teamId

  );


  if (!team) return;



  team.wins++;


  saveTeams();


}





// ==============================
// OBTENER EQUIPO
// ==============================

function getTeam(teamId) {


  return teams.find(

    team => team.id === teamId

  );


}





// ==============================
// OBTENER TODOS
// ==============================

function getTeams() {


  return [...teams].sort(

    (a,b) => b.points - a.points

  );


}





// ==============================
// RESET
// ==============================

function resetTeams() {


  teams = [];


  saveTeams();


}


function resetRoundTeamScores() {
  teams.forEach(team => {
    team.points = 0;
  });
  saveTeams();
}



// CARGAR AL INICIAR

loadTeams();



export {

  loadTeams,

  saveTeams,

  createTeam,

  deleteTeam,

  addPlayerToTeam,

  removePlayerFromTeam,
  removePlayerFromAllTeams,

  addPointsToTeam,

  addTeamPoints,

  addWinToTeam,

  getTeam,

  getTeams,

  resetTeams,

  resetRoundTeamScores

};
