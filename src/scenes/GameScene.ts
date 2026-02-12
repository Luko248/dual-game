import Phaser from 'phaser';
import {
  W, H, HALF, DOT_R, DOT_Y, WALL_H,
  ACCEL, FRICTION, MAX_VEL, TRAIL_LEN,
  SPEED_INITIAL, SPEED_GROWTH, MAX_COMBO_MULTI,
  C_BG, C_LEFT, C_RIGHT, HI_SCORE_KEY,
  THEMES, FLICKER_START_SCORE, FLICKER_INTERVAL_MIN,
  FLICKER_INTERVAL_MAX, FLICKER_DURATION,
  GHOST_RADIUS, GHOST_DURATION
} from '../config/constants';
import { sfx } from '../engine/SoundEngine';
import { InputManager } from '../engine/InputManager';
import { ObstaclePool } from '../engine/ObstaclePool';
import { Renderer, DeathParticle } from '../engine/Renderer';

interface Dot {
  x: number;
  vx: number;
}

export class GameScene extends Phaser.Scene {
  /* player state */
  private leftDot!: Dot;
  private rightDot!: Dot;

  /* scrolling / score */
  private speed!: number;
  private dist!: number;
  private score!: number;
  private combo!: number;
  private maxCombo!: number;
  private alive!: boolean;
  private hiScore!: number;
  private newBest!: boolean;
  private shakeAmt!: number;

  /* theme tracking */
  private currentTheme!: number;
  private lastThemeTrigger!: number;

  /* flicker state */
  private flickerPhase!: number;
  private flickerTimer!: number;
  private nextFlickerAt!: number;

  /* trails */
  private leftTrail!: number[];
  private rightTrail!: number[];

  /* ghost power-up */
  private ghostActive!: boolean;
  private ghostTimer!: number;
  private ghostTxt!: Phaser.GameObjects.Text;

  /* death */
  private deathParticles!: DeathParticle[];
  private deathTimer!: number;
  private deadSide!: 'left' | 'right' | null;
  private goText!: Phaser.GameObjects.Text | null;
  private goScore!: Phaser.GameObjects.Text;
  private goHi!: Phaser.GameObjects.Text;
  private goCombo!: Phaser.GameObjects.Text | undefined;
  private retryText!: Phaser.GameObjects.Text | null;

  /* subsystems */
  private input_!: InputManager;
  private pool!: ObstaclePool;
  private gfx!: Renderer;

