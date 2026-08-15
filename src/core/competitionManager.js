const STORAGE_KEY = "cocoloco_competition";

let activeCompetition = null;



function saveCompetition() {

  if (activeCompetition) {

    localStorage.setItem(

      STORAGE_KEY,

      JSON.stringify(activeCompetition)

    );

  } else {

    localStorage.removeItem(STORAGE_KEY);

  }

}



function loadCompetition() {

  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {

    try {

      activeCompetition = JSON.parse(saved);

    } catch (e) {

      activeCompetition = null;

    }

  }

}



export function createCompetition(data = {}) {

  activeCompetition = {

    id: data.id || `comp_${Date.now()}`,

    name: data.name || "CocoLoco Championship",

    status: data.status || "waiting",

    activeGameMode: data.activeGameMode || "individual",

    timers: data.timers || {

      duration: 1200,

      remainingSeconds: 1200,

      running: false

    },

    registrationSettings: data.registrationSettings || {

      isOpen: false,

      entryGiftId: "rose",

      minGiftsRequired: 1,

      autoApprove: true

    },

    scoringRules: data.scoringRules || {

      pointsPerWin: 100,

      giftMultiplier: 1,

      streakBonus: 10

    },

    teams: data.teams || [],

    players: data.players || [],

    createdAt: Date.now()

  };



  saveCompetition();

  return activeCompetition;

}



export function getCompetition() {

  if (!activeCompetition) {

    loadCompetition();

  }

  return activeCompetition;

}



export function updateCompetition(updates = {}) {

  if (!activeCompetition) {

    createCompetition();

  }

  activeCompetition = {

    ...activeCompetition,

    ...updates,

    updatedAt: Date.now()

  };

  saveCompetition();

  return activeCompetition;

}



export function resetCompetition() {

  if (activeCompetition) {

    activeCompetition.status = "waiting";

    activeCompetition.timers.running = false;

    activeCompetition.timers.remainingSeconds = activeCompetition.timers.duration;

    saveCompetition();

  }

  return activeCompetition;

}



export function closeCompetition() {

  if (activeCompetition) {

    activeCompetition.status = "finished";

    activeCompetition.timers.running = false;

    saveCompetition();

  }

  const comp = activeCompetition;

  activeCompetition = null;

  localStorage.removeItem(STORAGE_KEY);

  return comp;

}



// Load on start
loadCompetition();
