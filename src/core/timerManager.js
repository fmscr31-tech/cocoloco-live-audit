import { eventBus } from "./eventBus";
const TIMER_STORAGE_KEY="cocoloco_active_timer_v2";
let completionTimeout=null;
let timer={remainingSeconds:0,interval:null,running:false,initialMinutes:0,endAt:null,phase:"IDLE"};
function persistTimer(){try{localStorage.setItem(TIMER_STORAGE_KEY,JSON.stringify({remainingSeconds:timer.remainingSeconds,running:timer.running,initialMinutes:timer.initialMinutes,endAt:timer.endAt,phase:timer.phase}));}catch(e){}}
function clearPersistedTimer(){try{localStorage.removeItem(TIMER_STORAGE_KEY);}catch(e){}}
function emitTick(eventName="timer:tick",extra={}){eventBus.emit(eventName,{timer:getTimer(),time:getTime(),timestamp:Date.now(),...extra});}
function clearCompletionTimeout(){if(completionTimeout){clearTimeout(completionTimeout);completionTimeout=null;}}
function scheduleCompletion(){clearCompletionTimeout();if(timer.running&&timer.endAt){const delay=Math.max(0,timer.endAt-Date.now());completionTimeout=setTimeout(()=>{if(timer.running&&timer.endAt&&Date.now()>=timer.endAt)finishTimer();},delay);}}
function finishTimer(){if(timer.interval){clearInterval(timer.interval);timer.interval=null;}clearCompletionTimeout();const completedPhase=timer.phase;timer.remainingSeconds=0;timer.running=false;timer.endAt=null;persistTimer();emitTick("timer:tick",{completed:true,completedPhase});const payload={timestamp:Date.now(),phase:completedPhase,timer:getTimer()};eventBus.publish("TIMER_COMPLETED",payload);eventBus.publish("ROUND_TIME_EXPIRED",payload);eventBus.emit("timer:completed",payload);}
function startInterval(){if(timer.interval)clearInterval(timer.interval);timer.interval=setInterval(()=>{if(!timer.running)return;if(timer.endAt){const msLeft=timer.endAt-Date.now();timer.remainingSeconds=Math.max(0,Math.ceil(msLeft/1000));if(msLeft<=0){finishTimer();return;}}else{timer.remainingSeconds=Math.max(0,timer.remainingSeconds-1);if(timer.remainingSeconds<=0){finishTimer();return;}}persistTimer();emitTick();},250);}
function restoreTimer(){if(typeof window==="undefined")return;try{const raw=localStorage.getItem(TIMER_STORAGE_KEY);if(!raw)return;const saved=JSON.parse(raw);timer.initialMinutes=Number(saved.initialMinutes)||0;timer.endAt=Number(saved.endAt)||null;timer.phase=saved.phase||"ROUND";timer.running=saved.running===true;timer.remainingSeconds=Number(saved.remainingSeconds)||0;if(timer.running&&timer.endAt){timer.remainingSeconds=Math.max(0,Math.ceil((timer.endAt-Date.now())/1000));if(timer.remainingSeconds>0){startInterval();scheduleCompletion();}else finishTimer();}}catch(e){console.warn("[TIMER] Failed to restore persisted timer:",e);}}
if(typeof window!=="undefined"){
 const sync=({timer:t})=>{if(!t)return;timer.running=!!t.running;if(t.remainingSeconds!==undefined)timer.remainingSeconds=Number(t.remainingSeconds)||0;if(t.phase)timer.phase=t.phase;};
 ["timer:started","timer:tick","timer:paused","timer:resumed","timer:stopped","timer:reset"].forEach(n=>eventBus.subscribe(n,sync));
 restoreTimer();
}
export function startTimer(minutes=0,phase="ROUND"){if(timer.interval)clearInterval(timer.interval);clearCompletionTimeout();timer.initialMinutes=Math.max(0,Number(minutes)||0);timer.remainingSeconds=Math.max(0,Math.floor(timer.initialMinutes*60));timer.running=timer.remainingSeconds>0;timer.endAt=timer.running?Date.now()+timer.remainingSeconds*1000:null;timer.phase=phase||"ROUND";persistTimer();emitTick("timer:started");if(timer.running){startInterval();scheduleCompletion();}return getTimer();}
export function pauseTimer(){if(timer.interval){clearInterval(timer.interval);timer.interval=null;}clearCompletionTimeout();if(timer.endAt)timer.remainingSeconds=Math.max(0,Math.ceil((timer.endAt-Date.now())/1000));timer.endAt=null;timer.running=false;persistTimer();emitTick("timer:paused");}
export function resumeTimer(){if(timer.running)return getTimer();if(timer.remainingSeconds<=0)return startTimer(timer.initialMinutes,timer.phase);timer.running=true;timer.endAt=Date.now()+timer.remainingSeconds*1000;persistTimer();emitTick("timer:resumed");startInterval();scheduleCompletion();return getTimer();}
export function stopTimer(){if(timer.interval){clearInterval(timer.interval);timer.interval=null;}clearCompletionTimeout();timer.running=false;timer.endAt=null;persistTimer();emitTick("timer:stopped");}
export function resetTimer(minutes,phase=timer.phase){if(timer.interval)clearInterval(timer.interval);timer.interval=null;clearCompletionTimeout();timer.initialMinutes=minutes!==undefined?Math.max(0,Number(minutes)||0):timer.initialMinutes;timer.remainingSeconds=Math.floor(timer.initialMinutes*60);timer.running=false;timer.endAt=null;timer.phase=phase||"ROUND";persistTimer();emitTick("timer:reset");}
export function clearTimerPersistence(){clearPersistedTimer();clearCompletionTimeout();}
export function isTimerRunning(){return timer.running;}
export function getTime(){return{minutes:Math.floor(timer.remainingSeconds/60),seconds:timer.remainingSeconds%60};}
export function getTimer(){return{remainingSeconds:timer.remainingSeconds,running:timer.running,minutes:Math.floor(timer.remainingSeconds/60),seconds:timer.remainingSeconds%60,phase:timer.phase};}
