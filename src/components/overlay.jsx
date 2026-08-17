import {
  useEffect,
  useState,
  useRef
} from "react";

import {
  dashboardAPI
} from "../core/dashboardAPI";

import {
  getNewEvent
} from "../core/eventManager";

import { eventBus } from "../core/eventBus";
import "../core/audioManager";

import { ScoreBoard } from "./overlay/ScoreBoard";
import { GiftFeed } from "./overlay/GiftFeed";
import { OverlayHeader } from "./overlay/OverlayHeader";
import { PlayerStats } from "./overlay/PlayerStats";
import { BattleEffects } from "./overlay/BattleEffects";
import { PowerUpFeed } from "./overlay/PowerUpFeed";
import { BattleAnnouncement } from "./overlay/BattleAnnouncement";
import { LivePhaseTimer } from "./overlay/LivePhaseTimer";
import { SessionRecord } from "./overlay/SessionRecord";

import "./overlay.css";

const normalizeMode = (m) => {
  const upper = String(m || "").toUpperCase();
  if (
    upper === "TEAM" ||
    upper === "TEAMS" ||
    upper === "EQUIPOS" ||
    upper === "GENDER_TEAMS" ||
    upper === "GENDER-TEAMS" ||
    upper === "CHICOS_VS_CHICAS" ||
    upper === "CHICOS VS CHICAS"
  ) return "team";
  return "individual";
};

