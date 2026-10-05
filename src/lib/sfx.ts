import { getPrefsSnapshot } from "@/lib/prefs";

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

export function playTone(freq: number, duration = 0.12, type: OscillatorType = "triangle", gain = 0.04, delay = 0) {
  const ctx = context();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration);
}

/** Filtered noise burst: the building block for gavel knocks and crowd swells. */
export function playNoise(duration: number, freq: number, gain = 0.05, delay = 0, q = 0.8) {
  const ctx = context();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.05, duration / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start(t0);
}

function speakable(text: string) {
  return text
    .replace(/₹\s?([\d.]+)\s?Cr/g, "$1 crore rupees")
    .replace(/₹\s?([\d.]+)\s?L/g, "$1 lakh rupees")
    .replace(/RTM/g, "R T M")
    .replace(/\.\.\./g, ",");
}

export const sfx = {
  /** Pitch rises with the size of the bid. */
  bid: (amount = 0) => playTone(380 + Math.min(8, amount / 10_000_000) * 35, 0.09, "square", 0.03),
  sold: (amount = 0) => {
    // Gavel knock, then a chord; big sales also get a crowd swell.
    playNoise(0.09, 900, 0.09);
    playTone(110, 0.18, "sine", 0.12);
    playTone(220, 0.2, "triangle", 0.05, 0.12);
    playTone(330, 0.25, "triangle", 0.05, 0.2);
    playTone(440, 0.3, "triangle", 0.04, 0.28);
    if (amount >= 50_000_000) playNoise(1.1, 1800, 0.06, 0.2, 0.5);
  },
  unsold: () => {
    playTone(200, 0.35, "sawtooth", 0.03);
    playTone(140, 0.4, "sawtooth", 0.03, 0.18);
  },
  intro: () => {
    playTone(520, 0.14, "sine", 0.035);
    playTone(660, 0.18, "sine", 0.035, 0.12);
  },
  click: () => playTone(680, 0.05, "square", 0.02),
  hammer: () => {
    playNoise(0.07, 700, 0.08);
    playTone(120, 0.12, "triangle", 0.08);
  },
  rtm: () => {
    [440, 554, 659, 880].forEach((f, i) => playTone(f, 0.16, "triangle", 0.045, i * 0.09));
  },
  paddleWar: () => {
    for (let i = 0; i < 6; i++) playTone(500 + (i % 2) * 120, 0.05, "square", 0.025, i * 0.07);
  },
  /** Reads a line aloud when spoken commentary is on. */
  speak: (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!getPrefsSnapshot().voice) return;
    const u = new SpeechSynthesisUtterance(speakable(text));
    u.rate = 1.08;
    u.pitch = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  },
};
