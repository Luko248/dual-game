import Phaser from 'phaser';
import {
  W, H, HALF, DOT_R, DOT_Y, WALL_H,
  ACCEL, FRICTION, MAX_VEL, TRAIL_LEN,
  SPEED_INITIAL, SPEED_GROWTH, MAX_COMBO_MULTI,
  C_BG, C_LEFT, C_RIGHT, HI_SCORE_KEY, HI_LEVEL_KEY,
  THEMES, FLICKER_START_SCORE, FLICKER_INTERVAL_MIN,
  FLICKER_INTERVAL_MAX, FLICKER_DURATION,
  GHOST_RADIUS
} from '../config/constants';
import { sfx } from '../engine/SoundEngine';
import { InputManager } from '../engine/InputManager';
import { ObstaclePool } from '../engine/ObstaclePool';
import { Renderer, DeathParticle } from '../engine/Renderer';
import { uiManager } from '../engine/UIManager';

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
  private hiLevel!: number;
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

  /* death */
  private deathParticles!: DeathParticle[];
  private deathTimer!: number;
  private deadSide!: 'left' | 'right' | null;
  private goShown!: boolean;
  private retryShown!: boolean;

  /* subsystems */
  private input_!: InputManager;
  private pool!: ObstaclePool;
  private gfx!: Renderer;

  constructor() {
    super('Game');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C_BG);

    /* player state */
    this.leftDot  = { x: HALF / 2,        vx: 0 };
    this.rightDot = { x: HALF + HALF / 2,  vx: 0 };

    /* scrolling / score */
    this.speed = SPEED_INITIAL;
    this.dist  = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.alive = true;
    this.hiScore = parseInt(localStorage.getItem(HI_SCORE_KEY) || '0', 10);
    this.hiLevel = parseInt(localStorage.getItem(HI_LEVEL_KEY) || '0', 10);
    this.newBest = false;
    this.shakeAmt = 0;

    /* theme tracking */
    this.currentTheme    = 0;
    this.lastThemeTrigger = 0;

    /* flicker state */
    this.flickerPhase  = 0;
    this.flickerTimer  = 0;
    this.nextFlickerAt = this._randomFlickerDelay();

    /* trails */
    this.leftTrail  = [];
    this.rightTrail = [];

    /* ghost power-up */
    this.ghostActive = false;

    /* death */
    this.deathParticles = [];
    this.deathTimer     = 0;
    this.deadSide       = null;
    this.goShown        = false;
    this.retryShown     = false;

    /* subsystems */
    this.input_ = new InputManager(this);
    this.pool   = new ObstaclePool();
    this.pool.seed(DOT_Y - 250, this.dist);

    this.gfx = new Renderer({
      bg:     this.add.graphics(),
      walls:  this.add.graphics(),
      trails: this.add.graphics(),
      dots:   this.add.graphics(),
      fx:     this.add.graphics()
    });

    /* show HUD overlay */
    uiManager.showHUD();
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

    const dt  = delta / 16.667;
    const dir = this.input_.direction();

    /* -- physics -- */
    this.leftDot.vx  += dir * ACCEL * dt;
    this.rightDot.vx += -dir * ACCEL * dt;
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
    if (this.leftTrail.length  > TRAIL_LEN) this.leftTrail.shift();
    if (this.rightTrail.length > TRAIL_LEN) this.rightTrail.shift();

    /* -- scroll -- */
    this.speed = SPEED_INITIAL + Math.sqrt(this.dist) * SPEED_GROWTH;
    const scroll = this.speed * dt;
    this.dist += scroll;
    this.pool.scroll(scroll, this.dist);

    /* -- collision & scoring -- */
    for (const o of this.pool.items) {
      const inBand = o.y > DOT_Y - WALL_H / 2 - DOT_R && o.y < DOT_Y + WALL_H / 2 + DOT_R;

      if (inBand && !o.ghostPassed) {
        const leftHit  = this.hitTest(this.leftDot.x,  o.leftGapX,  o.gapW);
        const rightHit = this.hitTest(this.rightDot.x, o.rightGapX, o.gapW);

        if (leftHit || rightHit) {
          if (this.ghostActive) {
            this.ghostActive = false;
            o.ghostPassed    = true;
          } else {
            this.die(leftHit ? 'left' : 'right');
            return;
          }
        }

        /* near-miss */
        if (!this.ghostActive && !o.nearFlag) {
          const lD   = Math.abs(this.leftDot.x  - o.leftGapX);
          const rD   = Math.abs(this.rightDot.x - o.rightGapX);
          const edge = o.gapW / 2 - DOT_R;
          if (lD > edge - 6 || rD > edge - 6) {
            o.nearFlag    = true;
            this.shakeAmt = 3;
            sfx.play('near');
          }
        }
      }

      /* -- ghost pickup -- */
      if (o.ghostX != null && o.ghostY != null && !o.ghostCollected) {
        const gr2 = (GHOST_RADIUS + DOT_R) * (GHOST_RADIUS + DOT_R);
        const ldx = this.leftDot.x  - o.ghostX;
        const ldy = DOT_Y - o.ghostY;
        const rdx = this.rightDot.x - o.ghostX;
        const rdy = DOT_Y - o.ghostY;
        if (ldx * ldx + ldy * ldy < gr2 || rdx * rdx + rdy * rdy < gr2) {
          o.ghostCollected = true;
          this.ghostActive = true;
          sfx.play('combo');
          uiManager.showGhostAlert();
        }
      }

      if (!o.passed && o.y > DOT_Y + WALL_H / 2 + DOT_R) {
        o.passed = true;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.score   += Math.min(this.combo, MAX_COMBO_MULTI);
        sfx.play('pass');

        if (this.score > this.hiScore && !this.newBest) {
          this.newBest = true;
          uiManager.showNewBest();
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

      const theme = THEMES[themeIndex % THEMES.length];
      uiManager.showBanner(theme.name, themeIndex + 1);
    }

    /* -- flicker effect -- */
    if (this.score >= FLICKER_START_SCORE) {
      this.flickerTimer += delta;
      if (this.flickerPhase > 0) {
        this.flickerPhase      = Math.max(0, this.flickerPhase - delta / FLICKER_DURATION);
        this.gfx.flickering    = this.flickerPhase > 0;
      } else if (this.flickerTimer >= this.nextFlickerAt) {
        this.flickerPhase      = 1;
        this.flickerTimer      = 0;
        this.nextFlickerAt     = this._randomFlickerDelay();
        this.gfx.flickering    = true;
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
    this.gfx.drawDots(this.leftDot.x, this.rightDot.x, DOT_Y, time, sx, sy, this.ghostActive);

    /* direction hint arrows — fade out as score increases */
    const hintAlpha = Math.max(0, 1 - this.score / 50);
    uiManager.setHintAlpha(hintAlpha);
    if (hintAlpha > 0) {
      this.gfx.drawDirectionHints(time, hintAlpha);
    }

    if (this.flickerPhase > 0) {
      this.gfx.drawFlicker(this.flickerPhase);
    }

    /* -- HUD update -- */
    uiManager.updateScore(this.score);
    uiManager.updateCombo(this.combo);
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
    this.alive    = false;
    this.deadSide = which;
    this.combo    = 0;
    this.gfx.flickering = false;
    this.flickerPhase   = 0;
    sfx.play('die');
    this.shakeAmt = 10;

    /* save high score */
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      localStorage.setItem(HI_SCORE_KEY, this.score.toString());
    }

    /* save best level (1-indexed) */
    const levelReached = this.currentTheme + 1;
    if (levelReached > this.hiLevel) {
      this.hiLevel = levelReached;
      localStorage.setItem(HI_LEVEL_KEY, levelReached.toString());
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
    this.shakeAmt   *= 0.92;

    const sx = (Math.random() - 0.5) * this.shakeAmt;
    const sy = (Math.random() - 0.5) * this.shakeAmt;

    this.gfx.clearAll();
    this.gfx.drawBg(this.dist, time, sx, sy, this.cameras.main);
    this.gfx.drawObstacles(this.pool.items, sx, sy, time);

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
      p.x  += p.vx; p.y  += p.vy;
      p.vx *= 0.97; p.vy *= 0.97;
      p.life -= 0.012;
    }
    this.gfx.drawParticles(this.deathParticles, sx, sy);

    /* game over screen — shown once after 350ms */
    if (this.deathTimer > 350 && !this.goShown) {
      this.goShown = true;
      uiManager.showGameOver(
        this.score,
        this.hiScore,
        this.newBest,
        this.maxCombo,
        this.currentTheme
      );
    }

    /* retry prompt — shown after 1000ms */
    if (this.deathTimer > 1000 && !this.retryShown) {
      this.retryShown = true;
      uiManager.showRetry();
    }

    /* restart */
    if (this.deathTimer > 1000 && this.input_.anyPressed()) {
      this.scene.start('Game');
    }
  }
}
