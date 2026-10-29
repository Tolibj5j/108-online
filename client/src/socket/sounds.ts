import { prefsStore } from '../store/preferences.ts';

export type SoundName = 'card' | 'draw' | 'turn' | 'penalty' | 'win' | 'error' | 'join';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.08) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  g.gain.setValueAtTime(0, ac.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.02);
}

function swish(ac: AudioContext, start = 0, dur = 0.12, gain = 0.12) {
  const len = Math.floor(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2400;
  const g = ac.createGain();
  g.gain.value = gain;
  src.buffer = buffer;
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(ac.currentTime + start);
}

/** Small synthesised effects (no audio assets). Respects the sound preference. */
export function playSound(name: SoundName): void {
  if (!prefsStore.get().sound) return;
  const ac = audio();
  if (!ac) return;
  try {
    switch (name) {
      case 'card':
        swish(ac, 0, 0.1, 0.16);
        tone(ac, 220, 0.02, 0.08, 'triangle', 0.05);
        break;
      case 'draw':
        swish(ac, 0, 0.14, 0.1);
        break;
      case 'turn':
        tone(ac, 660, 0, 0.12, 'sine', 0.06);
        tone(ac, 880, 0.1, 0.18, 'sine', 0.06);
        break;
      case 'penalty':
        tone(ac, 300, 0, 0.15, 'sawtooth', 0.04);
        tone(ac, 200, 0.12, 0.2, 'sawtooth', 0.04);
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) => tone(ac, f, i * 0.12, 0.3, 'triangle', 0.07));
        break;
      case 'error':
        tone(ac, 160, 0, 0.15, 'square', 0.03);
        break;
      case 'join':
        tone(ac, 520, 0, 0.1, 'sine', 0.05);
        tone(ac, 780, 0.08, 0.12, 'sine', 0.05);
        break;
    }
  } catch {
    /* audio is best-effort */
  }
}
