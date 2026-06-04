/**
 * Music — procedural ambient background loop (no audio files).
 *
 * A tiny lookahead scheduler walks a 16-step grid and schedules short
 * oscillator notes onto the SoundEngine's `musicBus`. The pattern is a calm
 * minor-pentatonic arpeggio over a pulsing bass; it gets a touch faster and
 * brighter as the level climbs, then fades out on death.
 *
 * Routing through `sfx.musicBus` (under the master bus) means the global mute
 * silences it for free.
 */

import { sfx } from './SoundEngine';

const ROOT = 220;                 // A3
const SCALE = [0, 3, 5, 7, 10];   // minor pentatonic (semitone offsets)
const STEPS = 16;
const MUSIC_VOL = 0.34;           // musicBus target gain — kept ambient, under the SFX
const LOOKAHEAD = 0.12;          // seconds scheduled ahead
const TICK_MS = 25;              // scheduler poll interval

function freq(semi: number): number {
  return ROOT * Math.pow(2, semi / 12);
}

export class Music {
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private level = 1;
  private playing = false;

  start(): void {
    const ctx = sfx.context;
    const bus = sfx.musicBus;
    if (!ctx || !bus || this.playing) return;

    this.playing = true;
    this.step = 0;
    this.nextNoteTime = ctx.currentTime + 0.1;

    bus.gain.cancelScheduledValues(ctx.currentTime);
    bus.gain.setTargetAtTime(MUSIC_VOL, ctx.currentTime, 0.6);

    this.timer = setInterval(() => this.scheduler(), TICK_MS);
  }

  stop(): void {
    if (!this.playing) return;
    this.playing = false;
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const ctx = sfx.context;
    const bus = sfx.musicBus;
    if (ctx && bus) bus.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
  }

  setLevel(level: number): void {
    this.level = Math.max(1, level);
  }

  private scheduler(): void {
    const ctx = sfx.context;
    if (!ctx || !this.playing) return;

    /* tempo eases up with level (capped) */
    const bpm = 92 + Math.min(this.level, 10) * 4;
    const stepDur = 60 / bpm / 2;   // eighth-note grid

    while (this.nextNoteTime < ctx.currentTime + LOOKAHEAD) {
      this.scheduleStep(this.step, this.nextNoteTime, stepDur);
      this.nextNoteTime += stepDur;
      this.step = (this.step + 1) % STEPS;
    }
  }

  private scheduleStep(step: number, time: number, dur: number): void {
    const lvl = this.level;

    /* bass pulse on each beat */
    if (step % 4 === 0) {
      this.note(freq(SCALE[0] - 12), time, dur * 1.8, 'triangle', 0.5);
    }

    /* rolling arpeggio on the off-eighths */
    if (step % 2 === 0) {
      const idx = (step / 2) % SCALE.length;
      const octave = step >= STEPS / 2 ? 12 : 0;
      this.note(freq(SCALE[idx] + octave), time, dur * 0.9, 'sine', 0.26);
    }

    /* high shimmer accents once the run is heating up */
    if (lvl >= 4 && step % 8 === 5) {
      this.note(freq(SCALE[(step) % SCALE.length] + 24), time, dur * 0.7, 'sine', 0.12);
    }

    /* extra mid voice at high levels for intensity */
    if (lvl >= 7 && step % 4 === 2) {
      this.note(freq(SCALE[2] + 12), time, dur * 0.8, 'triangle', 0.14);
    }
  }

  private note(
    f: number, time: number, dur: number, type: OscillatorType, vol: number
  ): void {
    const ctx = sfx.context;
    const bus = sfx.musicBus;
    if (!ctx || !bus) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, time);
    osc.connect(gain);
    gain.connect(bus);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(vol, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.start(time);
    osc.stop(time + dur + 0.03);
  }
}

export const music = new Music();
