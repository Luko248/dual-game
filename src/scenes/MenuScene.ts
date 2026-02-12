import Phaser from 'phaser';
import { W, DOT_R, C_BG, C_LEFT, C_RIGHT, HI_SCORE_KEY } from '../config/constants';
import { sfx } from '../engine/SoundEngine';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C_BG);
    const cx = W / 2;

    /* title */
    this.add.text(cx, 155, 'DUAL', {
      fontSize: '72px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(cx, 228, 'Two dots. One mind.', {
      fontSize: '15px', fontFamily: 'monospace', color: '#555577'
    }).setOrigin(0.5);

    /* demo dots */
    const gfx = this.add.graphics();
    const dy = 340;
    gfx.fillStyle(C_LEFT, 0.25);  gfx.fillCircle(cx - 55, dy, 18);
    gfx.fillStyle(C_LEFT, 1);     gfx.fillCircle(cx - 55, dy, DOT_R);
    gfx.fillStyle(C_RIGHT, 0.25); gfx.fillCircle(cx + 55, dy, 18);
    gfx.fillStyle(C_RIGHT, 1);    gfx.fillCircle(cx + 55, dy, DOT_R);

    /* instructions */
    const lines = [
      { y: dy + 40, t: '\u2190  spread apart  \u2192' },
      { y: dy + 62, t: '\u2192  come together  \u2190' },
      { y: dy + 100, t: 'Both must survive.' }
    ];
    for (const l of lines) {
      this.add.text(cx, l.y, l.t, {
        fontSize: '13px', fontFamily: 'monospace', color: '#444466'
      }).setOrigin(0.5);
    }

    this.add.text(cx, dy + 130, 'Keyboard: \u2190 \u2192   |   Mobile: tap left / right', {
      fontSize: '11px', fontFamily: 'monospace', color: '#333355'
    }).setOrigin(0.5);

    /* high score */
    const hi = localStorage.getItem(HI_SCORE_KEY) || '0';
    if (parseInt(hi, 10) > 0) {
      this.add.text(cx, dy + 170, 'BEST: ' + hi, {
        fontSize: '18px', fontFamily: 'monospace', color: '#555577'
      }).setOrigin(0.5);
    }

    /* pulsing prompt */
    const prompt = this.add.text(cx, 570, 'TAP OR PRESS ANY KEY', {
      fontSize: '14px', fontFamily: 'monospace', color: '#777777'
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });

    /* start trigger */
    const go = () => {
      sfx.init();
      sfx.play('start');
      this.scene.start('Game');
    };
    this.input.once('pointerdown', go);
    this.input.keyboard!.once('keydown', go);
  }
}
