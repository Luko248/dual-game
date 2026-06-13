import Phaser from 'phaser';
import { sfx } from './SoundEngine';
import { uiManager } from './UIManager';
import { HALF } from '../config/constants';

const JOYSTICK_MAX = 40;
/** Advanced mode keyboard travel per 60fps-frame (game units). */
const KEY_MOVE_SPEED = 6;

export class InputManager {
  private scene: Phaser.Scene;
  /** Advanced mode: each thumb / key set drives its own dot independently. */
  private advanced: boolean;
  private leftTouch:  Phaser.Input.Pointer | null = null;
  private rightTouch: Phaser.Input.Pointer | null = null;
  /** Last-sampled finger x (game units) for 1:1 movement tracking. */
  private leftPrevX = 0;
  private rightPrevX = 0;
  private leftKnob:   HTMLElement | null = null;
  private rightKnob:  HTMLElement | null = null;
  private keyLeft!:   Phaser.Input.Keyboard.Key;
  private keyRight!:  Phaser.Input.Keyboard.Key;
  private keyA!:      Phaser.Input.Keyboard.Key;
  private keyD!:      Phaser.Input.Keyboard.Key;
  private keySpace!:  Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, advanced = false) {
    this.scene     = scene;
    this.advanced  = advanced;
    this.leftKnob  = document.getElementById('joystick-left-knob');
    this.rightKnob = document.getElementById('joystick-right-knob');

    /* Phaser allocates only 1 touch pointer by default — add a 2nd so
       both thumbs can drive the joysticks simultaneously. */
    scene.input.addPointer(1);

    const kb       = scene.input.keyboard!;
    this.keyLeft   = kb.addKey('LEFT');
    this.keyRight  = kb.addKey('RIGHT');
    this.keyA      = kb.addKey('A');
    this.keyD      = kb.addKey('D');
    this.keySpace  = kb.addKey('SPACE');

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      sfx.init();
      uiManager.stopIntroDemo();
      if (p.x < HALF) {
        this.leftTouch = p;
        this.leftPrevX = p.x;
      } else {
        this.rightTouch = p;
        this.rightPrevX = p.x;
      }
    });

    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p === this.leftTouch) {
        this._setKnob(this.leftKnob, p.x - p.downX);
      } else if (p === this.rightTouch) {
        this._setKnob(this.rightKnob, p.x - p.downX);
      }
    });

    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p === this.leftTouch) {
        this.leftTouch = null;
        this._resetKnob(this.leftKnob);
      } else if (p === this.rightTouch) {
        this.rightTouch = null;
        this._resetKnob(this.rightKnob);
      }
    });

    scene.input.on('gameout', () => {
      this.leftTouch = this.rightTouch = null;
      this._resetKnob(this.leftKnob);
      this._resetKnob(this.rightKnob);
    });
  }

  private _setKnob(knob: HTMLElement | null, dx: number): void {
    if (!knob) return;
    const c = Math.max(-JOYSTICK_MAX, Math.min(JOYSTICK_MAX, dx));
    knob.style.transform = `translate(calc(-50% + ${c}px), -50%)`;
  }

  private _resetKnob(knob: HTMLElement | null): void {
    if (knob) knob.style.transform = 'translate(-50%, -50%)';
  }

  /** -1..+1 for left dot. Left = negative, right = positive.
   *  Advanced keyboard: A/D steer the left dot on its own.
   *  Normal keyboard: arrows/A/D/Space map to spread/gather (mirrored). */
  leftDir(): number {
    if (this.advanced) {
      if (this.keyA.isDown) return -1;
      if (this.keyD.isDown) return  1;
    } else {
      if (this.keyLeft.isDown  || this.keyA.isDown)     return -1;
      if (this.keyRight.isDown || this.keyD.isDown || this.keySpace.isDown) return 1;
    }
    if (!this.leftTouch) return 0;
    return Math.max(-1, Math.min(1, (this.leftTouch.x - this.leftTouch.downX) / JOYSTICK_MAX));
  }

  /** -1..+1 for right dot. Left = negative, right = positive.
   *  Advanced keyboard: ←/→ steer the right dot on its own.
   *  Normal keyboard: left key mirrors (spread/gather). */
  rightDir(): number {
    if (this.advanced) {
      if (this.keyLeft.isDown)  return -1;
      if (this.keyRight.isDown) return  1;
    } else {
      if (this.keyLeft.isDown  || this.keyA.isDown)     return  1;
      if (this.keyRight.isDown || this.keyD.isDown || this.keySpace.isDown) return -1;
    }
    if (!this.rightTouch) return 0;
    return Math.max(-1, Math.min(1, (this.rightTouch.x - this.rightTouch.downX) / JOYSTICK_MAX));
  }

  /** Advanced mode — how far the LEFT dot should move this frame (game units),
   *  mirroring the finger's actual movement 1:1 (no momentum). Keyboard (A/D)
   *  moves at a fixed speed. `dt` is the 60fps-normalized frame delta. */
  leftMove(dt: number): number {
    if (this.keyA.isDown) return -KEY_MOVE_SPEED * dt;
    if (this.keyD.isDown) return  KEY_MOVE_SPEED * dt;
    if (!this.leftTouch) return 0;
    const dx = this.leftTouch.x - this.leftPrevX;
    this.leftPrevX = this.leftTouch.x;
    return dx;
  }

  /** Advanced mode — LEFT's counterpart for the RIGHT dot (finger or ←/→). */
  rightMove(dt: number): number {
    if (this.keyLeft.isDown)  return -KEY_MOVE_SPEED * dt;
    if (this.keyRight.isDown) return  KEY_MOVE_SPEED * dt;
    if (!this.rightTouch) return 0;
    const dx = this.rightTouch.x - this.rightPrevX;
    this.rightPrevX = this.rightTouch.x;
    return dx;
  }

  /** Combined spread / gather command (−1 = full gather, +1 = full spread).
   *  Uses whichever thumb has the larger spread contribution so a single
   *  thumb — or one that starts a few ms before the other — drives the
   *  full mirrored action without desyncing the dots. */
  spreadDir(): number {
    const l = -this.leftDir();   // left thumb pushed LEFT  → spreading → +
    const r =  this.rightDir();  // right thumb pushed RIGHT → spreading → +
    return Math.abs(l) >= Math.abs(r) ? l : r;
  }

  anyPressed(): boolean {
    return this.leftTouch  !== null ||
           this.rightTouch !== null ||
           this.keyLeft.isDown || this.keyRight.isDown ||
           this.keyA.isDown    || this.keyD.isDown     || this.keySpace.isDown;
  }
}
