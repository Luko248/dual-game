import { THEMES, TOTAL_LEVELS, MAX_COMBO_MULTI } from '../config/constants';
import type { LbRow } from './Leaderboard';

/* Virtual canvas size — matches Phaser's 400×640 space */
const VW = 400;
const VH = 640;

class UIManager {
  private inner!: HTMLElement;

  /* menu */
  private menuUI!: HTMLElement;
  private menuBest!: HTMLElement;
  private menuLvl!: HTMLElement;

  /* game hud */
  private gameHUD!: HTMLElement;
  private hudScore!: HTMLElement;
  private hudCombo!: HTMLElement;
  private hudBestBanner!: HTMLElement;
  /* intro hint */
  private introHint!: HTMLElement;
  private introLabel!: HTMLElement;

  /* power-up indicators */
  private hudGhost!: HTMLElement;
  private hudGhostCount!: HTMLElement;
  private hudBullet!: HTMLElement;
  private hudBulletTimer!: HTMLElement;

  /* theme banner */
  private gameBanner!: HTMLElement;
  private bannerTheme!: HTMLElement;
  private bannerLevel!: HTMLElement;
  private bannerTimer?: ReturnType<typeof setTimeout>;

  /* power-up pickup alerts */
  private ghostAlert!: HTMLElement;
  private ghostTimer?: ReturnType<typeof setTimeout>;
  private bulletAlert!: HTMLElement;
  private bulletTimer?: ReturnType<typeof setTimeout>;

  /* per-frame change-detection caches — skip DOM writes when unchanged */
  private lastScore = -1;
  private lastCombo = -1;

  /* leaderboard */
  private leaderboardUI!: HTMLElement;
  private lbScope!: HTMLElement;
  private lbNameInput!: HTMLInputElement;
  private lbList!: HTMLElement;
  private lbStatus!: HTMLElement;
  private menuLeaderboardBtn!: HTMLElement;
  private lbBack!: HTMLElement;
  private menuMuteBtn!: HTMLElement;
  private menuAdvancedBtn!: HTMLElement;

  /* leaderboard + audio + mode callbacks (wired by the menu scene) */
  onShowLeaderboard?: () => void;
  onHideLeaderboard?: () => void;
  onNameChange?: (name: string) => void;
  onToggleMute?: () => void;
  onStartAdvanced?: () => void;

  /* game over */
  private gameoverUI!: HTMLElement;
  private goTitle!: HTMLElement;
  private goScore!: HTMLElement;
  private goBest!: HTMLElement;
  private goCombo!: HTMLElement;
  private goLevel!: HTMLElement;
  private goRetry!: HTMLElement;