  /* HUD */
  private scoreTxt!: Phaser.GameObjects.Text;
  private comboTxt!: Phaser.GameObjects.Text;
  private bestBanner!: Phaser.GameObjects.Text;
  private themeTxt!: Phaser.GameObjects.Text;
  private levelTxt!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C_BG);

    /* player state */
    this.leftDot  = { x: HALF / 2, vx: 0 };
    this.rightDot = { x: HALF + HALF / 2, vx: 0 };

    /* scrolling / score */
    this.speed = SPEED_INITIAL;
    this.dist = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.alive = true;
    this.hiScore = parseInt(localStorage.getItem(HI_SCORE_KEY) || '0', 10);
    this.newBest = false;
    this.shakeAmt = 0;

    /* theme tracking */
    this.currentTheme = 0;
    this.lastThemeTrigger = 0;

    /* flicker state */
    this.flickerPhase = 0;
    this.flickerTimer = 0;
    this.nextFlickerAt = this._randomFlickerDelay();

    /* trails */
    this.leftTrail = [];
    this.rightTrail = [];

    /* ghost power-up */
    this.ghostActive = false;
    this.ghostTimer = 0;

    /* death */
    this.deathParticles = [];
    this.deathTimer = 0;
    this.deadSide = null;
    this.goText = null;
    this.retryText = null;

    /* subsystems */
    this.input_ = new InputManager(this);
    this.pool = new ObstaclePool();
    this.pool.seed(DOT_Y - 250, this.dist);

    this.gfx = new Renderer({
      bg:     this.add.graphics(),
      walls:  this.add.graphics(),
      trails: this.add.graphics(),
      dots:   this.add.graphics(),
      fx:     this.add.graphics()
    });

    /* HUD */
    this.scoreTxt = this.add.text(W / 2, 28, '0', {
      fontSize: '26px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0.9).setDepth(10);

    this.comboTxt = this.add.text(W / 2, 56, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffaa00'
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    this.bestBanner = this.add.text(W / 2, 10, 'NEW BEST', {
      fontSize: '10px', fontFamily: 'monospace', color: '#ffcc00'
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    /* theme name banner (shows briefly on transition) */
    this.themeTxt = this.add.text(W / 2, H / 2, '', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0).setDepth(15);

    this.levelTxt = this.add.text(W / 2, H / 2 + 28, '', {
      fontSize: '11px', fontFamily: 'monospace', color: '#888899'
    }).setOrigin(0.5).setAlpha(0).setDepth(15);

    this.ghostTxt = this.add.text(W / 2, DOT_Y - 50, 'GHOST!', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0).setDepth(15);

    /* direction hint labels */
    this.add.text(W * 0.25, H - 22, 'SPREAD', {
      fontSize: '9px', fontFamily: 'monospace', color: '#555577'
    }).setOrigin(0.5).setAlpha(0.35).setDepth(10);

    this.add.text(W * 0.75, H - 22, 'GATHER', {
      fontSize: '9px', fontFamily: 'monospace', color: '#555577'
    }).setOrigin(0.5).setAlpha(0.35).setDepth(10);
  }

  /* ---- helpers ---- */
  private _randomFlickerDelay(): number {
    return FLICKER_INTERVAL_MIN + Math.random() * (FLICKER_INTERVAL_MAX - FLICKER_INTERVAL_MIN);
  }

  /* ================================================================ */
  /*  UPDATE                                                          */
  /* ================================================================ */
  update(time: number, delta: number): void {
    if (!this.alive) {
      this.updateDeath(delta, time);
      return;
    }

    const dt = delta / 16.667;
    const dir = this.input_.direction();

    /* -- physics -- */
    this.leftDot.vx  += dir * ACCEL * dt;
    this.rightDot.vx += -dir * ACCEL * dt;          // MIRRORED
    this.leftDot.vx  *= Math.pow(FRICTION, dt);
    this.rightDot.vx *= Math.pow(FRICTION, dt);
    this.leftDot.vx  = Phaser.Math.Clamp(this.leftDot.vx, -MAX_VEL, MAX_VEL);
    this.rightDot.vx = Phaser.Math.Clamp(this.rightDot.vx, -MAX_VEL, MAX_VEL);
    this.leftDot.x  += this.leftDot.vx * dt;
    this.rightDot.x += this.rightDot.vx * dt;
    this.leftDot.x  = Phaser.Math.Clamp(this.leftDot.x, DOT_R + 2, HALF - DOT_R - 2);
    this.rightDot.x = Phaser.Math.Clamp(this.rightDot.x, HALF + DOT_R + 2, W - DOT_R - 2);

    /* -- trails -- */
    this.leftTrail.push(this.leftDot.x);
    this.rightTrail.push(this.rightDot.x);
    if (this.leftTrail.length > TRAIL_LEN) this.leftTrail.shift();
    if (this.rightTrail.length > TRAIL_LEN) this.rightTrail.shift();

    /* -- scroll -- */
    this.speed = SPEED_INITIAL + Math.sqrt(this.dist) * SPEED_GROWTH;
    const scroll = this.speed * dt;
    this.dist += scroll;
    this.pool.scroll(scroll, this.dist);

    /* -- ghost timer -- */
    if (this.ghostActive) {
      this.ghostTimer -= delta;
      if (this.ghostTimer <= 0) {
        this.ghostActive = false;
        this.ghostTimer = 0;
      }
    }

    /* -- collision & scoring -- */
    for (const o of this.pool.items) {
      const inBand = o.y > DOT_Y - WALL_H / 2 - DOT_R && o.y < DOT_Y + WALL_H / 2 + DOT_R;

      if (inBand && !this.ghostActive) {
        if (this.hitTest(this.leftDot.x, o.leftGapX, o.gapW))  { this.die('left'); return; }
        if (this.hitTest(this.rightDot.x, o.rightGapX, o.gapW)) { this.die('right'); return; }

        /* near-miss */
        if (!o.nearFlag) {
          const lD = Math.abs(this.leftDot.x - o.leftGapX);
          const rD = Math.abs(this.rightDot.x - o.rightGapX);
          const edge = o.gapW / 2 - DOT_R;
          if (lD > edge - 6 || rD > edge - 6) {
            o.nearFlag = true;
            this.shakeAmt = 3;
            sfx.play('near');
          }
        }
      }

      /* -- ghost pickup -- */
      if (o.ghostX != null && !o.ghostCollected) {
        const dotX = o.ghostLane === 'left' ? this.leftDot.x : this.rightDot.x;
        const dx = dotX - o.ghostX;
        const dy = DOT_Y - o.y;
        if (dx * dx + dy * dy < (GHOST_RADIUS + DOT_R) * (GHOST_RADIUS + DOT_R)) {
          o.ghostCollected = true;
          this.ghostActive = true;
          this.ghostTimer = GHOST_DURATION;
          sfx.play('combo');
          this.ghostTxt.setAlpha(1);
          this.tweens.add({ targets: this.ghostTxt, alpha: 0, duration: 600 });
        }
      }

      if (!o.passed && o.y > DOT_Y + WALL_H / 2 + DOT_R) {
        o.passed = true;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.score += Math.min(this.combo, MAX_COMBO_MULTI);
        sfx.play('pass');

        if (this.score > this.hiScore && !this.newBest) {
          this.newBest = true;
          this.bestBanner.setText('NEW BEST');
          this.tweens.add({ targets: this.bestBanner, alpha: 1, duration: 250 });
        }
      }
    }

    /* -- theme transitions every 100 points -- */
    const themeIndex = Math.floor(this.score / 100);
    if (themeIndex > this.currentTheme) {
      this.currentTheme = themeIndex;
      this.gfx.setTheme(themeIndex);
      this.shakeAmt = 6;
      sfx.play('combo');

      /* show theme name */
      const theme = THEMES[themeIndex % THEMES.length];
      this.themeTxt.setText(theme.name.toUpperCase());
      this.themeTxt.setAlpha(1);
      this.levelTxt.setText('LEVEL ' + (themeIndex + 1));
      this.levelTxt.setAlpha(1);
      this.tweens.add({ targets: this.themeTxt, alpha: 0, duration: 1800, delay: 400 });
      this.tweens.add({ targets: this.levelTxt, alpha: 0, duration: 1800, delay: 400 });
    }

    /* -- flicker effect -- */
    if (this.score >= FLICKER_START_SCORE) {
      this.flickerTimer += delta;
      if (this.flickerPhase > 0) {
        /* flicker is active — decay */
        this.flickerPhase = Math.max(0, this.flickerPhase - delta / FLICKER_DURATION);
        this.gfx.flickering = this.flickerPhase > 0;
      } else if (this.flickerTimer >= this.nextFlickerAt) {
        /* trigger a new flicker */
        this.flickerPhase = 1;
        this.flickerTimer = 0;
        this.nextFlickerAt = this._randomFlickerDelay();
        this.gfx.flickering = true;
        /* extra intensity at higher scores */
        if (this.score > 400) this.shakeAmt = Math.max(this.shakeAmt, 2);
      }
    }

    this.shakeAmt *= 0.85;

    /* -- draw -- */
    const sx = (Math.random() - 0.5) * this.shakeAmt;
    const sy = (Math.random() - 0.5) * this.shakeAmt;

    this.gfx.clearAll();
    this.gfx.drawBg(this.dist, time, sx, sy, this.cameras.main);
    this.gfx.drawObstacles(this.pool.items, sx, sy, time);
    this.gfx.drawGhosts(this.pool.items, sx, sy, time);
    this.gfx.drawTrails(this.leftTrail, this.rightTrail, DOT_Y, sx, sy);
    this.gfx.drawDots(this.leftDot.x, this.rightDot.x, DOT_Y, time, sx, sy);

    /* ghost invincibility aura */
    if (this.ghostActive) {
      const ghostAlpha = Math.min(1, this.ghostTimer / 300);
      this.gfx.drawGhostAura(this.leftDot.x, this.rightDot.x, DOT_Y, time, sx, sy, ghostAlpha);
    }

    /* direction hint arrows — fade out as score increases */
    const hintAlpha = Math.max(0, 1 - this.score / 50);
    if (hintAlpha > 0) {
      this.gfx.drawDirectionHints(time, hintAlpha);
    }

    /* flicker overlay on top */
    if (this.flickerPhase > 0) {
      this.gfx.drawFlicker(this.flickerPhase);
    }

    /* HUD */
    this.scoreTxt.setText(this.score.toString());
    if (this.combo > 1) {
      this.comboTxt.setText('\u00d7' + Math.min(this.combo, MAX_COMBO_MULTI));
      this.comboTxt.setAlpha(0.8);
    } else {
      this.comboTxt.setAlpha(0);
    }
  }

  /* ================================================================ */
  /*  COLLISION                                                       */
  /* ================================================================ */
  private hitTest(dotX: number, gapX: number, gapW: number): boolean {
    const half = gapW / 2;
    return !(dotX - DOT_R >= gapX - half && dotX + DOT_R <= gapX + half);
  }

  /* ================================================================ */
  /*  DEATH                                                           */
  /* ================================================================ */
  private die(which: 'left' | 'right'): void {
    this.alive = false;
    this.deadSide = which;
    this.combo = 0;
    this.gfx.flickering = false;
    this.flickerPhase = 0;
    sfx.play('die');
    this.shakeAmt = 10;

    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      localStorage.setItem(HI_SCORE_KEY, this.score.toString());
    }

    /* burst particles */
    const dot = which === 'left' ? this.leftDot : this.rightDot;
    const col = which === 'left' ? C_LEFT : C_RIGHT;
    this.deathParticles = [];
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 5;
      this.deathParticles.push({
        x: dot.x, y: DOT_Y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 1, color: col
      });
    }
  }

  private updateDeath(delta: number, time: number): void {
    this.deathTimer += delta;
    this.shakeAmt *= 0.92;

    const sx = (Math.random() - 0.5) * this.shakeAmt;
    const sy = (Math.random() - 0.5) * this.shakeAmt;

    this.gfx.clearAll();
    this.gfx.drawBg(this.dist, time, sx, sy, this.cameras.main);
    this.gfx.drawObstacles(this.pool.items, sx, sy, time);

    /* dark overlay fade-in */
    const overlayAlpha = Math.min(0.65, this.deathTimer / 600);
    this.gfx.drawOverlay(overlayAlpha);

    /* surviving dot fades */
    const surv = this.deadSide === 'left' ? this.rightDot : this.leftDot;
    const sCol = this.deadSide === 'left' ? C_RIGHT : C_LEFT;
    const fade = Math.max(0.3, 1 - this.deathTimer / 2000);
    this.gfx.l.dots.fillStyle(sCol, fade);
    this.gfx.l.dots.fillCircle(surv.x + sx, DOT_Y + sy, DOT_R);

    /* particles */
    for (const p of this.deathParticles) {
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.97; p.vy *= 0.97;
      p.life -= 0.012;
    }
    this.gfx.drawParticles(this.deathParticles, sx, sy);

    /* overlay text — created once */
    if (this.deathTimer > 350 && !this.goText) {
      this.goText = this.add.text(W / 2, H / 2 - 50, 'GAME OVER', {
        fontSize: '30px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(0).setDepth(20);

      this.goScore = this.add.text(W / 2, H / 2, 'Score: ' + this.score, {
        fontSize: '22px', fontFamily: 'monospace', color: '#888899'
      }).setOrigin(0.5).setAlpha(0).setDepth(20);

      const hiLabel = this.newBest ? ('NEW BEST: ' + this.hiScore) : ('Best: ' + this.hiScore);
      this.goHi = this.add.text(W / 2, H / 2 + 28, hiLabel, {
        fontSize: '13px', fontFamily: 'monospace', color: this.newBest ? '#ffcc00' : '#555577'
      }).setOrigin(0.5).setAlpha(0).setDepth(20);

      if (this.maxCombo > 2) {
        this.goCombo = this.add.text(W / 2, H / 2 + 52,
          'Max combo: \u00d7' + Math.min(this.maxCombo, MAX_COMBO_MULTI), {
            fontSize: '11px', fontFamily: 'monospace', color: '#ffaa00'
          }).setOrigin(0.5).setAlpha(0).setDepth(20);
      }

      /* level reached */
      if (this.currentTheme > 0) {
        const tName = THEMES[this.currentTheme % THEMES.length].name.toUpperCase();
        this.add.text(W / 2, H / 2 + 75, 'Reached: ' + tName + ' (Lv.' + (this.currentTheme + 1) + ')', {
          fontSize: '10px', fontFamily: 'monospace', color: '#555577'
        }).setOrigin(0.5).setAlpha(0).setDepth(20);
      }

      this.tweens.add({ targets: this.goText,  alpha: 1, duration: 300 });
      this.tweens.add({ targets: this.goScore, alpha: 1, duration: 300, delay: 80 });
      this.tweens.add({ targets: this.goHi,    alpha: 1, duration: 300, delay: 160 });
      if (this.goCombo) {
        this.tweens.add({ targets: this.goCombo, alpha: 1, duration: 300, delay: 240 });
      }
    }

    if (this.deathTimer > 1000 && !this.retryText) {
      this.retryText = this.add.text(W / 2, H / 2 + 120, 'TAP TO RETRY', {
        fontSize: '13px', fontFamily: 'monospace', color: '#666677'
      }).setOrigin(0.5).setDepth(20);
      this.tweens.add({ targets: this.retryText, alpha: 0.25, duration: 550, yoyo: true, repeat: -1 });
    }

    /* restart */
    if (this.deathTimer > 1000 && this.input_.anyPressed()) {
      this.scene.start('Game');
    }
  }
}
