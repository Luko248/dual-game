import Phaser from 'phaser';
import { W, H, DOT_R, C_BG, C_LEFT, C_RIGHT, C_GHOST, HI_SCORE_KEY } from '../config/constants';
import { sfx } from '../engine/SoundEngine';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C_BG);
    const cx = W / 2;
    const gfx = this.add.graphics();

    /* ---- title ---- */
    this.add.text(cx, 120, 'DUAL', {
      fontSize: '72px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(cx, 190, 'Two dots. One mind.', {
      fontSize: '15px', fontFamily: 'monospace', color: '#555577'
    }).setOrigin(0.5);

    /* ---- demo dots ---- */
    const dotRow = 260;
    gfx.fillStyle(C_LEFT, 0.25);  gfx.fillCircle(cx - 55, dotRow, 18);
    gfx.fillStyle(C_LEFT, 1);     gfx.fillCircle(cx - 55, dotRow, DOT_R);
    gfx.fillStyle(C_RIGHT, 0.25); gfx.fillCircle(cx + 55, dotRow, 18);
    gfx.fillStyle(C_RIGHT, 1);    gfx.fillCircle(cx + 55, dotRow, DOT_R);

    /* ---- how to play ---- */
    const secY = 310;

    this.add.text(cx, secY, 'HOW TO PLAY', {
      fontSize: '11px', fontFamily: 'monospace', color: '#555577', fontStyle: 'bold'
    }).setOrigin(0.5);

    /* divider line */
    gfx.lineStyle(1, 0x222244, 0.5);
    gfx.moveTo(cx - 80, secY + 12);
    gfx.lineTo(cx + 80, secY + 12);
    gfx.strokePath();

    this.add.text(cx, secY + 30, '\u2190  spread apart', {
      fontSize: '13px', fontFamily: 'monospace', color: '#444466'
    }).setOrigin(0.5);

    this.add.text(cx, secY + 52, '\u2192  come together', {
      fontSize: '13px', fontFamily: 'monospace', color: '#444466'
    }).setOrigin(0.5);

    this.add.text(cx, secY + 82, 'Both must survive.', {
      fontSize: '13px', fontFamily: 'monospace', color: '#444466'
    }).setOrigin(0.5);

    /* ---- controls ---- */
    this.add.text(cx, secY + 116, '\u2190 \u2192  or  tap left / right', {
      fontSize: '11px', fontFamily: 'monospace', color: '#333355'
    }).setOrigin(0.5);

    /* ---- ghost power-up hint ---- */
    const ghostRow = secY + 152;

    /* ghost icon */
    const ghostIconX = cx - 90;
    gfx.fillStyle(C_GHOST, 0.12); gfx.fillCircle(ghostIconX, ghostRow, 10);
    gfx.fillStyle(C_GHOST, 0.35); gfx.fillCircle(ghostIconX, ghostRow, 6);
    gfx.fillStyle(0xffffff, 0.7); gfx.fillCircle(ghostIconX, ghostRow, 2.5);

    this.add.text(ghostIconX + 18, ghostRow, '= phase through next wall', {
      fontSize: '11px', fontFamily: 'monospace', color: '#333355'
    }).setOrigin(0, 0.5);

    /* ---- high score ---- */
    const hi = localStorage.getItem(HI_SCORE_KEY) || '0';
    if (parseInt(hi, 10) > 0) {
      this.add.text(cx, H - 100, 'BEST: ' + hi, {
        fontSize: '18px', fontFamily: 'monospace', color: '#555577'
      }).setOrigin(0.5);
    }

    /* ---- pulsing prompt ---- */
    const prompt = this.add.text(cx, H - 55, 'TAP OR PRESS ANY KEY', {
      fontSize: '14px', fontFamily: 'monospace', color: '#777777'
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });

    /* ---- start trigger ---- */
    const go = () => {
      sfx.init();
      sfx.play('start');
      this.scene.start('Game');
    };
    this.input.once('pointerdown', go);
    this.input.keyboard!.once('keydown', go);
  }
}
