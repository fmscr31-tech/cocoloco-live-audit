import { eventBus } from "./eventBus";
import { registrationManager } from "./registrationManager";
import { recordMvpContribution } from "./mvpLeaderboardManager";
import { playerWin } from "./gameEngine";

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
  if(payload?.mvpAlreadyRecorded) return null;
  const player=normalizePlayer(payload)||playerSnapshot(payload.playerId);
  if(!player)return null;
  const contribution={...player,points:1,timestamp:Date.now(),id:payload.winId||`win_${Date.now()}_${Math.random().toString(36).slice(2,8)}`};
  state.winLimpia=contribution;
  state.contributions.push({type:"WIN_LIMPIA",...contribution});
  recordMvpContribution({player,source:"WIN_LIMPIA",points:1,roundId:state.roundId,contributionId:contribution.id});
  persist();
  eventBus.publish("mvp:contribution_pending",{type:"WIN_LIMPIA",player,roundId:state.roundId,contribution:state.winLimpia});
  return state.winLimpia;
}

export function recordGift(payload={}){
  const senderId=payload.playerId||payload.tiktokId||payload.id||payload.username;
  const player=normalizePlayer(payload)||playerSnapshot(senderId);
  if(!player)return null;
  const contribution={...player,giftName:payload.giftName||payload.sourceGift||payload.canonicalGiftId||"Gift",abilityId:payload.abilityId||null,timestamp:Date.now(),id:payload.eventId||payload.giftId||`gift_${Date.now()}_${Math.random().toString(36).slice(2,8)}`};
  state.gift=contribution;
  state.contributions.push({type:"GIFT",...contribution});
  persist();
  eventBus.publish("mvp:gift_contribution",{roundId:state.roundId,contribution:state.gift});
  return state.gift;
}

export function selectWinLimpiaRecipient(playerId){
  const player=playerSnapshot(playerId);
  if(!player)return{success:false,reason:"PLAYER_NOT_FOUND"};

  // A manual WIN is a real game score operation, not merely an MVP label.
  // allowRepeat=true is intentional: the same player can receive multiple
  // manual wins in the same round and every click adds exactly +1 point.
  const scored=playerWin(player.playerId,{allowRepeat:true,source:"MANUAL_WIN_LIMPIA",emitMvpEvent:false});
  if(!scored)return{success:false,reason:"WIN_NOT_APPLIED"};

  const contribution={...player,points:1,selectedManually:true,timestamp:Date.now(),id:`manual_win_${Date.now()}_${Math.random().toString(36).slice(2,8)}`};
  state.winLimpia=contribution;
  state.contributions.push({type:"WIN_LIMPIA",...contribution});
  const recorded=recordMvpContribution({player:scored,source:"WIN_LIMPIA",points:1,roundId:state.roundId,contributionId:contribution.id});
  persist();
  const payload={type:"WIN_LIMPIA",player:{...scored},roundId:state.roundId,contribution,leaderboardEntry:recorded||null,scoreApplied:true,pointsAdded:1,timestamp:Date.now()};
  eventBus.publish("mvp:contribution_pending",payload);
  eventBus.publish("mvp:recipient_selected",payload);
  return{success:true,player:scored,leaderboardEntry:recorded};
}

export function selectGiftRecipient(playerId,giftName="Gift"){
  const player=playerSnapshot(playerId);
  if(!player)return{success:false,reason:"PLAYER_NOT_FOUND"};
  // Gift attribution is MVP/contribution credit only. It does NOT silently add
  // game score points; the gift's configured ability/point rule remains the
  // authoritative scoring path.
  const contribution={...player,giftName,selectedManually:true,timestamp:Date.now(),id:`manual_gift_${Date.now()}_${Math.random().toString(36).slice(2,8)}`};
  state.gift=contribution;
  state.contributions.push({type:"GIFT",...contribution});
  const recorded=recordMvpContribution({player,source:"GIFT",points:1,roundId:state.roundId,contributionId:contribution.id});
  persist();
  const payload={type:"GIFT",player,roundId:state.roundId,contribution,leaderboardEntry:recorded||null,timestamp:Date.now()};
  eventBus.publish("mvp:gift_contribution",payload);
  eventBus.publish("mvp:recipient_selected",payload);
  return{success:true,player,leaderboardEntry:recorded};
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
