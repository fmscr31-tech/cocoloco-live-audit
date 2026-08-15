import { createEvent } from "./eventManager.js";


let currentBattle = null;



// ===============================
// GUARDAR BATALLA
// ===============================

function saveBattle(){

  localStorage.setItem(
    "cocoloco_battle",
    JSON.stringify(currentBattle)
  );

}



// ===============================
// CARGAR BATALLA
// ===============================

function loadBattle(){

  const saved = localStorage.getItem(
    "cocoloco_battle"
  );


  if(saved){

    currentBattle = JSON.parse(saved);

  }

}



// ===============================
// CREAR BATALLA
// ===============================

export function createBattle(data){

  currentBattle = {

    id: Date.now(),

    name:data.name,

    duration:data.duration,

    prize:data.prize,

    status:"waiting",

    createdAt:Date.now(),

    players:[],

    teams:[],

    winner:null

  };


  saveBattle();


  createEvent(
    "BATTLE_CREATED",
    {
      battleId:currentBattle.id,
      name:currentBattle.name
    }
  );


  return currentBattle;

}



// ===============================
// OBTENER BATALLA
// ===============================

export function getBattle(){

  if(!currentBattle){

    loadBattle();

  }


  return currentBattle;

}



// ===============================
// INICIAR BATALLA
// ===============================

export function startBattle(){

  if(!currentBattle) return;


  currentBattle.status="running";


  saveBattle();


  createEvent(
    "BATTLE_START",
    {
      battleId:currentBattle.id,
      message:"Batalla iniciada"
    }
  );


  return currentBattle;

}



// ===============================
// FINALIZAR BATALLA
// ===============================

export function finishBattle(){

  if(!currentBattle) return;


  currentBattle.status="finished";


  currentBattle.winner=getTeamLeader();


  saveBattle();


  createEvent(
    "BATTLE_FINISH",
    {
      battleId:currentBattle.id,
      winner:currentBattle.winner,
      message:"Batalla finalizada"
    }
  );


  return currentBattle;

}



// ===============================
// CREAR EQUIPO EN BATALLA
// ===============================

export function createBattleTeam(data){

  if(!currentBattle) return null;


  const exists = currentBattle.teams.find(
    team =>
    team.name.toLowerCase() === data.name.toLowerCase()
  );


  if(exists){

    return exists;

  }



  const team = {

    id:crypto.randomUUID(),

    name:data.name,

    color:data.color || "#ffffff",

    icon:data.icon || "🏳️",

    points:0,

    wins:0,

    players:[]

  };



  currentBattle.teams.push(team);


  saveBattle();


  createEvent(
    "TEAM_CREATED",
    {
      teamId:team.id,
      name:team.name
    }
  );


  return team;

}



// ===============================
// OBTENER EQUIPOS
// ===============================

export function getBattleTeams(){

  if(!currentBattle) return [];


  return [...currentBattle.teams];

}



// ===============================
// AGREGAR JUGADOR A EQUIPO
// ===============================

export function addPlayerToBattleTeam(
  teamId,
  playerId
){

  if(!currentBattle) return null;



  const team = currentBattle.teams.find(
    t=>t.id===teamId
  );


  if(!team) return null;



  if(!team.players.includes(playerId)){

    team.players.push(playerId);

  }


  saveBattle();


  createEvent(
    "PLAYER_JOIN_TEAM",
    {
      teamId,
      playerId
    }
  );


  return team;

}



// ===============================
// SUMAR PUNTOS A EQUIPO
// ===============================

export function addTeamPoints(
  teamId,
  points
){

  if(!currentBattle) return null;



  const team=currentBattle.teams.find(
    t=>t.id===teamId
  );


  if(!team) return null;



  team.points += points;


  saveBattle();


  createEvent(
    "TEAM_POINTS_ADD",
    {
      teamId,
      points,
      total:team.points
    }
  );


  return team;

}



// ===============================
// RANKING EQUIPOS
// ===============================

export function getTeamRanking(){

  if(!currentBattle) return [];


  return [...currentBattle.teams].sort(
    (a,b)=>b.points-a.points
  );

}



// ===============================
// GANADOR DE EQUIPO
// ===============================

function getTeamLeader(){

  const ranking=getTeamRanking();


  if(ranking.length===0){

    return null;

  }


  return ranking[0];

}



// ===============================
// AGREGAR JUGADOR A BATALLA
// ===============================

export function addBattlePlayer(player){

  if(!currentBattle) return null;



  const exists=currentBattle.players.find(
    p=>p.id===player.id
  );


  if(exists){

    return exists;

  }



  const battlePlayer={

    id:player.id,

    name:player.name,

    wins:0

  };



  currentBattle.players.push(
    battlePlayer
  );


  saveBattle();


  createEvent(
    "BATTLE_PLAYER_JOIN",
    {
      battleId:currentBattle.id,
      playerId:player.id,
      name:player.name
    }
  );


  return battlePlayer;

}



// ===============================
// REMOVER JUGADOR DE BATALLA
// ===============================

export function removeBattlePlayer(playerId){

  if(!currentBattle) return null;


  const player = currentBattle.players.find(
    p => p.id === playerId
  );


  if(!player) return null;



  currentBattle.players =
    currentBattle.players.filter(
      p => p.id !== playerId
    );



  saveBattle();



  createEvent(
    "BATTLE_PLAYER_REMOVED",
    {
      battleId:currentBattle.id,
      playerId,
      name:player.name
    }
  );



  return player;

}



// ===============================
// VICTORIA JUGADOR
// ===============================

export function battlePlayerWin(id){

  if(!currentBattle) return null;



  const player=currentBattle.players.find(
    p=>p.id===id
  );


  if(!player) return null;


  player.wins++;


  saveBattle();


  createEvent(
    "BATTLE_PLAYER_WIN",
    {
      playerId:id,
      wins:player.wins
    }
  );


  return player;

}



// ===============================
// RANKING JUGADORES
// ===============================

export function getBattleRanking(){

  if(!currentBattle) return [];


  return [...currentBattle.players].sort(
    (a,b)=>b.wins-a.wins
  );

}



// ===============================
// REINICIAR PUNTOS
// ===============================

export function resetBattleScore(){

  if(!currentBattle) return;


  currentBattle.players.forEach(
    player=>{
      player.wins=0;
    }
  );


  currentBattle.teams.forEach(
    team=>{
      team.points=0;
      team.wins=0;
    }
  );


  saveBattle();

}



// ===============================
// LIMPIAR BATALLA
// ===============================

export function clearBattle(){

  currentBattle=null;


  localStorage.removeItem(
    "cocoloco_battle"
  );

}