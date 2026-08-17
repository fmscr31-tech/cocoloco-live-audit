import { sessionManager } from "./sessionManager";

const STORAGE_KEY = "cocoloco_mvp_leaderboard_v1";
let state = { sessionId: null, players: {} };

function load(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
    if(saved&&typeof saved==="object")state={sessionId:saved.sessionId||null,players:saved.players||{}};
  }catch(e){}
  const session=sessionManager.getSession?.();
  if(session?.id&&state.sessionId&&String(session.id)!==String(state.sessionId))state={sessionId:session.id,players:{}};
  if(session?.id&&!state.sessionId)state.sessionId=session.id;
}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){}}
load();

export function recordRoundMvp(round){
  const mvp=round?.mvp;
  if(!mvp?.id&&!mvp?.playerId)return null;
  const id=String(mvp.id||mvp.playerId);
  const existing=state.players[id]||{playerId:id,name:mvp.name||"Jugador",teamId:mvp.teamId||null,mvpRounds:0,winRounds:0,giftRounds:0};
  existing.name=mvp.name||existing.name;
  existing.teamId=mvp.teamId||existing.teamId||null;
  existing.mvpRounds=Number(existing.mvpRounds||0)+1;
  if(mvp.source==="WIN_LIMPIA")existing.winRounds=Number(existing.winRounds||0)+1;
  if(mvp.source==="GIFT")existing.giftRounds=Number(existing.giftRounds||0)+1;
  state.players[id]=existing;
  save();
  return {...existing};
}

export function getMvpLeaderboard(){
  return Object.values(state.players).sort((a,b)=>Number(b.mvpRounds||0)-Number(a.mvpRounds||0)).map((p,index)=>({...p,rank:index+1}));
}

export function getPlayerMvpRounds(playerId){return Number(state.players[String(playerId)]?.mvpRounds||0);}
export function resetMvpLeaderboard(){state={sessionId:sessionManager.getSession?.()?.id||null,players:{}};save();}
