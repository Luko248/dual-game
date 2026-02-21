import { THEMES, TOTAL_LEVELS, MAX_COMBO_MULTI } from '../config/constants';

/* Coordinate space matches Phaser's 400×640 virtual canvas */
const VW = 400;
const VH = 640;

class UIManager {
  private inner!: HTMLElement;

  /* menu */
  private menuUI!: HTMLElement;
  private menuBest!: HTMLElement;
  private menuLvl!: HTMLElement;
  private menuPrompt!: HTMLElement;

  /* game hud */
  private gameHUD!: HTMLElement;
  private hudScore!: HTMLElement;
  private hudCombo!: HTMLElement;
  private hudBestBanner!: HTMLElement;
  private hudHintSpread!: HTMLElement;
  private hudHintGather!: HTMLElement;

  /* theme banner */
  private gameBanner!: HTMLElement;
  private bannerTheme!: HTMLElement;
  private bannerLevel!: HTMLElement;
  private bannerTimer?: ReturnType<typeof setTimeout>;

  /* ghost alert */
  private ghostAlert!: HTMLElement;
  private ghostTimer?: ReturnType<typeof setTimeout>;

  /* game over */
  private gameoverUI!: HTMLElement;
  private goTitle!: HTMLElement;
  private goScore!: HTMLElement;
  private goBest!: HTMLElement;
  private goCombo!: HTMLElement;
  private goLevel!: HTMLElement;
  private goMaxLvl!: HTMLElement;
  private goRetry!: HTMLElement;

  init(): void {
    this.inner         = document.getElementById('ui-inner')!;
    this.menuUI        = document.getElementById('menu-ui')!;
    this.menuBest      = document.getElementById('menu-best')!;
    this.menuLvl       = document.getElementById('menu-lvl')!;
    this.menuPrompt    = document.getElementById('menu-prompt')!;
    this.gameHUD       = document.getElementById('game-hud')!;
    this.hudScore      = document.getElementById('hud-score')!;
    this.hudCombo      = document.getElementById('hud-combo')!;
    this.hudBestBanner = document.getElementById('hud-best-banner')!;
    this.hudHintSpread = document.getElementById('hud-hint-spread')!;
    this.hudHintGather = document.getElementById('hud-hint-gather')!;
    this.gameBanner    = document.getElementById('game-banner')!;
    this.bannerTheme   = document.getElementById('banner-theme')!;
    this.bannerLevel   = document.getElementById('banner-level')!;
    this.ghostAlert    = document.getElementById('ghost-alert')!;
    this.gameoverUI    = document.getElementById('gameover-ui')!;
    this.goTitle       = document.getElementById('go-title')!;
    this.goScore       = document.getElementById('go-score')!;
    this.goBest        = document.getElementById('go-best')!;
    this.goCombo       = document.getElementById('go-combo')!;
    this.goLevel       = document.getElementById('go-level')!;
    this.goMaxLvl      = document.getElementById('go-maxlvl')!;
    this.goRetry       = document.getElementById('go-retry')!;

    this.updateScale();
  }

  updateScale(): void {
    const scale = Math.min(window.innerWidth / VW, window.innerHeight / VH);
    const tx = (window.innerWidth  - VW * scale) / 2;
    const ty = (window.innerHeight - VH * scale) / 2;
    this.inner.style.transform       = `translate(${tx}px,${ty}px) scale(${scale})`;
    this.inner.style.transformOrigin = '0 0';
  }

  private hideAll(): void {
    this.menuUI.classList.add('ui-hidden');
    this.gameHUD.classList.add('ui-hidden');
    this.gameBanner.classList.add('ui-hidden');
    this.ghostAlert.classList.add('ui-hidden');
    this.gameoverUI.classList.add('ui-hidden');
  }

  /* ---- MENU ---- */

  showMenu(hiScore: number, hiLevel: number): void {
    this.hideAll();
    this.menuBest.textContent = hiScore > 0 ? 'BEST: ' + hiScore : '';
    this.menuLvl.textContent  = hiLevel > 0 ? 'LVL ' + hiLevel + '\u00a0/\u00a0' + TOTAL_LEVELS : '';
    this.menuUI.classList.remove('ui-hidden');
    /* pulse the prompt */
    this.menuPrompt.classList.remove('ui-pulse');
    void this.menuPrompt.offsetWidth;
    this.menuPrompt.classList.add('ui-pulse');
  }

  hideMenu(): void {
    this.menuUI.classList.add('ui-hidden');
  }