  init(): void {
    this.inner         = document.getElementById('ui-inner')!;
    this.menuUI        = document.getElementById('menu-ui')!;
    this.menuBest      = document.getElementById('menu-best')!;
    this.menuLvl       = document.getElementById('menu-lvl')!;
    this.gameHUD       = document.getElementById('game-hud')!;
    this.hudScore      = document.getElementById('hud-score')!;
    this.hudCombo      = document.getElementById('hud-combo')!;
    this.hudBestBanner = document.getElementById('hud-best-banner')!;
    this.introHint     = document.getElementById('intro-hint')!;
    this.introLabel    = document.getElementById('intro-label')!;
    this.hudGhost      = document.getElementById('hud-ghost')!;
    this.hudGhostCount = document.getElementById('hud-ghost-count')!;
    this.hudBullet     = document.getElementById('hud-bullet')!;
    this.hudBulletTimer = document.getElementById('hud-bullet-timer')!;
    this.gameBanner    = document.getElementById('game-banner')!;
    this.bannerTheme   = document.getElementById('banner-theme')!;
    this.bannerLevel   = document.getElementById('banner-level')!;
    this.ghostAlert    = document.getElementById('ghost-alert')!;
    this.bulletAlert   = document.getElementById('bullet-alert')!;
    this.leaderboardUI = document.getElementById('leaderboard-ui')!;
    this.lbScope       = document.getElementById('lb-scope')!;
    this.lbNameInput   = document.getElementById('lb-name-input') as HTMLInputElement;
    this.lbList        = document.getElementById('lb-list')!;
    this.lbStatus      = document.getElementById('lb-status')!;
    this.menuLeaderboardBtn = document.getElementById('menu-leaderboard-btn')!;
    this.menuMuteBtn   = document.getElementById('menu-mute-btn')!;
    this.menuAdvancedBtn = document.getElementById('menu-advanced-btn')!;
    this.lbBack        = document.getElementById('lb-back')!;
    this.gameoverUI    = document.getElementById('gameover-ui')!;
    this.goTitle       = document.getElementById('go-title')!;
    this.goScore       = document.getElementById('go-score')!;
    this.goBest        = document.getElementById('go-best')!;
    this.goCombo       = document.getElementById('go-combo')!;
    this.goLevel       = document.getElementById('go-level')!;
    this.goRetry       = document.getElementById('go-retry')!;

    /* leaderboard navigation + name editing */
    this.menuLeaderboardBtn.addEventListener('click', () => this.onShowLeaderboard?.());
    this.menuMuteBtn.addEventListener('click', () => this.onToggleMute?.());
    this.menuAdvancedBtn.addEventListener('click', () => this.onStartAdvanced?.());
    this.lbBack.addEventListener('click', () => this.onHideLeaderboard?.());
    /* commit name on Enter / blur */
    this.lbNameInput.addEventListener('change', () => {
      this.onNameChange?.(this.lbNameInput.value);
    });
    this.lbNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.lbNameInput.blur();
      e.stopPropagation();   // don't let Phaser's keyboard see typing
    });

    this.updateScale();
  }

  updateScale(): void {
    /* Scale is handled entirely by CSS using svi/svb viewport units.
       No JS needed — kept as no-op for call-site compatibility. */
  }

  private hideAll(): void {
    this.menuUI.classList.add('ui-hidden');
    this.gameHUD.classList.add('ui-hidden');
    this.introHint.classList.add('ui-hidden');
    this.introHint.classList.remove('intro-fading');
    this.gameBanner.classList.add('ui-hidden');
    this.ghostAlert.classList.add('ui-hidden');
    this.bulletAlert.classList.add('ui-hidden');
    this.leaderboardUI.classList.add('ui-hidden');
    this.gameoverUI.classList.add('ui-hidden');
  }

  /* ------------------------------------------------------------------ */
  /*  MENU                                                               */
  /* ------------------------------------------------------------------ */

  showMenu(hiScore: number, hiLevel: number): void {
    this.hideAll();
    this.menuBest.textContent = hiScore > 0 ? 'BEST:\u00a0' + hiScore : '';
    this.menuLvl.textContent  = hiLevel > 0 ? 'LVL\u00a0' + hiLevel + '\u00a0/\u00a0' + TOTAL_LEVELS : '';
    this.menuUI.classList.remove('ui-hidden');
  }

  hideMenu(): void {
    this.menuUI.classList.add('ui-hidden');
  }

  setMuteLabel(muted: boolean): void {
    this.menuMuteBtn.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
    this.menuMuteBtn.classList.toggle('is-muted', muted);
  }

  /* ------------------------------------------------------------------ */
  /*  GAME HUD                                                           */
  /* ------------------------------------------------------------------ */

  showHUD(advanced = false): void {
    this.hideAll();
    this.hudScore.textContent        = '0';
    this.hudCombo.style.opacity      = '0';
    this.hudBestBanner.style.opacity = '0';
    this.hudGhost.classList.add('ui-hidden');
    this.hudBullet.classList.add('ui-hidden');
    this.gameHUD.classList.remove('ui-hidden');
    this.gameHUD.classList.add('intro-demo');
    /* advanced mode: each thumb its own dot — change the hint + demo motion */
    this.gameHUD.classList.toggle('mode-advanced', advanced);
    this.introLabel.textContent = advanced
      ? 'EACH THUMB → ITS OWN DOT'
      : 'SLIDE THUMBS ← →';
    this.introHint.classList.remove('ui-hidden', 'intro-fading');
    /* reset change-detection caches so the first per-frame update writes */
    this.lastScore = -1;
    this.lastCombo = -1;
  }

  stopIntroDemo(): void {
    this.gameHUD.classList.remove('intro-demo');
  }

  updateScore(score: number): void {
    if (score === this.lastScore) return;
    this.lastScore = score;
    this.hudScore.textContent = score.toString();
  }

  updateCombo(combo: number): void {
    if (combo === this.lastCombo) return;
    this.lastCombo = combo;
    if (combo > 1) {
      this.hudCombo.textContent   = '\u00d7' + Math.min(combo, MAX_COMBO_MULTI);
      this.hudCombo.style.opacity = '0.8';
    } else {
      this.hudCombo.style.opacity = '0';
    }
  }

  showNewBest(): void {
    this.hudBestBanner.style.opacity = '1';
  }

  fadeOutIntroHint(): void {
    this.introHint.classList.add('intro-fading');
    setTimeout(() => {
      this.introHint.classList.add('ui-hidden');
    }, 600);
  }

  hideIntroHint(): void {
    this.introHint.classList.add('ui-hidden');
  }

  /* ------------------------------------------------------------------ */
  /*  GHOST CHARGES                                                       */
  /* ------------------------------------------------------------------ */

  updateGhostCharges(charges: number): void {
    if (charges > 0) {
      this.hudGhostCount.textContent = charges.toString();
      this.hudGhost.classList.remove('ui-hidden');
    } else {
      this.hudGhost.classList.add('ui-hidden');
    }
  }

  /* ------------------------------------------------------------------ */
  /*  BULLET TIME                                                         */
  /* ------------------------------------------------------------------ */

  updateBulletWalls(wallsLeft: number): void {
    if (wallsLeft > 0) {
      this.hudBulletTimer.textContent = wallsLeft.toString();
      this.hudBullet.classList.remove('ui-hidden');
    } else {
      this.hudBullet.classList.add('ui-hidden');
    }
  }

  /* ------------------------------------------------------------------ */
  /*  THEME BANNER                                                       */
  /* ------------------------------------------------------------------ */

  showBanner(themeName: string, level: number): void {
    this.bannerTheme.textContent = themeName.toUpperCase();
    this.bannerLevel.textContent = 'LEVEL\u00a0' + level;
    /* re-trigger CSS animation */
    this.gameBanner.classList.remove('ui-hidden', 'ui-banner-anim');
    void this.gameBanner.offsetWidth;
    this.gameBanner.classList.add('ui-banner-anim');
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.gameBanner.classList.add('ui-hidden');
    }, 2200);
  }

  /* ------------------------------------------------------------------ */
  /*  POWER-UP PICKUP ALERTS                                             */
  /*  Both ride the same 2s slide-up + fade keyframe.                    */
  /* ------------------------------------------------------------------ */

  showGhostAlert(): void {
    this.ghostAlert.classList.remove('ui-hidden', 'ui-pickup-alert-anim');
    void this.ghostAlert.offsetWidth;
    this.ghostAlert.classList.add('ui-pickup-alert-anim');
    if (this.ghostTimer) clearTimeout(this.ghostTimer);
    this.ghostTimer = setTimeout(() => {
      this.ghostAlert.classList.add('ui-hidden');
    }, 2000);
  }

  showBulletAlert(): void {
    this.bulletAlert.classList.remove('ui-hidden', 'ui-pickup-alert-anim');
    void this.bulletAlert.offsetWidth;
    this.bulletAlert.classList.add('ui-pickup-alert-anim');
    if (this.bulletTimer) clearTimeout(this.bulletTimer);
    this.bulletTimer = setTimeout(() => {
      this.bulletAlert.classList.add('ui-hidden');
    }, 2000);
  }

  /* ------------------------------------------------------------------ */
  /*  LEADERBOARD                                                         */
  /* ------------------------------------------------------------------ */

  showLeaderboard(name: string, global: boolean): void {
    this.hideAll();
    this.lbNameInput.value = name;
    this.lbScope.textContent = global ? 'GLOBAL' : 'THIS DEVICE';
    this.lbList.innerHTML = '';
    this.lbStatus.textContent = 'Loading…';
    this.leaderboardUI.classList.remove('ui-hidden');
  }

  renderLeaderboard(rows: LbRow[], global: boolean): void {
    this.lbList.innerHTML = '';

    if (rows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'lb-empty';
      empty.textContent = 'No scores yet — be the first!';
      this.lbList.appendChild(empty);
      this.lbStatus.textContent = '';
      return;
    }

    for (const r of rows) {
      const row = document.createElement('div');
      row.className = 'lb-row' + (r.you ? ' lb-you' : '');

      const rank = document.createElement('span');
      rank.className = 'lb-rank';
      rank.textContent = '#' + r.rank;

      const nm = document.createElement('span');
      nm.className = 'lb-name';
      nm.textContent = r.name;

      const sc = document.createElement('span');
      sc.className = 'lb-score';
      sc.textContent = r.score.toString();

      row.append(rank, nm, sc);
      this.lbList.appendChild(row);
    }

    this.lbStatus.textContent = global ? '' : 'Local board — set a PlayFab Title ID to go global';
  }

  setLeaderboardError(msg: string): void {
    this.lbList.innerHTML = '';
    this.lbStatus.textContent = msg;
  }

  /* ------------------------------------------------------------------ */
  /*  GAME OVER                                                          */
  /* ------------------------------------------------------------------ */

  showGameOver(
    score: number,
    hiScore: number,
    isNewBest: boolean,
    maxCombo: number,
    currentTheme: number
  ): void {
    this.goScore.textContent = 'Score:\u00a0' + score;

    if (isNewBest) {
      this.goBest.textContent = 'NEW\u00a0BEST:\u00a0' + hiScore;
      this.goBest.classList.add('ui-new-best');
    } else {
      this.goBest.textContent = 'Best:\u00a0' + hiScore;
      this.goBest.classList.remove('ui-new-best');
    }

    if (maxCombo > 2) {
      this.goCombo.textContent = 'Max\u00a0combo:\u00a0\u00d7' + Math.min(maxCombo, MAX_COMBO_MULTI);
      this.goCombo.style.display = '';
    } else {
      this.goCombo.style.display = 'none';
    }

    if (currentTheme > 0) {
      const tName = THEMES[currentTheme % THEMES.length].name.toUpperCase();
      this.goLevel.textContent = tName + '\u00a0\u2014\u00a0Lv.\u00a0' + (currentTheme + 1) + '\u00a0/\u00a0' + TOTAL_LEVELS;
      this.goLevel.style.display = '';
    } else {
      this.goLevel.style.display = 'none';
    }

    /* staggered fade-in */
    const seq = [this.goTitle, this.goScore, this.goBest, this.goCombo, this.goLevel];
    seq.forEach(el => {
      el.style.opacity = '0';
      el.classList.remove('ui-fadein');
    });

    this.goRetry.style.display = 'none';
    this.gameoverUI.classList.remove('ui-hidden');

    const delays = [0, 80, 160, 240, 320];
    seq.forEach((el, i) => {
      if (el.style.display === 'none') return;
      setTimeout(() => {
        void el.offsetWidth;
        el.classList.add('ui-fadein');
      }, delays[i]);
    });
  }

  showRetry(): void {
    this.goRetry.style.display = '';
  }

  hideGameOver(): void {
    this.gameoverUI.classList.add('ui-hidden');
    this.goRetry.style.display = 'none';
  }
}

export const uiManager = new UIManager();
