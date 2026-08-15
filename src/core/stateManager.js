const state = {

  session: null,

  battle: null,

  round: null,

  players: [],

  teams: [],

  events: [],

  gifts: [],

  missions: [],

  settings: {

    gameName: "Contexto",

    teamMode: false,

    animations: true,

    sounds: true

  }

};


/* ===========================
   SUSCRIPCIONES
=========================== */

const listeners = new Set();

function notify() {

  listeners.forEach(listener => {

    listener(getState());

  });

}

export function subscribe(listener) {

  listeners.add(listener);

}

export function unsubscribe(listener) {

  listeners.delete(listener);

}


/* ===========================
   GETTERS
=========================== */

export function getState() {

  return state;

}


/* ===========================
   SETTERS
=========================== */

export function setSession(session) {

  state.session = session;

  notify();

}

export function setBattle(battle) {

  state.battle = battle;

  notify();

}

export function setRound(round) {

  state.round = round;

  notify();

}

export function setPlayers(players) {

  state.players = players;

  notify();

}

export function setTeams(teams) {

  state.teams = teams;

  notify();

}

export function setEvents(events) {

  state.events = events;

  notify();

}

export function setGifts(gifts) {

  state.gifts = gifts;

  notify();

}

export function setMissions(missions) {

  state.missions = missions;

  notify();

}

export function updateSettings(settings) {

  state.settings = {

    ...state.settings,

    ...settings

  };

  notify();

}


/* ===========================
   RESET
=========================== */

export function resetState() {

  state.session = null;

  state.battle = null;

  state.round = null;

  state.players = [];

  state.teams = [];

  state.events = [];

  state.gifts = [];

  state.missions = [];

  state.settings = {

    gameName: "Contexto",

    teamMode: false,

    animations: true,

    sounds: true

  };

  notify();

}