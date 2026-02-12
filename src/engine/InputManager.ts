import Phaser from 'phaser';
import { HALF } from '../config/constants';
import { sfx } from './SoundEngine';

/**
 * Unified keyboard + multi-touch input.
 * Returns a single direction: -1 (spread), 0 (idle), +1 (gather).
 */
export class InputManager {
  private scene: Phaser.Scene;
  private touches: Record<number, 'L' | 'R'> = {};
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyD: Phaser.Input.Keyboard.Key;
  private keySpace: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    /* keyboard */
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keyA = scene.input.keyboard!.addKey('A');
    this.keyD = scene.input.keyboard!.addKey('D');
    this.keySpace = scene.input.keyboard!.addKey('SPACE');

    /* multi-touch */
    scene.input.addPointer(1);

    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      sfx.init();
      this.touches[p.id] = p.x < HALF ? 'L' : 'R';
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.touches[p.id] = p.x < HALF ? 'L' : 'R';
    });
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      delete this.touches[p.id];
    });
  }

  /** -1 = left/spread, 0 = idle, +1 = right/gather */
  direction(): number {
    let L = this.cursors.left.isDown || this.keyA.isDown;
    let R = this.cursors.right.isDown || this.keyD.isDown;

    for (const id in this.touches) {
      if (this.touches[id] === 'L') L = true;
      if (this.touches[id] === 'R') R = true;
    }

    if (L && R) return 0;
    if (L) return -1;
    if (R) return 1;
    return 0;
  }

  /** Any button pressed — for restart prompts */
  anyPressed(): boolean {
    return (
      this.scene.input.activePointer.isDown ||
      this.direction() !== 0 ||
      this.keySpace.isDown
    );
  }
}