  /* ---- HUD ---- */

  showHUD(): void {
    this.hideAll();
    this.hudScore.textContent = '0';
    this.hudCombo.style.opacity = '0';
    this.hudBestBanner.style.opacity = '0';
    this.hudHintSpread.style.opacity = '0.35';
    this.hudHintGather.style.opacity = '0.35';
    this.gameHUD.classList.remove('ui-hidden');
  }

  updateScore(score: number): void {
    this.hudScore.textContent = score.toString();
  }

  updateCombo(combo: number): void {
    if (combo > 1) {
      this.hudCombo.textContent = '\u00d7' + Math.min(combo, MAX_COMBO_MULTI);
      this.hudCombo.style.opacity = '0.8';
    } else {
      this.hudCombo.style.opacity = '0';
    }
  }

  showNewBest(): void {
    this.hudBestBanner.style.opacity = '1';
  }

  setHintAlpha(alpha: number): void {
    const v = (alpha * 0.35).toString();
    this.hudHintSpread.style.opacity = v;
    this.hudHintGather.style.opacity = v;
  }

  /* ---- THEME BANNER ---- */

  showBanner(themeName: string, level: number): void {
    this.bannerTheme.textContent = themeName.toUpperCase();
    this.bannerLevel.textContent = 'LEVEL ' + level;
    /* re-trigger animation */
    this.gameBanner.classList.remove('ui-hidden', 'ui-banner-anim');
    void this.gameBanner.offsetWidth;
    this.gameBanner.classList.add('ui-banner-anim');
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.gameBanner.classList.add('ui-hidden');
    }, 2200);
  }

  /* ---- GHOST ALERT ---- */

  showGhostAlert(): void {
    this.ghostAlert.classList.remove('ui-hidden', 'ui-ghost-anim');
    void this.ghostAlert.offsetWidth;
    this.ghostAlert.classList.add('ui-ghost-anim');
    if (this.ghostTimer) clearTimeout(this.ghostTimer);
    this.ghostTimer = setTimeout(() => {
      this.ghostAlert.classList.add('ui-hidden');
    }, 700);
  }

  /* ---- GAME OVER ---- */

  showGameOver(
    score: number,
    hiScore: number,
    isNewBest: boolean,
    maxCombo: number,
    currentTheme: number,
    hiLevel: number
  ): void {
    this.goScore.textContent = 'Score:\u00a0' + score;

    if (isNewBest) {
      this.goBest.textContent = 'NEW BEST:\u00a0' + hiScore;
      this.goBest.classList.add('ui-new-best');
    } else {
      this.goBest.textContent = 'Best:\u00a0' + hiScore;
      this.goBest.classList.remove('ui-new-best');
    }

    if (maxCombo > 2) {
      this.goCombo.textContent = 'Max combo:\u00a0\u00d7' + Math.min(maxCombo, MAX_COMBO_MULTI);
      this.goCombo.style.display = '';
    } else {
      this.goCombo.style.display = 'none';
    }

    if (currentTheme > 0) {
      const tName = THEMES[currentTheme % THEMES.length].name.toUpperCase();
      this.goLevel.textContent = 'Reached:\u00a0' + tName + '\u00a0(Lv.\u00a0' + (currentTheme + 1) + '\u00a0/\u00a0' + TOTAL_LEVELS + ')';
      this.goLevel.style.display = '';
    } else {
      this.goLevel.style.display = 'none';
    }

    if (hiLevel > 0) {
      this.goMaxLvl.textContent = 'Best level:\u00a0' + hiLevel + '\u00a0/\u00a0' + TOTAL_LEVELS;
      this.goMaxLvl.style.display = '';
    } else {
      this.goMaxLvl.style.display = 'none';
    }

    this.goRetry.style.display = 'none';
    this.goRetry.classList.remove('ui-pulse');

    /* staggered fade-in */
    const seq = [this.goTitle, this.goScore, this.goBest, this.goCombo, this.goLevel, this.goMaxLvl];
    seq.forEach(el => { el.style.opacity = '0'; el.classList.remove('ui-fadein'); });

    this.gameoverUI.classList.remove('ui-hidden');

    const delays = [0, 80, 160, 240, 320, 400];
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
    void this.goRetry.offsetWidth;
    this.goRetry.classList.add('ui-pulse');
  }

  hideGameOver(): void {
    this.gameoverUI.classList.add('ui-hidden');
  }
}

export const uiManager = new UIManager();
