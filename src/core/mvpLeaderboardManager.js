import { sessionManager } from "./sessionManager";

const STORAGE_KEY="cocoloco_mvp_leaderboard_v2";
let state={sessionId:null,players:{}};

function getSessionId(){return sessionManager.getSession?.()?.sessionId||null;}
function load(){
  try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if(saved&&typeof saved==="object")state={sessionId:saved.sessionId||null,players:saved.players||{}};}catch(e){}
  const sessionId=getSessionId();
  if(sessionId&&state.sessionId&&String(sessionId)!==String(state.sessionId))state={sessionId,players:{}};
  if(sessionId&&!state.sessionId)state.sessionId=sessionId;
}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){}}
load();

function ensurePlayer(item){
  const id=String(item?.id||item?.playerId||"");
  if(!id)return null;
  const existing=state.players[id]||{playerId:id,name:item.name||"Jugador",teamId:item.teamId||null,mvpRounds:0,winRounds:0,giftRounds:0,contributionPoints:0,_contributionKeys:[]};
  existing.name=item.name||existing.name;
  existing.teamId=item.teamId||existing.teamId||null;
  existing._contributionKeys=Array.isArray(existing._contributionKeys)?existing._contributionKeys:[];
  state.players[id]=existing;
  return existing;
}

/** Immediate attribution API used by the dashboard manual MVP controls. */
export function recordMvpContribution({player,source="WIN_LIMPIA",points=1,roundId=null}={}){
  if(!player)return null;
  const existing=ensurePlayer(player); if(!existing)return null;
  const key=`${roundId||"manual"}:${source}:${existing.playerId}`;
  if(existing._contributionKeys.includes(key))return {...existing};
  existing._contributionKeys.push(key);
  existing.contributionPoints=Number(existing.contributionPoints||0)+Math.max(0,Number(points)||0);
  if(source==="WIN_LIMPIA")existing.winRounds=Number(existing.winRounds||0)+1;
  if(source==="GIFT")existing.giftRounds=Number(existing.giftRounds||0)+1;
  if(roundId){existing.mvpRounds=Number(existing.mvpRounds||0)+1;}
  save();
  return {...existing};
}

export function recordRoundMvp(round){
  const contributions=round?.contributions||{};
  const mvp=round?.mvp;
  const candidates=[];
  if(contributions.winLimpia?.playerId)candidates.push({player:contributions.winLimpia,source:"WIN_LIMPIA",points:Number(contributions.winLimpia.points)||1});
  if(contributions.gift?.playerId)candidates.push({player:contributions.gift,source:"GIFT",points:1});
  if(!candidates.length&&mvp?.id)candidates.push({player:mvp,source:mvp.source||"TOP_SCORE",points:Number(mvp.points)||0});
  if(!candidates.length)return null;
  const sessionId=getSessionId();
  if(sessionId&&state.sessionId&&String(sessionId)!==String(state.sessionId))state={sessionId,players:{}};
  if(sessionId&&!state.sessionId)state.sessionId=sessionId;
  let last=null;
  for(const item of candidates){
    const recorded=recordMvpContribution({player:item.player,source:item.source,points:item.points,roundId:round?.id||null});
    if(recorded)last=recorded;
  }
  save();
  return last;
}

export function getMvpLeaderboard(){return Object.values(state.players).sort((a,b)=>Number(b.contributionPoints||0)-Number(a.contributionPoints||0)||Number(b.mvpRounds||0)-Number(a.mvpRounds||0)).map((p,index)=>({...p,rank:index+1}));}
export function getPlayerMvpRounds(playerId){return Number(state.players[String(playerId)]?.mvpRounds||0);}
export function getPlayerContributionPoints(playerId){return Number(state.players[String(playerId)]?.contributionPoints||0);}
export function resetMvpLeaderboard(){state={sessionId:getSessionId(),players:{}};save();}
