import Phaser from 'phaser';
import { sfx } from './SoundEngine';
import { uiManager } from './UIManager';
import { HALF } from '../config/constants';

const JOYSTICK_MAX = 40;

export class InputManager {
  private scene: Phaser.Scene;
  private leftTouch:  Phaser.Input.Pointer | null = null;
  private rightTouch: Phaser.Input.Pointer | null = null;
  private leftKnob:   HTMLElement | null = null;
  private rightKnob:  HTMLElement | null = null;
  private keyLeft!:   Phaser.Input.Keyboard.Key;
  private keyRight!:  Phaser.Input.Keyboard.Key;
  private keyA!:      Phaser.Input.Keyboard.Key;
  private keyD!:      Phaser.Input.Keyboard.Key;
  private keySpace!:  Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    this.scene     = scene;
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
      } else {
        this.rightTouch = p;
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

  /** -1..+1 for left dot. Left = negative, right = positive. */
  leftDir(): number {
    if (this.keyLeft.isDown  || this.keyA.isDown)     return -1;
    if (this.keyRight.isDown || this.keyD.isDown || this.keySpace.isDown) return 1;
    if (!this.leftTouch) return 0;
    return Math.max(-1, Math.min(1, (this.leftTouch.x - this.leftTouch.downX) / JOYSTICK_MAX));
  }

  /** -1..+1 for right dot. Left = negative, right = positive.
   *  Keyboard uses spread/gather: left key mirrors left dot. */
  rightDir(): number {
    if (this.keyLeft.isDown  || this.keyA.isDown)     return  1;
    if (this.keyRight.isDown || this.keyD.isDown || this.keySpace.isDown) return -1;
    if (!this.rightTouch) return 0;
    return Math.max(-1, Math.min(1, (this.rightTouch.x - this.rightTouch.downX) / JOYSTICK_MAX));
  }

  anyPressed(): boolean {
    return this.leftTouch  !== null ||
           this.rightTouch !== null ||
           this.keyLeft.isDown || this.keyRight.isDown ||
           this.keyA.isDown    || this.keyD.isDown     || this.keySpace.isDown;
  }
}