function Overlay({ mode = "team", testDonutTeamId, testHatTeamId, testGalaxyTeamId, testMoneyGunTeamId, testEpicEvent, testGalaxyPopup, testFrozenTeamId, testFrozenDetails, testEpicGift, testHighlightedPlayerId, testScare, testShowWin, testWinner, testPlayers, testTeams, testRound, testTimer, testLiveActive }){

const [state,setState]=useState({
  players:[], battle:null, teams:[], round:null,
  timer:{ minutes:0, seconds:0 }, liveActive: false
});

const effectivePlayers = testPlayers !== undefined ? testPlayers : state.players;
const effectiveTeams = testTeams !== undefined ? testTeams : state.teams;
const effectiveRound = testRound !== undefined ? testRound : state.round;
const effectiveTimer = testTimer !== undefined ? testTimer : state.timer;
const effectiveLiveActive = testLiveActive !== undefined ? testLiveActive : state.liveActive;

const [penalty,setPenalty]=useState({ active:false, teamId:null, teamName:"", minutes:5, seconds:0 });
const [alert,setAlert]=useState(null);
const [winner,setWinner]=useState(null);
const [showWin,setShowWin]=useState(false);
const [battleEffects,setBattleEffects]=useState(null);
const [powerUps,setPowerUps]=useState([]);
const [donutTeamId, setDonutTeamId] = useState(null);
const [hatTeamId, setHatTeamId] = useState(null);
const [galaxyTeamId, setGalaxyTeamId] = useState(null);
const [galaxyPopup, setGalaxyPopup] = useState(null);
const [moneyGunTeamId, setMoneyGunTeamId] = useState(null);
const [epicEvent, setEpicEvent] = useState(null);
const [epicGift, setEpicGift] = useState(null);
const [frozenTeamId, setFrozenTeamId] = useState(null);
const [frozenDetails, setFrozenDetails] = useState(null);
const [highlightedPlayerId, setHighlightedPlayerId] = useState(null);

const [currentMode, setCurrentMode] = useState(() => {
  const apiMode = dashboardAPI.getGameMode();
  return apiMode ? normalizeMode(apiMode) : normalizeMode(mode);
});

const effectiveDonut = testDonutTeamId !== undefined ? testDonutTeamId : donutTeamId;
const effectiveHat = testHatTeamId !== undefined ? testHatTeamId : hatTeamId;
const effectiveGalaxy = testGalaxyTeamId !== undefined ? testGalaxyTeamId : galaxyTeamId;
const effectiveMoneyGun = testMoneyGunTeamId !== undefined ? testMoneyGunTeamId : moneyGunTeamId;
const effectiveEpicEvent = testEpicEvent !== undefined ? testEpicEvent : epicEvent;
const effectiveGalaxyPopup = testGalaxyPopup !== undefined ? testGalaxyPopup : galaxyPopup;
const effectiveFrozenTeamId = testFrozenTeamId !== undefined ? testFrozenTeamId : frozenTeamId;
const effectiveFrozenDetails = testFrozenDetails !== undefined ? testFrozenDetails : frozenDetails;
const effectiveEpicGift = testEpicGift !== undefined ? testEpicGift : epicGift;
const effectiveHighlightedPlayerId = testHighlightedPlayerId !== undefined ? testHighlightedPlayerId : highlightedPlayerId;
const effectiveScare = testScare !== undefined ? testScare : false;
const effectiveShowWin = testShowWin !== undefined ? testShowWin : showWin;
const effectiveWinner = testWinner !== undefined ? testWinner : winner;

const stateRef=useRef(state);
useEffect(()=>{ stateRef.current=state; },[state]);

useEffect(() => {
  if (mode) setCurrentMode(normalizeMode(mode));
}, [mode]);

useEffect(()=>{
  const unsubscribe = dashboardAPI.subscribe((dashboard) => { updateOverlayFromDashboard(dashboard); });
  const unsubMode = dashboardAPI.subscribeToModeChange(({ mode }) => { setCurrentMode(normalizeMode(mode)); });
  return ()=>{ unsubscribe && unsubscribe(); unsubMode && unsubMode(); };
},[]);

useEffect(() => {
  const unsubStarted = eventBus.subscribe("ability:started", (item) => {
    console.log("[OVERLAY EVENT RECEIVED]", item);
    setShowWin(false); setWinner(null);
    const giftName = item.sourceGift || (item.abilityId === "epic_impact" ? "Money Gun" : item.abilityId === "ultimate_galaxy" ? "Galaxy" : item.abilityId === "creative_challenge" ? "Cowboy Hat" : "Donut");
    const icon = item.display?.icon || (item.abilityId === "epic_impact" ? "💥" : item.abilityId === "ultimate_galaxy" ? "🌌" : item.abilityId === "creative_challenge" ? "🤠" : "🍩");
    setEpicGift({ giftName, username: item.sender || "FERNANDO", icon });
    setTimeout(() => { setEpicGift(null); }, 1200);
    if (item.abilityId === "silent_challenge") {
      setDonutTeamId(item.teamId || "team1");
      setEpicEvent({ giftDisplay: `🍩 ${item.sourceGift?.toUpperCase() || "DONUT"} x5`, tagline: item.display?.name ? `EL MUDO • ${item.display.name.toUpperCase()}` : "EL MUDO • RETO ACTIVO", username: item.sender || "ANNA" });
      setAlert(`🔇 [EL MUDO] ¡RETO ACTIVO LANZADO POR ${item.sender || "ANNA"}!`);
    } else if (item.abilityId === "creative_challenge") {
      setHatTeamId(item.teamId || "team1");
      setEpicEvent({ giftDisplay: `🤠 ${item.sourceGift?.toUpperCase() || "SOMBRERO"}`, tagline: item.display?.name ? `RETO CREATIVO • ${item.display.name.toUpperCase()}` : "RETO CREATIVO ACTIVO", username: item.sender || "FERNANDO" });
      setAlert(`🤠 [RETO CREATIVO] ¡MODO ARTISTA ACTIVADO POR ${item.sender || "FERNANDO"}!`);
    } else if (item.abilityId === "ultimate_galaxy") {
      setGalaxyTeamId(item.teamId || "team1");
      setGalaxyPopup({ sender: item.sender || "FERNANDO", phrase: item.phrase || "⚡ ULTIMATE ACTIVATED ⚡" });
      setEpicEvent({ giftDisplay: `🌌 ${item.sourceGift?.toUpperCase() || "GALAXY"}`, tagline: "ULTIMATE GALAXY ENERGY", username: item.sender || "FERNANDO" });
      setAlert(`🌌 [ULTIMATE ENERGY] ¡GALAXY LANZADA POR ${item.sender || "FERNANDO"}! ¡+1 RONDA CARGADA!`);
    } else if (item.abilityId === "epic_impact") {
      setMoneyGunTeamId(item.teamId || "team2");
      setEpicEvent({ giftDisplay: `💥 ${item.sourceGift?.toUpperCase() || "MONEY GUN"}`, tagline: "EPIC IMPACT BULLET STORM", username: item.sender || "FERNANDO" });
      setAlert(`🔫 [TRAKA TRAKATAKATA RATA TA] ¡MONEY GUN BULLET STORM! ¡MARCADOR DESTRUIDO A 0!`);
    }
  });
  const unsubFinished = eventBus.subscribe("ability:finished", (item) => {
    if (item.abilityId === "silent_challenge") setDonutTeamId(null);
    else if (item.abilityId === "creative_challenge") setHatTeamId(null);
    else if (item.abilityId === "ultimate_galaxy") { setGalaxyTeamId(null); setGalaxyPopup(null); }
    else if (item.abilityId === "epic_impact") setMoneyGunTeamId(null);
    setEpicEvent(null); setAlert(null);
  });
  const unsubActivated = eventBus.subscribe("effect:activated", (effect) => {
    if (effect.type === "FREEZE") {
      setFrozenTeamId(effect.affectedTeamId || "team1");
      setFrozenDetails({ remainingTime: effect.totalDuration || 30, activatedBy: effect.activatedBy || "FERNANDO" });
    }
  });
  const unsubUpdated = eventBus.subscribe("effect:updated", (effect) => {
    if (effect.type === "FREEZE") setFrozenDetails(prev => prev ? { ...prev, remainingTime: effect.remainingTime } : { remainingTime: effect.remainingTime, activatedBy: effect.activatedBy });
  });
  const unsubRemoved = eventBus.subscribe("effect:removed", () => { setFrozenTeamId(null); setFrozenDetails(null); setAlert(null); });
  const unsubExpired = eventBus.subscribe("effect:expired", () => { setFrozenTeamId(null); setFrozenDetails(null); setAlert(null); });
  const unsubHighlight = eventBus.subscribe("player:highlight", (data) => {
    if (data && data.playerId) { setHighlightedPlayerId(data.playerId); setTimeout(() => { setHighlightedPlayerId(null); }, 1400); }
  });
  const unsubReset = eventBus.subscribe("overlay:reset", () => {
    setState({ players: [], battle: null, teams: [], round: null, timer: { minutes: 0, seconds: 0 }, liveActive: false });
    setShowWin(false); setWinner(null); setDonutTeamId(null); setHatTeamId(null); setGalaxyTeamId(null); setGalaxyPopup(null); setMoneyGunTeamId(null); setFrozenTeamId(null); setFrozenDetails(null); setEpicEvent(null); setEpicGift(null); setAlert(null);
  });
  return () => { unsubStarted(); unsubFinished(); unsubActivated(); unsubUpdated(); unsubRemoved(); unsubExpired(); unsubHighlight(); unsubReset(); };
}, []);

function updateOverlayFromDashboard(dashboard){
  console.log("[OVERLAY STATE UPDATED]", dashboard);
  const newState=dashboard.game || {};
  if (dashboard.gameMode) setCurrentMode(normalizeMode(dashboard.gameMode));
  setBattleEffects(dashboard.battleEffects || null);
  if (dashboard.battleEffects?.active) {
    setFrozenTeamId(dashboard.battleEffects.frozenTeams?.[0] || dashboard.battleEffects.affectedTeamId || "team1");
    setFrozenDetails({ remainingTime: dashboard.battleEffects.remainingTime || 30, activatedBy: dashboard.battleEffects.activatedBy || "FERNANDO" });
  }
  setPowerUps(dashboard.powerUps?.activePowerUps || []);
  const event=getNewEvent();
  if(event){
    if(event.type==="BATTLE_START") setAlert("⚔️ BATALLA INICIADA");
    if(event.type==="BATTLE_END") setAlert("🏆 BATALLA FINALIZADA");
    if(event.type==="PLAYER_WIN"){
      setWinner({ id: event.data.playerId, name: event.data.name, points: event.data.points, wins: event.data.wins });
      setShowWin(true); setAlert(`👑 ¡CAMPEÓN: ${event.data.name}!`);
      setTimeout(()=>{ setShowWin(false); setAlert(null); },4000);
    }
    setTimeout(()=>{ setAlert(null); },3000);
  }
  const oldState=stateRef.current;
  if(newState.players && newState.players.length){
    const changed=newState.players.find(player=>{
      const oldPlayer=oldState.players.find(p=>p.id===player.id);
      return player.wins > (oldPlayer ? oldPlayer.wins : 0);
    });
    if(changed){ setWinner(changed); setShowWin(true); setTimeout(()=>{ setShowWin(false); },3000); }
  }
  const isRoundActive = newState.round && newState.round.active;
  const hasRegisteredPlayers = Array.isArray(dashboard?.registration?.players) && dashboard.registration.players.length > 0;
  const registrationOpen = dashboard?.registration?.status === "OPEN";
  const shouldShowRegPlayers = dashboard.liveActive || isRoundActive || (newState.players && newState.players.length > 0) || hasRegisteredPlayers || registrationOpen;
  const regPlayers = shouldShowRegPlayers ? (dashboard.registration?.players || []).map(p => ({
    id: p.playerId || p.id, name: p.displayName || p.name || p.username, displayName: p.displayName || p.name || p.username, username: p.username || p.displayName, avatar: p.avatar, teamId: p.teamId, points: p.points || 0, wins: p.wins || 0
  })) : [];
  const activePlayers = (newState.players && newState.players.length > 0) ? newState.players : regPlayers;
  const updated={ players: activePlayers, battle:newState.battle, teams:newState.teams || [], round:newState.round, timer:newState.timer || { minutes:0, seconds:0 }, liveActive: dashboard.liveActive };
  stateRef.current=updated; setState(updated);
}

return(
<div className={`hud-container ${effectiveScare ? "scare-active" : ""}`}>
<BattleEffects battleEffects={battleEffects}/>
{effectiveScare && (<div className="scare-popup-banner"><div style={{ fontSize: "14px", fontWeight: 900, color: "#ffff00", textTransform: "uppercase", textShadow: "0 0 10px rgba(255,0,0,1)" }}>😱 ¡SCARE JUMPSCARE! 😱</div><div style={{ fontSize: "9px", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>¡ALARMA DE SUSTO!</div></div>)}
<OverlayHeader />
<LivePhaseTimer />
<ScoreBoard teams={effectiveTeams} players={effectivePlayers} timer={effectiveTimer} donutTeamId={effectiveDonut} hatTeamId={effectiveHat} galaxyTeamId={effectiveGalaxy} moneyGunTeamId={effectiveMoneyGun} frozenTeamId={effectiveFrozenTeamId} frozenDetails={effectiveFrozenDetails} highlightedPlayerId={effectiveHighlightedPlayerId} mode={currentMode} showWin={effectiveShowWin} winner={effectiveWinner} liveActive={effectiveLiveActive} battleEffects={battleEffects}/>
<BattleAnnouncement />
<PowerUpFeed activePowerUps={powerUps}/>
<GiftFeed alert={alert} showWin={effectiveShowWin} winner={effectiveWinner} epicEvent={effectiveEpicEvent} epicGift={effectiveEpicGift}/>
<PlayerStats />
</div>
);
}

export default Overlay;
