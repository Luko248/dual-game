import Phaser from 'phaser';
import { W, H, C_BG } from './config/constants';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';

/* ---- Launch Phaser ---- */
new Phaser.Game({
  type: Phaser.AUTO,
  width: W,
  height: H,
  backgroundColor: C_BG,
  parent: 'game',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [MenuScene, GameScene]
});

/* ---- Register Service Worker (PWA) ---- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* SW registration failed — game still works fine */
    });
  });
}
