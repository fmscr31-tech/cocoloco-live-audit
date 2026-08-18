import { addPlayer, players, addWin, getLeaderboard, assignTeam, removePlayer, getPlayer } from "./playerManager";
import { startRound, endRound, getCurrentRound } from "./roundManager";
import { eventBus } from "./eventBus";
import { startTimer, pauseTimer, resumeTimer, resetTimer, getTime } from "./timerManager";
import { saveData, loadData } from "./storageManager";
import { getBattle, addBattlePlayer, battlePlayerWin, removeBattlePlayer } from "./battlemanager";
import { createEvent } from "./eventManager";
import { getTeams, removePlayerFromAllTeams, addPointsToTeam } from "./TeamManager";
import { setPlayers, setRound, setBattle, setTeams, getState as getGlobalState } from "./stateManager";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";
import { isGenderTeamsMode } from "./genderTeamsMode";

