import { useState, useEffect } from "react";
import { TeamPanel } from "./TeamPanel";
import { GameTimer } from "./GameTimer";
import { IndividualPanel } from "./IndividualPanel";
import { InformationRotationPanel } from "./InformationRotationPanel";
import { CocoDanceZone } from "./CocoDanceZone";
import { eventBus } from "../../core/eventBus";
import { GIFT_ABILITY_MAP } from "../../config/giftAbilityMap";
import { ABILITY_REGISTRY } from "../../config/abilityRegistry";
import { GiftImage } from "../common/GiftImage";

export function ScoreBoard({ teams, players, timer, round, frozenTeamId, roundMvpTitle, frozenDetails, moneyGunTeamId, galaxyTeamId, galaxyPopup, donutTeamId, hatTeamId, highlightedPlayerId, mode = "team", showWin, winner, onTestWin, liveActive, battleEffects }) {
  const [internalShowWin, setInternalShowWin] = useState(false);
  const [activityQueue, setActivityQueue] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  useEffect(()=>{if(activityQueue.length>0&&!currentEvent){const next=activityQueue[0];setCurrentEvent(next);const timerId=setTimeout(()=>{setActivityQueue(prev=>prev.slice(1));setCurrentEvent(null);},4000);return()=>clearTimeout(timerId);}},[activityQueue,currentEvent]);
  const enqueueActivity=eventData=>setActivityQueue(prev=>[...prev,{id:Date.now()+Math.random(),...eventData}]);

  useEffect(()=>{
    const seen=new Map();
    const enqueueGiftOnce=item=>{
      const rawGiftName=item?.sourceGift||item?.giftName||"Gift";
      const donorName=(item?.sender||item?.username||"ESPECTADOR").toUpperCase();
      const key=String(item?.executionId||item?.eventId||item?.giftId||`${donorName}:${rawGiftName}`).toLowerCase();
      const now=Date.now();
      const previous=seen.get(key)||0;
      if(now-previous<1800)return;
      seen.set(key,now);
      for(const [k,t] of seen)if(now-t>5000)seen.delete(k);
      const mapping=GIFT_ABILITY_MAP.find(m=>m.giftId.toLowerCase()===rawGiftName.toLowerCase()||m.giftName.toLowerCase()===rawGiftName.toLowerCase()||(m.aliases&&m.aliases.some(a=>a.toLowerCase()===rawGiftName.toLowerCase())));
      const abilityId=mapping?mapping.abilityId:(item?.abilityId||"");
      const registryEntry=ABILITY_REGISTRY[abilityId]||{display:{name:"Regalo recibido",icon:"🎁"},scoreAction:{type:"ADD_POINTS",value:0}};
      const giftName=(mapping?mapping.giftName:rawGiftName).toUpperCase();
      let effectText=registryEntry.display?.name||"REGALO RECIBIDO";
      if(abilityId==="silent_challenge")effectText="EL MUDO • +1 PUNTO";
      else if(abilityId==="creative_challenge")effectText="RETO CREATIVO";
      else if(abilityId==="ultimate_galaxy")effectText="GALAXY • +1 RONDA";
      else if(abilityId==="epic_impact")effectText="EPIC IMPACT";
      else if(abilityId==="freeze")effectText="FREEZE • CASTIGO";
      else if(abilityId==="clue_hint")effectText="PISTA / CLUE";
      else if(abilityId==="cocazo")effectText="COCAZO";
      enqueueActivity({type:"GIFT",headerIcon:registryEntry.display?.icon||"🎁",headerTitle:giftName,donorName,effectText,abilityName:`⚡ ${registryEntry.display?.name||"REGALO"}`,abilityId});
    };
    const handleWinNotification=data=>{const playerName=(data?.name||data?.username||data?.player?.name||"JUGADOR").toUpperCase();const pointsVal=data?.points||data?.player?.points||1;const teamName=data?.teamName||data?.team||"";enqueueActivity({type:"WIN_LIMPIA",headerIcon:"✨",headerTitle:"WIN LIMPIA",donorName:`🥥 ${playerName}`,effectText:`+${pointsVal} PTS`,abilityName:teamName?`🏆 ${teamName}`:"¡RESPUESTA CORRECTA!"});};
    const handleRoundWinner=data=>{const teamName=data?.winningTeamName||data?.winner?.name||"GANADOR";const isTeam=!!data?.winningTeamName;enqueueActivity({type:"ROUND_WINNER",headerIcon:"🏆",headerTitle:isTeam?"EQUIPO GANADOR":"CAMPEÓN",donorName:teamName,effectText:isTeam?"+1 RONDA":"VICTORIA",abilityName:"¡FELICIDADES!"});};
    const unsubAbility=eventBus.subscribe("ability:started",enqueueGiftOnce);
    const unsubWin=eventBus.subscribe("win:correct",handleWinNotification);
    const unsubRoundWinner=eventBus.subscribe("round:winner_popup",handleRoundWinner);
    return()=>{unsubAbility?.();unsubWin?.();unsubRoundWinner?.();};
  },[]);

  const activeTeams=(!teams||teams.length<2)?[{id:"team1",name:"EQUIPO 1",points:0,wins:0},{id:"team2",name:"EQUIPO 2",points:0,wins:0}]:teams;
  const effectiveShowWin=showWin||internalShowWin;
  const effectiveWinner=winner||{name:mode==="individual"?(players?.[0]?.name||"FERNANDO"):activeTeams[0]?.name,points:mode==="individual"?(players?.[0]?.points||0):activeTeams[0]?.points};
  const winnerTitleName=effectiveWinner.name||effectiveWinner.username||"GANADOR";
  const handleTestWinnerClick=()=>{setInternalShowWin(true);onTestWin?.();setTimeout(()=>setInternalShowWin(false),5000);};
  if(mode==="individual")return <IndividualPanel players={players} timer={timer} round={round} roundMvpTitle={roundMvpTitle} donutTeamId={donutTeamId} hatTeamId={hatTeamId} galaxyTeamId={galaxyTeamId} galaxyPopup={galaxyPopup} moneyGunTeamId={moneyGunTeamId} frozenTeamId={frozenTeamId} frozenDetails={frozenDetails} highlightedPlayerId={highlightedPlayerId} showWin={effectiveShowWin} winner={effectiveWinner} onTestWin={handleTestWinnerClick} battleEffects={battleEffects}/>;
  const matchesTeam=(targetTeamId,actualTeamId,defaultIndex)=>{if(!targetTeamId)return false;if(targetTeamId===actualTeamId)return true;const resolvedId=(targetTeamId==="team1"||targetTeamId==="team_1"||targetTeamId==="1")?activeTeams[0]?.id:(targetTeamId==="team2"||targetTeamId==="team_2"||targetTeamId==="2")?activeTeams[1]?.id:activeTeams[defaultIndex]?.id;return actualTeamId===resolvedId;};
  const isTeamFrozen=(teamId,defaultIndex)=>{if(!frozenTeamId)return false;if(frozenTeamId===teamId)return true;const resolvedId=(frozenTeamId==="team1"||frozenTeamId==="team_1"||frozenTeamId==="1")?activeTeams[0]?.id:(frozenTeamId==="team2"||frozenTeamId==="team_2"||frozenTeamId==="2")?activeTeams[1]?.id:activeTeams[defaultIndex]?.id;return teamId===resolvedId;};
  const getTeamPlayers=teamId=>(players||[]).filter(p=>p.teamId===teamId).sort((a,b)=>(b.points||b.wins||0)-(a.points||a.wins||0)).slice(0,7);
  const getTeamScore=teamId=>{const team=activeTeams.find(t=>t.id===teamId);if(matchesTeam(moneyGunTeamId,teamId,1))return 0;if(team&&team.points!==undefined)return team.points;return(players||[]).filter(p=>p.teamId===teamId).reduce((total,p)=>total+(p.points||p.wins||0),0);};
  const isIceCream=String(currentEvent?.headerTitle||"").toLowerCase().includes("ice cream");
  const giftPalette=isIceCream?{background:"linear-gradient(135deg,rgba(255,192,224,.98),rgba(150,220,255,.98))",border:"1.5px solid #67c7ff",title:"#8e2d76",shadow:"0 0 14px rgba(103,199,255,.55)"}:null;
  return <div className="scoreboard" style={{position:"relative"}}>
    <TeamPanel team={activeTeams[0]} score={getTeamScore(activeTeams[0].id)} players={getTeamPlayers(activeTeams[0].id)} round={round} wrapperClass="team-one" isFrozen={isTeamFrozen(activeTeams[0].id,0)} roundMvpTitle={roundMvpTitle} frozenDetails={frozenDetails} isDamaged={matchesTeam(moneyGunTeamId,activeTeams[0].id,1)} isGalaxyBenefited={matchesTeam(galaxyTeamId,activeTeams[0].id,0)} galaxyPopup={matchesTeam(galaxyTeamId,activeTeams[0].id,0)?galaxyPopup:null} isDonutActive={matchesTeam(donutTeamId,activeTeams[0].id,0)} isCowboyActive={matchesTeam(hatTeamId,activeTeams[0].id,0)}/>
    <div className="center-score" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",minWidth:"104px"}}>
      <GameTimer timer={timer}/>
      {currentEvent?<div className="timer-feed-compact-card" style={{minHeight:"76px",minWidth:"92px",maxWidth:"118px",padding:"5px 5px",borderRadius:"7px",...(giftPalette||{}),...(currentEvent.type==="WIN_LIMPIA"?{background:"linear-gradient(135deg,rgba(20,15,40,.98),rgba(140,70,10,.98))",border:"1.5px solid #ffd700",boxShadow:"0 0 18px rgba(255,215,0,.7)"}:currentEvent.type==="ROUND_WINNER"?{background:"linear-gradient(135deg,rgba(255,238,140,.98),rgba(255,185,0,.96))",border:"1.5px solid #fff",boxShadow:"0 0 22px rgba(255,215,0,.75)"}:{})}}>
        <div className="compact-header" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"1px",marginBottom:"1px"}}><span className="compact-icon" style={{width:"30px",height:"30px",display:"inline-block",filter:"drop-shadow(0 1px 4px rgba(0,0,0,.65))"}}><GiftImage giftId={currentEvent.headerTitle} fallbackIcon={currentEvent.headerIcon||"🎁"} style={{width:"30px",height:"30px"}}/></span><span className="compact-title" style={{fontSize:"7.5px",fontWeight:950,color:giftPalette?.title||"#ffd700",textTransform:"uppercase",letterSpacing:".3px"}}>{currentEvent.headerTitle}</span></div>
        <span className="donor-name" style={{fontSize:"7px",fontWeight:950,color:giftPalette?.title||"#fff",margin:"1px 0"}}>{currentEvent.donorName}</span>
        <span className="effect-badge" style={{fontSize:"6.5px",fontWeight:950,padding:"1px 4px",margin:"1px 0"}}>{currentEvent.effectText}</span>
        <span className="ability-badge" style={{fontSize:"6px",fontWeight:900,marginTop:"1px",color:giftPalette?.title||undefined}}>{currentEvent.abilityName}</span>
      </div>:<InformationRotationPanel players={players}/>}<CocoDanceZone/>
    </div>
    <TeamPanel team={activeTeams[1]} score={getTeamScore(activeTeams[1].id)} players={getTeamPlayers(activeTeams[1].id)} round={round} wrapperClass="team-two" isFrozen={isTeamFrozen(activeTeams[1].id,1)} roundMvpTitle={roundMvpTitle} frozenDetails={frozenDetails} isDamaged={matchesTeam(moneyGunTeamId,activeTeams[1].id,1)} isGalaxyBenefited={matchesTeam(galaxyTeamId,activeTeams[1].id,0)} galaxyPopup={matchesTeam(galaxyTeamId,activeTeams[1].id,0)?galaxyPopup:null} isDonutActive={matchesTeam(donutTeamId,activeTeams[1].id,0)} isCowboyActive={matchesTeam(hatTeamId,activeTeams[1].id,0)}/>
    {effectiveShowWin&&<div className="celebration" style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"linear-gradient(135deg,rgba(255,238,140,.98),rgba(255,185,0,.96),rgba(220,120,0,.98))",border:"2px solid #fff",boxShadow:"0 0 55px rgba(255,215,0,.9)",padding:"12px 18px",borderRadius:"10px",zIndex:9999,maxWidth:"220px",width:"80%",textAlign:"center"}}><div style={{fontSize:"14px",fontWeight:950,color:"#ffd700",textShadow:"0 0 6px rgba(0,0,0,.8)"}}>🏆 ROUND WINNER</div><div style={{color:"#0c091a",fontSize:"14px",fontWeight:950,textTransform:"uppercase",margin:"5px 0"}}>{winnerTitleName}</div><div style={{fontSize:"7px",fontWeight:900,color:"#fff",background:"rgba(12,9,26,.95)",padding:"3px 8px",borderRadius:"4px",display:"inline-block"}}>¡VICTORIA!</div></div>}
  </div>;
}
