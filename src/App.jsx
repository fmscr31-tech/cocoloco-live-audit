import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { getState, loadGame, beginRound, finishActiveRound, startGameTimer, pauseGameTimer, resumeGameTimer, resetGameTimer } from "./core/gameEngine";
import { createBattle, startBattle, finishBattle } from "./core/battlemanager";
import { createTeam, getTeams } from "./core/TeamManager";
import { dashboardAPI } from "./core/dashboardAPI";
import { registrationManager } from "./core/registrationManager";
import OverlayPage from "./pages/OverlayPage";
import OverlayPreview from "./components/overlay/OverlayPreview";
import { BattleControls } from "./components/admin/BattleControls";
import { TeamManagement } from "./components/admin/TeamManagement";
import { PlayerHistoryControls } from "./components/admin/PlayerHistoryControls";
import { HistoricalLeaderboardsControls } from "./components/admin/HistoricalLeaderboardsControls";
import { SimulationControls } from "./components/admin/SimulationControls";
import { ConnectorMonitor } from "./components/admin/ConnectorMonitor";
import { TikTokConnectorControl } from "./components/admin/TikTokConnectorControl";
import { RegistrationControls } from "./components/admin/RegistrationControls";
import { CommandConfigControls } from "./components/admin/CommandConfigControls";
import { EventSimulatorControls } from "./components/admin/EventSimulatorControls";
import { GiftConfigControls } from "./components/admin/GiftConfigControls";
import { GiftPipelineMonitor } from "./components/admin/GiftPipelineMonitor";
import { AbilityManagerControls } from "./components/admin/AbilityManagerControls";
import { ProductionControlPanel } from "./components/admin/ProductionControlPanel";
import { GlobalLiveStatusHeader } from "./components/admin/GlobalLiveStatusHeader";
import { ManualScoreControl } from "./components/admin/ManualScoreControl";
import { MvpAttributionControls } from "./components/admin/MvpAttributionControls";

