/**
 * Tiny Web Audio synth — no assets needed.
 *
 * Everything routes through a master gain bus so a single mute toggle silences
 * both SFX and the procedural background music. A separate `musicBus` sits
 * under the master so the Music engine can fade itself independently.
 */

interface SoundRecipe {
  type: OscillatorType;
  freqStart: number;
  freqEnd: number;
  freqTime: number;
  vol: number;
  dur: number;
}

type SoundName = 'pass' | 'near' | 'die' | 'start' | 'combo' | 'bullet' | 'bulletEnd';

const MUTE_KEY = 'dual_muted';

const SOUNDS: Record<SoundName, SoundRecipe> = {
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
  },
  /* bullet time engaging — a slow downward glide ("time stretching") */
  bullet: {
    type: 'sine', freqStart: 760, freqEnd: 180,
    freqTime: 0.5, vol: 0.09, dur: 0.5
  },
  /* bullet time releasing — a short upward whoosh back to speed */
  bulletEnd: {
    type: 'sine', freqStart: 300, freqEnd: 820,
    freqTime: 0.22, vol: 0.08, dur: 0.28
  }
};

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private muted = false;

  constructor() {
    try { this.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* ignore */ }
  }

  init(): void {
    if (this.ctx) {
      /* iOS Safari may have suspended the context (page hidden, etc.).
         Always try to resume on a user-gesture-driven init call. */
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const Ctor: typeof AudioContext =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();

      /* master bus — the single point the mute toggle controls */
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);

      /* music sub-bus — starts silent, the Music engine fades it in */
      this.music = this.ctx.createGain();
      this.music.gain.value = 0;
      this.music.connect(this.master);

      /* iOS audio unlock — without this, the context's currentTime stays
         at 0 for a moment after creation, and any oscillator scheduled at
         currentTime is silently dropped because by the time audio actually
         starts running the events are "in the past". Playing a 1-sample
         silent buffer forces Safari to advance the clock immediately. */
      const silent = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = silent;
      src.connect(this.ctx.destination);
      src.start(0);
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (_) { /* stay silent */ }
  }

  /* ---- shared accessors for the Music engine ---- */
  get context(): AudioContext | null { return this.ctx; }
  get musicBus(): GainNode | null { return this.music; }

  /* ---- mute ---- */
  isMuted(): boolean { return this.muted; }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* ignore */ }
    if (this.master && this.ctx) {
      /* short ramp avoids a click */
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.02);
    }
  }

  /** Toggle and return the new muted state. */
  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Play a one-shot. `pitch` scales the whole sweep (used for combo escalation).
   */
  play(name: SoundName, pitch = 1): void {
    if (!this.ctx || !this.master) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const recipe = SOUNDS[name];
    if (!recipe) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.master);

    osc.type = recipe.type;
    osc.frequency.setValueAtTime(recipe.freqStart * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(recipe.freqEnd * pitch, t + recipe.freqTime);
    gain.gain.setValueAtTime(recipe.vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + recipe.dur);
    osc.start(t);
    osc.stop(t + recipe.dur + 0.01);
  }

  /**
   * Play a quick arpeggio/sequence of frequencies — used for level-up fanfares
   * and the ghost pickup shimmer.
   */
  playSeq(freqs: number[], type: OscillatorType, noteDur: number, gap: number, vol: number): void {
    if (!this.ctx || !this.master) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    let t = this.ctx.currentTime;
    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, t);
      osc.connect(gain);
      gain.connect(this.master);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + noteDur);
      osc.start(t);
      osc.stop(t + noteDur + 0.02);
      t += gap;
    }
  }

  /* ---- named flourishes ---- */
  playLevelUp(): void {
    this.playSeq([523, 659, 784, 1046], 'triangle', 0.2, 0.075, 0.085);
  }

  playGhost(): void {
    this.playSeq([1046, 1318, 1568], 'sine', 0.16, 0.05, 0.06);
  }
}

/** Singleton */
export const sfx = new SoundEngine();
