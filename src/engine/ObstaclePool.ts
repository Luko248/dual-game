import Phaser from 'phaser';
import {
  HALF, W, DOT_R,
  GAP_INITIAL, GAP_MIN, GAP_SHRINK,
  SPACING_INITIAL, SPACING_MIN, SPACING_SHRINK,
  OFFSET_GROWTH, H,
  GHOST_MIN_LEVEL, GHOST_SPAWN_CHANCE
} from '../config/constants';

export interface Obstacle {
  y: number;
  leftGapX: number;
  rightGapX: number;
  gapW: number;
  passed: boolean;
  nearFlag: boolean;
  ghostX?: number;       // x-center of ghost pickup (left or right lane)
  ghostLane?: 'left' | 'right';
  ghostCollected?: boolean;
}

/**
 * Spawns, scrolls, culls, and exposes obstacle data.
 */
export class ObstaclePool {
  items: Obstacle[] = [];
  private nextY = 0;

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
    const maxOff = Math.min((gap - 2 * DOT_R) * 0.7, 3 + Math.sqrt(dist) * OFFSET_GROWTH);
    const offset = (Math.random() * 2 - 1) * maxOff;
    const rightGapX = Phaser.Math.Clamp(mirror + offset, HALF + m, W - m);

    const ob: Obstacle = { y, leftGapX, rightGapX, gapW: gap, passed: false, nearFlag: false };

    /* ghost power-up — spawns in gap center of a random lane */
    const level = Math.floor(dist / 600);   // approximate score-to-dist mapping
    if (level >= GHOST_MIN_LEVEL && Math.random() < GHOST_SPAWN_CHANCE) {
      const lane = Math.random() < 0.5 ? 'left' : 'right';
      ob.ghostLane = lane;
      ob.ghostX = lane === 'left' ? leftGapX : rightGapX;
      ob.ghostCollected = false;
    }

    this.items.push(ob);
  }

  /** Move everything down, spawn new rows, cull off-screen */
  scroll(amount: number, dist: number): void {
    for (const o of this.items) o.y += amount;

    this.nextY += amount;
    while (this.nextY > -60) {
      this.nextY -= this.spacing(dist);
      this.spawn(this.nextY, dist);
    }

    this.items = this.items.filter(o => o.y < H + 40);
  }
}