function Admin(){
  const [battleName,setBattleName] = useState("");
  const [battle,setBattle] = useState(null);
  const [round,setRound] = useState(null);
  const [teamName,setTeamName] = useState("");
  const [teams,setTeams] = useState([]);
  const [activeTab,setActiveTab] = useState("live");
  const [gameMode,setGameMode] = useState(dashboardAPI.getGameMode());
  const [dashboard,setDashboard] = useState(dashboardAPI.getLiveDashboard());

  useEffect(()=>{
    loadGame();
    refresh();
    const unsubMode = dashboardAPI.subscribeToModeChange(({ mode }) => setGameMode(mode));
    const unsubscribe = dashboardAPI.subscribe((dash) => refreshFromDashboard(dash));
    return ()=>{ unsubMode && unsubMode(); unsubscribe && unsubscribe(); };
  },[]);

  function refresh(){ refreshFromDashboard(dashboardAPI.getLiveDashboard()); }
  function refreshFromDashboard(dash){
    setDashboard(dash);
    const state = dash.game || getState();
    setBattle(state.battle || null);
    setRound(state.round || null);
    setTeams(getTeams() || []);
  }
  function createNewBattle(){ if(!battleName.trim()) return; createBattle({name:battleName,duration:20,prize:"Premio"}); setBattleName(""); refresh(); }
  function beginBattle(){ startBattle(); refresh(); }
  function endBattle(){ finishBattle(); refresh(); }
  function addTeam(){ if(!teamName.trim()) return; createTeam({name:teamName}); setTeamName(""); refresh(); }
  function openOverlay(){ window.open("/overlay","_blank","width=480,height=720"); }
  function openPreview(){ window.open("/preview.html","_blank","width=520,height=850"); }

  return (
    <div style={{minHeight:"100vh",background:"#0c091a",color:"white",padding:"20px",fontFamily:"system-ui, -apple-system, sans-serif",boxSizing:"border-box"}}>
      <div style={{maxWidth:"1200px",margin:"0 auto",background:"#1b1429",padding:"20px",borderRadius:"14px",boxShadow:"0 10px 30px rgba(0,0,0,.5)",border:"1px solid rgba(255,255,255,.1)"}}>
        <GlobalLiveStatusHeader />
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",borderBottom:"1px solid rgba(255,255,255,.1)",paddingBottom:"12px"}}>
          <h1 style={{fontSize:"22px",margin:0,color:"#00f5ff"}}>Coco🥥Loco <span style={{fontSize:"14px",color:"#a0aec0",fontWeight:400}}>Live Manager Dashboard</span></h1>
          <div style={{display:"flex",gap:"10px"}}><button onClick={openPreview} style={{background:"linear-gradient(135deg,#ffd700,#ff8c00)",color:"#000",border:"none",padding:"8px 16px",borderRadius:"8px",fontWeight:800,cursor:"pointer",fontSize:"13px"}}>🎨 Abrir Preview Visual</button><button onClick={openOverlay} style={{background:"linear-gradient(135deg,#00f5ff,#0099ff)",color:"#000",border:"none",padding:"8px 16px",borderRadius:"8px",fontWeight:800,cursor:"pointer",fontSize:"13px"}}>🎥 Abrir Overlay</button></div>
        </div>

        <div style={{display:"flex",gap:"6px",marginBottom:"20px",borderBottom:"1px solid rgba(255,255,255,.1)",paddingBottom:"12px",flexWrap:"wrap"}}>{[{id:"live",label:"🔴 Live Control"},{id:"game_control",label:"🎮 Game Control"},{id:"gifts",label:"🎁 Gift Configuration"},{id:"abilities",label:"⚡ Ability Manager"},{id:"debug",label:"🧪 Test / Debug"},{id:"history",label:"📊 History"}].map(tab=><button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{background:activeTab===tab.id?"linear-gradient(135deg,#00f5ff,#0099ff)":"rgba(255,255,255,.06)",color:activeTab===tab.id?"#000":"#fff",border:"none",padding:"6px 10px",borderRadius:"8px",fontSize:"11px",fontWeight:800,cursor:"pointer"}}>{tab.label}</button>)}</div>

        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          {activeTab==="live" && <ProductionControlPanel />}
          {activeTab==="game_control" && (()=>{
            const timer = dashboard.game?.timer || {minutes:20,seconds:0};
            const timerDisplay = `${String(timer.minutes??20).padStart(2,'0')}:${String(timer.seconds??0).padStart(2,'0')}`;
            const roundStatus = round?.status || battle?.status || "ESPERANDO";
            const handleQuickStartRound = ()=>{
              try{
                registrationManager.lockRegistration();
                const duration = Number(timer.minutes) || 20;
                beginRound({name:"Ronda Principal",duration,entryGift:"Regalo",prize:"Premio"});
                startGameTimer(duration);
              }catch(e){console.error(e);}
            };
            return <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
              <div style={{background:"linear-gradient(135deg,#1b1429,#120d22)",border:"2px solid rgba(0,245,255,.5)",borderRadius:"16px",padding:"24px",boxShadow:"0 10px 40px rgba(0,0,0,.7)",color:"white",display:"flex",flexDirection:"column",gap:"20px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"16px",borderBottom:"1px solid rgba(255,255,255,.1)",paddingBottom:"16px"}}>
                  <div><h2 style={{margin:0,fontSize:"20px",color:"#00f5ff",textTransform:"uppercase",letterSpacing:"1.5px",fontWeight:900}}>🎮 ROUND CONTROL & TIMER</h2><div style={{fontSize:"12px",color:"#a0aec0",marginTop:"4px"}}>Centro operativo principal para conducción de partidas y control temporal en tiempo real</div></div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",background:"#120f1d",padding:"10px 16px",borderRadius:"10px",border:"1px solid rgba(255,255,255,.15)"}}><span style={{fontSize:"12px",color:"#ffd700",fontWeight:800}}>🎯 Game Mode:</span><select value={gameMode} onChange={e=>{const newMode=e.target.value;dashboardAPI.setGameMode(newMode);setGameMode(newMode);}} style={{background:"#0c091a",color:"white",border:"1px solid rgba(255,255,255,.3)",borderRadius:"6px",padding:"6px 12px",fontSize:"13px",fontWeight:900}}><option value="INDIVIDUAL">INDIVIDUAL</option><option value="TEAM">TEAM (EQUIPOS)</option><option value="GENDER_TEAMS">CHICOS VS CHICAS</option></select></div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"20px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"24px",background:"#0c091a",padding:"16px 24px",borderRadius:"12px",border:"2px solid rgba(0,245,255,.3)"}}><div><div style={{fontSize:"10px",color:"#a0aec0",textTransform:"uppercase",fontWeight:800}}>Estado</div><div style={{fontSize:"15px",fontWeight:900,color:"#ffd700",textTransform:"uppercase",marginTop:"2px"}}>{roundStatus}</div></div><div style={{borderLeft:"1px solid rgba(255,255,255,.15)",paddingLeft:"24px"}}><div style={{fontSize:"10px",color:"#a0aec0",textTransform:"uppercase",fontWeight:800}}>⏱️ Timer Operativo</div><div style={{fontSize:"44px",fontWeight:900,color:"#00f5ff",fontFamily:"monospace",textShadow:"0 0 20px rgba(0,245,255,.8)",letterSpacing:"2px",lineHeight:1}}>{timerDisplay}</div></div></div>
                  <div style={{display:"flex",flexDirection:"column",gap:"10px",alignItems:"flex-end",flex:1,minWidth:"280px"}}><button onClick={handleQuickStartRound} style={{background:"linear-gradient(135deg,#48bb78,#38a169)",color:"white",border:"none",padding:"8px 16px",borderRadius:"8px",fontWeight:800,cursor:"pointer",fontSize:"12px"}}>🟢 START ROUND</button><div style={{display:"flex",gap:"8px",flexWrap:"wrap",justifyContent:"flex-end",width:"100%"}}><button onClick={()=>startGameTimer(20)} style={{background:"#3182ce",color:"white",border:"none",padding:"8px 12px",borderRadius:"6px",fontWeight:700,cursor:"pointer",fontSize:"11px"}}>▶ Iniciar Timer</button><button onClick={resumeGameTimer} style={{background:"#48bb78",color:"white",border:"none",padding:"8px 12px",borderRadius:"6px",fontWeight:700,cursor:"pointer",fontSize:"11px"}}>▶ Reanudar</button><button onClick={pauseGameTimer} style={{background:"#ed8936",color:"white",border:"none",padding:"8px 12px",borderRadius:"6px",fontWeight:700,cursor:"pointer",fontSize:"11px"}}>⏸ Pausar</button><button onClick={()=>resetGameTimer(20)} style={{background:"#e53e3e",color:"white",border:"none",padding:"8px 12px",borderRadius:"6px",fontWeight:700,cursor:"pointer",fontSize:"11px"}}>🔄 Reset</button><button onClick={()=>finishActiveRound()} style={{background:"linear-gradient(135deg,#e53e3e,#c53030)",color:"white",border:"none",padding:"8px 12px",borderRadius:"6px",fontWeight:800,cursor:"pointer",fontSize:"11px"}}>🏁 Finalizar Ronda</button></div></div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"16px"}}><RegistrationControls/><ManualScoreControl/><MvpAttributionControls/></div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))",gap:"16px"}}><CommandConfigControls/><div style={{display:"flex",flexDirection:"column",gap:"16px"}}><TeamManagement teamName={teamName} setTeamName={setTeamName} addTeam={addTeam} teams={teams}/><BattleControls battleName={battleName} setBattleName={setBattleName} createNewBattle={createNewBattle} battle={battle} beginBattle={beginBattle} endBattle={endBattle}/></div></div>
            </div>;
          })()}
          {activeTab==="gifts" && <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))",gap:"16px"}}><GiftConfigControls/></div>}
          {activeTab==="abilities" && <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))",gap:"16px"}}><AbilityManagerControls/></div>}
          {activeTab==="debug" && <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))",gap:"16px"}}><div style={{display:"flex",flexDirection:"column",gap:"16px"}}><TikTokConnectorControl/><EventSimulatorControls/><SimulationControls/></div><div style={{display:"flex",flexDirection:"column",gap:"16px"}}><ConnectorMonitor/><GiftPipelineMonitor/></div></div>}
          {activeTab==="history" && <div style={{display:"flex",flexDirection:"column",gap:"16px"}}><HistoricalLeaderboardsControls/><PlayerHistoryControls/></div>}
        </div>
      </div>
    </div>
  );
}

function App(){return <Routes><Route path="/" element={<Admin/>}/><Route path="/overlay" element={<OverlayPage/>}/><Route path="/cocoloco-live" element={<OverlayPage/>}/><Route path="/preview" element={<OverlayPreview/>}/></Routes>;}
export default App;
