import Phaser from 'phaser';
import { C_BG, HI_SCORE_KEY, HI_LEVEL_KEY } from '../config/constants';
import { sfx } from '../engine/SoundEngine';
import { uiManager } from '../engine/UIManager';
import { leaderboard, LbMode } from '../engine/Leaderboard';

export class MenuScene extends Phaser.Scene {
  /** true while the leaderboard screen is open — blocks tap/key-to-start */
  private navLocked = false;
  /** which board the leaderboard screen is currently showing */
  private lbMode: LbMode = 'normal';

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
    uiManager.setMuteLabel(sfx.isMuted());

    /* ---- start trigger (guarded so the leaderboard screen can intercept) ---- */
    const start = (advanced: boolean) => {
      if (this.navLocked) return;
      sfx.init();
      sfx.play('start');
      uiManager.hideMenu();
      this.scene.start('Game', { advanced });
    };
    /* tap anywhere / any key → normal mode; the ADVANCED button → advanced */
    this.input.on('pointerdown', () => start(false));
    this.input.keyboard!.on('keydown', () => start(false));
    uiManager.onStartAdvanced = () => start(true);

    /* ---- leaderboard navigation ---- */
    uiManager.onShowLeaderboard = () => this.openLeaderboard();
    uiManager.onHideLeaderboard = () => this.closeLeaderboard(hiScore, hiLevel);
    uiManager.onNameChange = (name) => {
      leaderboard.setName(name).then(() => this.refreshLeaderboard());
    };
    uiManager.onSelectMode = (mode) => {
      this.lbMode = mode;
      uiManager.setLeaderboardMode(mode);
      this.refreshLeaderboard();
    };

    /* ---- sound toggle ---- */
    uiManager.onToggleMute = () => {
      sfx.init();                 // ensure the audio graph exists (user gesture)
      uiManager.setMuteLabel(sfx.toggleMute());
    };
  }

  private openLeaderboard(): void {
    this.navLocked = true;
    this.lbMode = 'normal';
    sfx.init();
    uiManager.showLeaderboard(leaderboard.getName(), leaderboard.isGlobal(), this.lbMode);
    this.refreshLeaderboard();
  }

  private closeLeaderboard(hiScore: number, hiLevel: number): void {
    this.navLocked = false;
    uiManager.showMenu(hiScore, hiLevel);
    uiManager.setMuteLabel(sfx.isMuted());
  }

  private refreshLeaderboard(): void {
    const global = leaderboard.isGlobal();
    const mode = this.lbMode;
    leaderboard.top(20, mode)
      .then(rows => {
        /* ignore a stale response if the user switched tabs meanwhile */
        if (this.lbMode === mode) uiManager.renderLeaderboard(rows, global);
      })
      .catch(() => {
        if (this.lbMode === mode) {
          uiManager.setLeaderboardError('Could not load leaderboard — check your connection');
        }
      });
  }
}
