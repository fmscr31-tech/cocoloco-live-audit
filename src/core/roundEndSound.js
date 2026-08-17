let lastPlayedAt = 0;

export function playRoundEndBuzzer() {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastPlayedAt < 1200) return;
  lastPlayedAt = now;

  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();

    const start = () => {
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.42, ctx.currentTime + 0.015);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.72);
      master.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(210, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(145, ctx.currentTime + 0.52);
      osc.connect(master);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.58);

      const accent = ctx.createOscillator();
      const accentGain = ctx.createGain();
      accent.type = "triangle";
      accent.frequency.setValueAtTime(330, ctx.currentTime + 0.04);
      accent.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.28);
      accentGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      accentGain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.03);
      accentGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      accent.connect(accentGain);
      accentGain.connect(ctx.destination);
      accent.start(ctx.currentTime + 0.04);
      accent.stop(ctx.currentTime + 0.36);

      setTimeout(() => ctx.close().catch(() => {}), 900);
    };

    if (ctx.state === "suspended") ctx.resume().then(start).catch(() => {});
    else start();
  } catch (error) {
    console.warn("[ROUND END BUZZER] Playback unavailable:", error);
  }
}
