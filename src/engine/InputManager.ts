import Phaser from 'phaser';
import { sfx } from './SoundEngine';

/**
 * Simplified one-gesture input.
 * Dots auto-spread by default; any input (spacebar / tap / hold) = gather.
 * Returns: -1 (spread, no input) or +1 (gather, input active).
 */
export class InputManager {
  private scene: Phaser.Scene;
  private pointerDown = false;
  private keySpace: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    /* keyboard — only spacebar needed */
    this.keySpace = scene.input.keyboard!.addKey('SPACE');

    /* touch / click */
    scene.input.on('pointerdown', () => {
      sfx.init();
      this.pointerDown = true;
    });
    scene.input.on('pointerup', () => {
      this.pointerDown = false;
    });
  }

  /** -1 = spread (default), +1 = gather (input active) */
  direction(): number {
    if (this.keySpace.isDown || this.pointerDown) return 1;
    return -1;
  }

  /** Any button pressed — for restart prompts */
  anyPressed(): boolean {
    return this.scene.input.activePointer.isDown || this.keySpace.isDown;
  }
}
