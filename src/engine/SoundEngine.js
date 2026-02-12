/**
 * Tiny Web Audio synth — no assets needed.
 * Each sound is a single oscillator with envelope shaping.
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) { /* stay silent */ }
  }

  play(name) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const recipe = SoundEngine.SOUNDS[name];
    if (!recipe) return;

    osc.type = recipe.type;
    osc.frequency.setValueAtTime(recipe.freqStart, t);
    osc.frequency.exponentialRampToValueAtTime(recipe.freqEnd, t + recipe.freqTime);
    gain.gain.setValueAtTime(recipe.vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + recipe.dur);
    osc.start(t);
    osc.stop(t + recipe.dur + 0.01);
  }
}

SoundEngine.SOUNDS = {
  pass: {
    type: 'sine', freqStart: 660, freqEnd: 980,
    freqTime: 0.07, vol: 0.07, dur: 0.1
  },
  near: {
    type: 'triangle', freqStart: 1300, freqEnd: 1700,
    freqTime: 0.04, vol: 0.05, dur: 0.07
  },
  die: {
    type: 'sawtooth', freqStart: 260, freqEnd: 35,
    freqTime: 0.55, vol: 0.14, dur: 0.55
  },
  start: {
    type: 'sine', freqStart: 440, freqEnd: 880,
    freqTime: 0.12, vol: 0.09, dur: 0.18
  },
  combo: {
    type: 'sine', freqStart: 880, freqEnd: 1320,
    freqTime: 0.06, vol: 0.06, dur: 0.12
  }
};

/** Singleton */
export const sfx = new SoundEngine();
