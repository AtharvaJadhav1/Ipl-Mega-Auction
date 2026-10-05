let audio: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audio = new Ctor();
  }
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

export function playTone(freq: number, duration = 0.12, type: OscillatorType = "triangle", gain = 0.04) {
  const ctx = context();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.stop(ctx.currentTime + duration);
}

export const sfx = {
  bid: () => playTone(420, 0.08, "square", 0.03),
  sold: () => {
    playTone(220, 0.2, "triangle", 0.05);
    setTimeout(() => playTone(330, 0.25, "triangle", 0.05), 90);
  },
  unsold: () => playTone(140, 0.3, "sawtooth", 0.03),
  intro: () => playTone(520, 0.18, "sine", 0.035),
  click: () => playTone(680, 0.05, "square", 0.02),
  hammer: () => playTone(180, 0.12, "triangle", 0.05),
};
