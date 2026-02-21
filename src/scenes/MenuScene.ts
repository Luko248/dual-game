import Phaser from 'phaser';
import { W, DOT_R, C_BG, C_LEFT, C_RIGHT, HI_SCORE_KEY, HI_LEVEL_KEY } from '../config/constants';
import { sfx } from '../engine/SoundEngine';
import { uiManager } from '../engine/UIManager';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C_BG);
    const cx = W / 2;
    const gfx = this.add.graphics();

    /* ---- demo dots (canvas graphics, no text) ---- */
    const dotRow = 260;
    gfx.fillStyle(C_LEFT,  0.25); gfx.fillCircle(cx - 55, dotRow, 18);
    gfx.fillStyle(C_LEFT,  1);    gfx.fillCircle(cx - 55, dotRow, DOT_R);
    gfx.fillStyle(C_RIGHT, 0.25); gfx.fillCircle(cx + 55, dotRow, 18);
    gfx.fillStyle(C_RIGHT, 1);    gfx.fillCircle(cx + 55, dotRow, DOT_R);

    /* ---- divider line under HOW TO PLAY ---- */
    gfx.lineStyle(1, 0x222244, 0.5);
    gfx.moveTo(cx - 80, 326);
    gfx.lineTo(cx + 80, 326);
    gfx.strokePath();

    /* ---- HTML overlay ---- */
    const hiScore = parseInt(localStorage.getItem(HI_SCORE_KEY) || '0', 10);
    const hiLevel = parseInt(localStorage.getItem(HI_LEVEL_KEY) || '0', 10);
    uiManager.showMenu(hiScore, hiLevel);

    /* ---- start trigger ---- */
    const go = () => {
      sfx.init();
      sfx.play('start');
      uiManager.hideMenu();
      this.scene.start('Game');
    };
    this.input.once('pointerdown', go);
    this.input.keyboard!.once('keydown', go);
  }
}
