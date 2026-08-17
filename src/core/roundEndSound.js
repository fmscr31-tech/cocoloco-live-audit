let lastPlayedAt=0;

export function playRoundEndBuzzer(){
  if(typeof window==="undefined")return;
  const now=Date.now();
  if(now-lastPlayedAt<1200)return;
  lastPlayedAt=now;
  try{
    const AudioContextCtor=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextCtor)return;
    const ctx=new AudioContextCtor();
    const start=()=>{
      const master=ctx.createGain();
      master.gain.setValueAtTime(0.0001,ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.28,ctx.currentTime+0.012);
      master.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.58);
      master.connect(ctx.destination);

      const buzzer=ctx.createOscillator();
      buzzer.type="square";
      buzzer.frequency.setValueAtTime(260,ctx.currentTime);
      buzzer.frequency.exponentialRampToValueAtTime(145,ctx.currentTime+0.48);
      buzzer.connect(master);
      buzzer.start(ctx.currentTime);
      buzzer.stop(ctx.currentTime+0.52);

      const ding=ctx.createOscillator();
      const dingGain=ctx.createGain();
      ding.type="triangle";
      ding.frequency.setValueAtTime(520,ctx.currentTime+0.03);
      ding.frequency.exponentialRampToValueAtTime(300,ctx.currentTime+0.25);
      dingGain.gain.setValueAtTime(0.0001,ctx.currentTime);
      dingGain.gain.exponentialRampToValueAtTime(0.12,ctx.currentTime+0.025);
      dingGain.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.32);
      ding.connect(dingGain); dingGain.connect(ctx.destination);
      ding.start(ctx.currentTime+0.03); ding.stop(ctx.currentTime+0.34);

      setTimeout(()=>ctx.close().catch(()=>{}),800);
    };
    if(ctx.state==="suspended")ctx.resume().then(start).catch(()=>{});else start();
  }catch(error){console.warn("[ROUND END BUZZER] Playback unavailable:",error);}
}
