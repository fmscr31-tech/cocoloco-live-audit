import { eventBus } from "./eventBus";
import { registrationManager } from "./registrationManager";
import { recordMvpContribution } from "./mvpLeaderboardManager";

const STORAGE_KEY = "cocoloco_round_contributions_v1";
let state = { roundId:null, winLimpia:null, gift:null, contributions:[] };

function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){}}
function playerSnapshot(playerId){
  if(!playerId)return null;
  const p=registrationManager.getRegisteredPlayers().find(x=>String(x.playerId)===String(playerId));
  return p?{playerId:p.playerId,name:p.displayName||p.username,username:p.username,teamId:p.teamId,teamName:p.teamName||null,avatar:p.avatar||""}:null;
}
function normalizePlayer(payload={}){
  const id=payload.playerId||payload.id||payload.tiktokId||payload.username;
  if(!id)return null;
  return{playerId:id,name:payload.name||payload.displayName||payload.username||String(id),username:payload.username||payload.name||String(id),teamId:payload.teamId||null,teamName:payload.teamName||null,avatar:payload.avatar||""};
}
function beginTrackingFromRound(round){
  const roundId=round?.id||round?.roundId||null;
  state={roundId,winLimpia:null,gift:null,contributions:[]};
  persist();
  eventBus.publish("mvp:tracking_started",{roundId,timestamp:Date.now()});
}

export function beginRoundContributionTracking(roundId){
  state={roundId,winLimpia:null,gift:null,contributions:[]};
  persist();
}

export function recordWinLimpia(payload={}){
  const player=normalizePlayer(payload)||playerSnapshot(payload.playerId);
  if(!player)return null;
  state.winLimpia={...player,points:1,timestamp:Date.now()};
  state.contributions.push({type:"WIN_LIMPIA",...player,points:1,timestamp:Date.now()});
  recordMvpContribution({player,source:"WIN_LIMPIA",points:1,roundId:state.roundId});
  persist();
  eventBus.publish("mvp:contribution_pending",{type:"WIN_LIMPIA",player,roundId:state.roundId,contribution:state.winLimpia});
  return state.winLimpia;
}

export function recordGift(payload={}){
  const senderId=payload.playerId||payload.tiktokId||payload.id||payload.username;
  const player=normalizePlayer(payload)||playerSnapshot(senderId);
  if(!player)return null;
  state.gift={...player,giftName:payload.giftName||payload.sourceGift||payload.canonicalGiftId||"Gift",abilityId:payload.abilityId||null,timestamp:Date.now()};
  state.contributions.push({type:"GIFT",...state.gift,timestamp:Date.now()});
  persist();
  eventBus.publish("mvp:gift_contribution",{roundId:state.roundId,contribution:state.gift});
  return state.gift;
}

export function selectWinLimpiaRecipient(playerId){
  const player=playerSnapshot(playerId);
  if(!player)return{success:false,reason:"PLAYER_NOT_FOUND"};
  state.winLimpia={...player,points:1,selectedManually:true,timestamp:Date.now()};
  state.contributions.push({type:"WIN_LIMPIA",...state.winLimpia});
  const recorded=recordMvpContribution({player:state.winLimpia,source:"WIN_LIMPIA",points:1,roundId:state.roundId});
  persist();
  const payload={type:"WIN_LIMPIA",player:state.winLimpia,roundId:state.roundId,contribution:state.winLimpia,leaderboardEntry:recorded||null,timestamp:Date.now()};
  eventBus.publish("mvp:contribution_pending",payload);
  eventBus.publish("mvp:recipient_selected",payload);
  return{success:true,player:state.winLimpia};
}

export function selectGiftRecipient(playerId,giftName="Gift"){
  const player=playerSnapshot(playerId);
  if(!player)return{success:false,reason:"PLAYER_NOT_FOUND"};
  state.gift={...player,giftName,selectedManually:true,timestamp:Date.now()};
  state.contributions.push({type:"GIFT",...state.gift});
  const recorded=recordMvpContribution({player:state.gift,source:"GIFT",points:1,roundId:state.roundId});
  persist();
  const payload={type:"GIFT",player:state.gift,roundId:state.roundId,contribution:state.gift,leaderboardEntry:recorded||null,timestamp:Date.now()};
  eventBus.publish("mvp:gift_contribution",payload);
  eventBus.publish("mvp:recipient_selected",payload);
  return{success:true,player:state.gift};
}

export function getRoundContributions(){return JSON.parse(JSON.stringify(state));}
export function clearRoundContributions(){state={roundId:null,winLimpia:null,gift:null,contributions:[]};persist();}

if(typeof window!=="undefined"){
  try{const saved=localStorage.getItem(STORAGE_KEY);if(saved)state={...state,...JSON.parse(saved)};}catch(e){}
  eventBus.subscribe("round:started",data=>beginTrackingFromRound(data?.round||data));
  eventBus.subscribe("ROUND_STARTED",data=>beginTrackingFromRound(data?.round||data));
  eventBus.subscribe("win:correct",recordWinLimpia);
  eventBus.subscribe("ability:started",recordGift);
}
