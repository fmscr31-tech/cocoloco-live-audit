import { eventBus } from "./eventBus";
import { resetRoundTeamScores, getTeams, addWinToTeam } from "./TeamManager";
import { sessionManager } from "./sessionManager";
import { getPlayers } from "./playerManager";
import { registrationManager } from "./registrationManager";
import { commandConfigManager } from "./commandConfigManager";
import { isGenderTeamsMode } from "./genderTeamsMode";
import { playRoundEndBuzzer } from "./roundEndSound";
import { beginRoundContributionTracking, getRoundContributions, clearRoundContributions } from "./roundContributionManager";
import { recordRoundMvp } from "./mvpLeaderboardManager";

const ROUND_STORAGE_KEY="cocoloco_active_round_v2";
let currentRound=null;
let lastFinishedRoundId=null;
function persistRound(){try{if(currentRound)localStorage.setItem(ROUND_STORAGE_KEY,JSON.stringify(currentRound));else localStorage.removeItem(ROUND_STORAGE_KEY);}catch(e){}}
function restoreRound(){try{const raw=localStorage.getItem(ROUND_STORAGE_KEY);if(!raw)return;const saved=JSON.parse(raw);if(saved&&saved.status==="active")currentRound=saved;}catch(e){}}
restoreRound();

export function startRound(data={}){
  currentRound={id:data.id||Date.now(),name:data.name||"Ronda Principal",duration:data.duration||20,entryGift:data.entryGift,prize:data.prize,gameMode:data.gameMode||commandConfigManager.getConfig().gameRegistrationMode||"TEAM",status:"active",active:true,startTime:new Date()};
  lastFinishedRoundId=null;persistRound();beginRoundContributionTracking(currentRound.id);eventBus.publish("round:started",{round:{...currentRound},timestamp:Date.now()});return currentRound;
}

export function endRound(){
  if(!currentRound||currentRound.status==="finished")return currentRound;
  if(lastFinishedRoundId===currentRound.id)return currentRound;
  lastFinishedRoundId=currentRound.id;currentRound.status="finished";currentRound.active=false;currentRound.endTime=new Date();
  const currentPlayers=getPlayers?getPlayers():[];
  const sorted=[...currentPlayers].sort((a,b)=>(b.points||0)-(a.points||0));
  const topPlayer=sorted[0]||null;
  const totalPts=currentPlayers.reduce((sum,p)=>sum+(p.points||0),0);
  const config=commandConfigManager.getConfig();
  const genderMode=isGenderTeamsMode(config.gameRegistrationMode);
  const contributions=getRoundContributions();
  const contributionMvp=contributions.winLimpia||contributions.gift||null;

  currentRound.participants=currentPlayers.map(player=>({...player}));
  currentRound.winner=topPlayer?{id:topPlayer.id,name:topPlayer.name,points:topPlayer.points}:null;
  currentRound.mvp=contributionMvp?{id:contributionMvp.playerId,name:contributionMvp.name,teamId:contributionMvp.teamId||null,source:contributions.winLimpia?"WIN_LIMPIA":"GIFT",giftName:contributions.gift?.giftName||null,points:1}:topPlayer?{id:topPlayer.id,name:topPlayer.name,points:topPlayer.points,source:"TOP_SCORE"}:null;
  currentRound.contributions=contributions;
  currentRound.mvpContributions={winLimpia:contributions.winLimpia||null,gift:contributions.gift||null};
  currentRound.totalPoints=totalPts;
  currentRound.totalGifts=currentPlayers.reduce((sum,p)=>sum+(p.gifts||0),0);

  const teamsBeforeReset=getTeams();
  const rankedTeams=[...teamsBeforeReset].sort((a,b)=>(Number(b.points)||0)-(Number(a.points)||0));
  const winningTeam=rankedTeams[0]||null;
  const runnerUpTeam=rankedTeams[1]||null;
  const winningScore=Number(winningTeam?.points)||0;
  const runnerUpScore=Number(runnerUpTeam?.points)||0;

  if(winningTeam&&winningScore>runnerUpScore){
    const awardedTeam=addWinToTeam(winningTeam.id);
    currentRound.winningTeamId=winningTeam.id;currentRound.winningTeamName=winningTeam.name;currentRound.winningTeamScore=winningScore;currentRound.roundAwarded=true;
    currentRound.roundAward={teamId:winningTeam.id,teamName:winningTeam.name,score:winningScore,wins:awardedTeam?.wins||0};
    eventBus.publish("round:awarded",{roundId:currentRound.id,teamId:winningTeam.id,teamName:winningTeam.name,score:winningScore,wins:awardedTeam?.wins||0,timestamp:Date.now()});
  }else{currentRound.roundAwarded=false;currentRound.roundAward=null;}

  if(currentRound.mvp)recordRoundMvp(currentRound);
  playRoundEndBuzzer();
  sessionManager.archiveRound(currentRound);
  resetRoundTeamScores(genderMode);
  registrationManager.prepareNextRoundRegistration();
  eventBus.publish("round:finished",{roundId:currentRound.id,roundName:currentRound.name,winningTeamId:currentRound.winningTeamId||null,winningTeamName:currentRound.winningTeamName||null,roundAwarded:currentRound.roundAwarded===true,mvp:currentRound.mvp||null,mvpContributions:currentRound.mvpContributions,timestamp:Date.now()});
  persistRound();clearRoundContributions();return currentRound;
}

export function getCurrentRound(){return currentRound;}
