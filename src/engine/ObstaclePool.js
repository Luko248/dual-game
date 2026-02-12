import Phaser from 'phaser';
import {
  HALF, W, DOT_R,
  GAP_INITIAL, GAP_MIN, GAP_SHRINK,
  SPACING_INITIAL, SPACING_MIN, SPACING_SHRINK,
  OFFSET_GROWTH, H
} from '../config/constants.js';

/**
 * Spawns, scrolls, culls, and exposes obstacle data.
 * Each obstacle = { y, leftGapX, rightGapX, gapW, passed, nearFlag }
 */
export class ObstaclePool {
  constructor() {
    this.items = [];
    this.nextY = 0;
  }

  /** Call once in create() to seed obstacles above the viewport */
  seed(startY, dist) {
    let y = startY;
    while (y > -200) {
      this.spawn(y, dist);
      y -= this.spacing(dist);
    }
    this.nextY = y;
  }

  gap(dist) {
    return Math.max(GAP_MIN, GAP_INITIAL - dist * GAP_SHRINK);
  }

  spacing(dist) {
    return Math.max(SPACING_MIN, SPACING_INITIAL - dist * SPACING_SHRINK);
  }

  spawn(y, dist) {
    const gap = this.gap(dist);
    const m = gap / 2 + 8;

    const leftGapX = Phaser.Math.Between(m, HALF - m);
    const mirror = W - leftGapX;
    const maxOff = Math.min((gap - 2 * DOT_R) * 0.7, 3 + dist * OFFSET_GROWTH);
    const offset = (Math.random() * 2 - 1) * maxOff;
    const rightGapX = Phaser.Math.Clamp(mirror + offset, HALF + m, W - m);

    this.items.push({ y, leftGapX, rightGapX, gapW: gap, passed: false, nearFlag: false });
  }

  /** Move everything down, spawn new rows, cull off-screen */
  scroll(amount, dist) {
    for (const o of this.items) o.y += amount;

    this.nextY += amount;
    while (this.nextY > -60) {
      this.nextY -= this.spacing(dist);
      this.spawn(this.nextY, dist);
    }

    this.items = this.items.filter(o => o.y < H + 40);
  }
}
