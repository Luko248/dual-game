import Phaser from 'phaser';
import { C_BG, HI_SCORE_KEY, HI_LEVEL_KEY } from '../config/constants';
import { sfx } from '../engine/SoundEngine';
import { uiManager } from '../engine/UIManager';
import { leaderboard } from '../engine/Leaderboard';

export class MenuScene extends Phaser.Scene {
  /** true while the leaderboard screen is open — blocks tap/key-to-start */
  private navLocked = false;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.navLocked = false;
    this.cameras.main.setBackgroundColor(C_BG);

    /* ---- HTML overlay ---- */
    const hiScore = parseInt(localStorage.getItem(HI_SCORE_KEY) || '0', 10);
    const hiLevel = parseInt(localStorage.getItem(HI_LEVEL_KEY) || '0', 10);
    uiManager.showMenu(hiScore, hiLevel);

    /* ---- start trigger (guarded so the leaderboard screen can intercept) ---- */
    const go = () => {
      if (this.navLocked) return;
      sfx.init();
      sfx.play('start');
      uiManager.hideMenu();
      this.scene.start('Game');
    };
    this.input.on('pointerdown', go);
    this.input.keyboard!.on('keydown', go);

    /* ---- leaderboard navigation ---- */
    uiManager.onShowLeaderboard = () => this.openLeaderboard();
    uiManager.onHideLeaderboard = () => this.closeLeaderboard(hiScore, hiLevel);
    uiManager.onNameChange = (name) => {
      leaderboard.setName(name).then(() => this.refreshLeaderboard());
    };
  }

  private openLeaderboard(): void {
    this.navLocked = true;
    sfx.init();
    uiManager.showLeaderboard(leaderboard.getName(), leaderboard.isGlobal());
    this.refreshLeaderboard();
  }

  private closeLeaderboard(hiScore: number, hiLevel: number): void {
    this.navLocked = false;
    uiManager.showMenu(hiScore, hiLevel);
  }

  private refreshLeaderboard(): void {
    const global = leaderboard.isGlobal();
    leaderboard.top(20)
      .then(rows => uiManager.renderLeaderboard(rows, global))
      .catch(() => uiManager.setLeaderboardError('Could not load leaderboard — check your connection'));
  }
}
