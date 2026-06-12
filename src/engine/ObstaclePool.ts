import Phaser from 'phaser';
import {
  HALF, W, DOT_R,
  GAP_INITIAL, GAP_MIN, GAP_SHRINK,
  SPACING_INITIAL, SPACING_MIN, SPACING_SHRINK,
  OFFSET_GROWTH, H,
  GHOST_MIN_LEVEL, GHOST_SPAWN_CHANCE,
  BULLET_MIN_LEVEL, BULLET_SPAWN_CHANCE,
  ADVANCED_OFFSET_MULT
} from '../config/constants';

export interface Obstacle {
  y: number;
  leftGapX: number;
  rightGapX: number;
  gapW: number;
  passed: boolean;
  nearFlag: boolean;
  ghostPassed?: boolean;  // wall was phased through via ghost
  ghostX?: number;        // x-center of ghost pickup
  ghostY?: number;        // y-center (between this wall and the one below)
  ghostCollected?: boolean;
  bulletX?: number;       // x-center of bullet time pickup
  bulletY?: number;       // y-center
  bulletCollected?: boolean;
}

/**
 * Spawns, scrolls, culls, and exposes obstacle data.
 */
export class ObstaclePool {
  items: Obstacle[] = [];
  private nextY = 0;

  /** Current displayed level (1-based, = floor(score/100)+1). Updated by the
      scene each frame and used to gate level-restricted power-ups. */
  level = 1;

  /** Advanced mode widens how far the two lanes' gaps can diverge. */
  advanced = false;

  /** Call once in create() to seed obstacles above the viewport */
  seed(startY: number, dist: number): void {
    let y = startY;
    while (y > -200) {
      this.spawn(y, dist);
      y -= this.spacing(dist);
    }
    this.nextY = y;
  }

  gap(dist: number): number {
    return Math.max(GAP_MIN, GAP_INITIAL - Math.sqrt(dist) * GAP_SHRINK);
  }

  spacing(dist: number): number {
    return Math.max(SPACING_MIN, SPACING_INITIAL - Math.sqrt(dist) * SPACING_SHRINK);
  }

  spawn(y: number, dist: number): void {
    const gap = this.gap(dist);
    const m = gap / 2 + 8;

    const leftGapX = Phaser.Math.Between(m, HALF - m);
    const mirror = W - leftGapX;
    /* Normal mode keeps gaps loosely mirrored; advanced decouples the lanes,
       so it both widens the divergence and lifts the mirror-coupling cap. */
    const cap = this.advanced ? (HALF - m) * 0.9 : (gap - 2 * DOT_R) * 0.7;
    const offMult = this.advanced ? ADVANCED_OFFSET_MULT : 1;
    const maxOff = Math.min(cap, (3 + Math.sqrt(dist) * OFFSET_GROWTH) * offMult);
    const offset = (Math.random() * 2 - 1) * maxOff;
    const rightGapX = Phaser.Math.Clamp(mirror + offset, HALF + m, W - m);

    const ob: Obstacle = { y, leftGapX, rightGapX, gapW: gap, passed: false, nearFlag: false };

    const distLevel = Math.floor(dist / 600);
    const sp = this.spacing(dist);

    /* ghost power-up — floats in open space below this wall */
    if (distLevel >= GHOST_MIN_LEVEL && Math.random() < GHOST_SPAWN_CHANCE) {
      ob.ghostY = y + sp * 0.5;
      const inLeft = Math.random() < 0.5;
      ob.ghostX = inLeft
        ? Phaser.Math.Between(DOT_R + 10, HALF - DOT_R - 10)
        : Phaser.Math.Between(HALF + DOT_R + 10, W - DOT_R - 10);
      ob.ghostCollected = false;
    }

    /* bullet time power-up — only if no ghost on this obstacle, and only once
       the player has reached the displayed level gate (game is too slow before). */
    if (ob.ghostX == null && this.level >= BULLET_MIN_LEVEL && Math.random() < BULLET_SPAWN_CHANCE) {
      ob.bulletY = y + sp * 0.5;
      const inLeft = Math.random() < 0.5;
      ob.bulletX = inLeft
        ? Phaser.Math.Between(DOT_R + 10, HALF - DOT_R - 10)
        : Phaser.Math.Between(HALF + DOT_R + 10, W - DOT_R - 10);
      ob.bulletCollected = false;
    }

    this.items.push(ob);
  }

  /** Move everything down, spawn new rows, cull off-screen */
  scroll(amount: number, dist: number): void {
    /* Single pass: scroll, then in-place compact survivors so we don't
       allocate a fresh array per frame. Items spawn near the top and
       drift down monotonically, so a simple write-pointer is enough. */
    const items = this.items;
    const cullY = H + 40;
    let w = 0;
    for (let r = 0; r < items.length; r++) {
      const o = items[r];
      o.y += amount;
      if (o.ghostY != null)  o.ghostY  += amount;
      if (o.bulletY != null) o.bulletY += amount;
      if (o.y < cullY) {
        if (w !== r) items[w] = o;
        w++;
      }
    }
    items.length = w;

    this.nextY += amount;
    while (this.nextY > -60) {
      this.nextY -= this.spacing(dist);
      this.spawn(this.nextY, dist);
    }
  }
}
