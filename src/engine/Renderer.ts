import {
  W, H, HALF, DOT_R, WALL_H, GATE_W, GATE_EXTEND,
  C_LEFT, C_RIGHT, C_GHOST, GHOST_RADIUS,
  THEMES, Theme
} from '../config/constants';
import type { Obstacle } from './ObstaclePool';

export interface GraphicsLayers {
  bg: Phaser.GameObjects.Graphics;
  walls: Phaser.GameObjects.Graphics;
  trails: Phaser.GameObjects.Graphics;
  dots: Phaser.GameObjects.Graphics;
  fx: Phaser.GameObjects.Graphics;
}

/**
 * All drawing logic — keeps scenes lean.
 * Operates on Phaser.Graphics layers passed in at construction.
 * Supports themed backgrounds and flicker effects.
 */
export class Renderer {
  l: GraphicsLayers;
  private theme: Theme = THEMES[0];
  flickering = false;
  private themeFlash = 0;

  constructor(layers: GraphicsLayers) {
    this.l = layers;
  }

  setTheme(index: number): void {
    this.theme = THEMES[index % THEMES.length];
    this.themeFlash = 1;
  }

  clearAll(): void {
    for (const k in this.l) this.l[k as keyof GraphicsLayers].clear();
  }

  /* ---- background ---- */
  drawBg(dist: number, time: number, sx: number, sy: number, camera?: Phaser.Cameras.Scene2D.Camera): void {
    const bg = this.l.bg;
    const t = this.theme;

    /* theme-transition white flash */
    if (this.themeFlash > 0) {
      bg.fillStyle(0xffffff, this.themeFlash * 0.15);
      bg.fillRect(0, 0, W, H);
      this.themeFlash = Math.max(0, this.themeFlash - 0.02);
    }

    /* scrolling grid */
    bg.lineStyle(1, t.grid, this.flickering ? 0.7 : 0.4);
    const off = (dist * 2) % 48;
    for (let y = off; y < H; y += 48) {
      bg.moveTo(sx, y + sy);
      bg.lineTo(W + sx, y + sy);
    }
    bg.strokePath();

    /* vertical accents at quarter marks */
    bg.lineStyle(1, t.grid, 0.15);
    bg.moveTo(W * 0.25 + sx, sy);
    bg.lineTo(W * 0.25 + sx, H + sy);
    bg.moveTo(W * 0.75 + sx, sy);
    bg.lineTo(W * 0.75 + sx, H + sy);
    bg.strokePath();

    /* centre divider */
    const divPulse = 0.2 + 0.06 * Math.sin(time * 0.003);
    bg.lineStyle(this.flickering ? 2 : 1, t.divider, this.flickering ? 0.6 : divPulse);
    bg.moveTo(HALF + sx, sy);
    bg.lineTo(HALF + sx, H + sy);
    bg.strokePath();

    /* set camera bg color to theme */
    if (camera) camera.setBackgroundColor(t.bg);
  }

  /* ---- obstacles with portal gates ---- */
  drawObstacles(obstacles: Obstacle[], sx: number, sy: number, time: number): void {
    for (const o of obstacles) this.drawWall(o, sx, sy, time);
  }

  private drawWall(o: Obstacle, sx: number, sy: number, time: number): void {
    const y = o.y + sy;
    const hg = o.gapW / 2;
    const t = this.theme;

    /* left lane */
    this._wallPair(sx, y, o.leftGapX, hg, 0, HALF, C_LEFT, t, time);
    /* right lane */
    this._wallPair(sx, y, o.rightGapX, hg, HALF, W, C_RIGHT, t, time);
  }

  private _wallPair(sx: number, y: number, gapX: number, hg: number, laneL: number, laneR: number, glowCol: number, t: Theme, time: number): void {
    const g = this.l.walls;
    const gapL = gapX - hg;
    const gapR = gapX + hg;

    /* solid walls */
    if (gapL > laneL) {
      g.fillStyle(t.wall, 0.85);
      g.fillRect(laneL + sx, y - WALL_H / 2, gapL - laneL, WALL_H);
      g.fillStyle(t.edge, 0.7);
      g.fillRect(gapL - 2 + sx, y - WALL_H / 2, 2, WALL_H);
    }
    if (gapR < laneR) {
      g.fillStyle(t.wall, 0.85);
      g.fillRect(gapR + sx, y - WALL_H / 2, laneR - gapR, WALL_H);
      g.fillStyle(t.edge, 0.7);
      g.fillRect(gapR + sx, y - WALL_H / 2, 2, WALL_H);
    }

    /* ---- PORTAL GATE — bright vertical markers at gap edges ---- */
    const gatePulse = 0.6 + 0.3 * Math.sin(time * 0.006 + gapX * 0.1);
    const ext = GATE_EXTEND;

    /* left edge of gap — bright bar */
    g.fillStyle(glowCol, gatePulse);
    g.fillRect(gapL + sx, y - WALL_H / 2 - ext, GATE_W, WALL_H + ext * 2);

    /* right edge of gap — bright bar */
    g.fillStyle(glowCol, gatePulse);
    g.fillRect(gapR - GATE_W + sx, y - WALL_H / 2 - ext, GATE_W, WALL_H + ext * 2);

    /* inner glow between gate posts */
    g.fillStyle(glowCol, 0.08 + 0.04 * Math.sin(time * 0.008));
    g.fillRect(gapL + sx, y - WALL_H / 2 - 2, gapR - gapL, WALL_H + 4);

    /* bright horizontal accent lines at gate top & bottom */
    g.fillStyle(glowCol, gatePulse * 0.5);
    g.fillRect(gapL + sx, y - WALL_H / 2 - 1, gapR - gapL, 1);
    g.fillRect(gapL + sx, y + WALL_H / 2, gapR - gapL, 1);

    /* diamond/arrow indicator at gap center — points toward gap */
    const cx = gapX + sx;
    const arrowAlpha = 0.25 + 0.15 * Math.sin(time * 0.005 + gapX);
    g.fillStyle(glowCol, arrowAlpha);
    g.fillTriangle(
      cx - 4, y - WALL_H / 2 - ext - 4,
      cx + 4, y - WALL_H / 2 - ext - 4,
      cx,     y - WALL_H / 2 - ext + 3
    );
  }

  /* ---- flicker overlay ---- */
  drawFlicker(flickerPhase: number): void {
    if (flickerPhase <= 0) return;
    const fx = this.l.fx;

    /* scanline-style horizontal bars */
    const barAlpha = 0.12 * flickerPhase;
    fx.fillStyle(0xffffff, barAlpha);
    const offset = (Date.now() * 0.3) % 12;
    for (let y = offset; y < H; y += 6) {
      fx.fillRect(0, y, W, 2);
    }

    /* brief color inversion flash */
    if (flickerPhase > 0.7) {
      fx.fillStyle(0xffffff, 0.08);
      fx.fillRect(0, 0, W, H);
    }

    /* random horizontal glitch bars */
    if (flickerPhase > 0.3) {
      const count = Math.floor(flickerPhase * 5);
      for (let i = 0; i < count; i++) {
        const gy = Math.random() * H;
        const gh = 2 + Math.random() * 6;
        const gx = (Math.random() - 0.5) * 20;
        fx.fillStyle(Math.random() > 0.5 ? C_LEFT : C_RIGHT, 0.1 * flickerPhase);
        fx.fillRect(gx, gy, W, gh);
      }
    }
  }

  /* ---- trails ---- */
  drawTrails(leftTrail: number[], rightTrail: number[], dotY: number, sx: number, sy: number): void {
    this._trail(leftTrail, C_LEFT, dotY, sx, sy);
    this._trail(rightTrail, C_RIGHT, dotY, sx, sy);
  }

  private _trail(arr: number[], color: number, dotY: number, sx: number, sy: number): void {
    const n = arr.length;
    const g = this.l.trails;
    for (let i = 0; i < n; i++) {
      g.fillStyle(color, (i / n) * 0.2);
      g.fillCircle(arr[i] + sx, dotY + sy, DOT_R * (i / n) * 0.55);
    }
  }

  /* ---- player dots ---- */
  drawDots(lx: number, rx: number, dotY: number, time: number, sx: number, sy: number): void {
    const pulse = 1 + 0.06 * Math.sin(time * 0.007);
    this.drawDot(lx + sx, dotY + sy, DOT_R * pulse, C_LEFT);
    this.drawDot(rx + sx, dotY + sy, DOT_R * pulse, C_RIGHT);
  }

  private drawDot(x: number, y: number, r: number, color: number): void {
    const g = this.l.dots;
    g.fillStyle(color, 0.12);  g.fillCircle(x, y, r * 2.2);
    g.fillStyle(color, 0.28);  g.fillCircle(x, y, r * 1.45);
    g.fillStyle(color, 1);     g.fillCircle(x, y, r);
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(x - r * 0.22, y - r * 0.22, r * 0.38);
  }

  /* ---- direction indicators at bottom ---- */
  drawDirectionHints(time: number, alpha: number): void {
    const g = this.l.fx;
    const y = H - 38;
    const a = alpha * (0.25 + 0.08 * Math.sin(time * 0.003));

    /* LEFT side — spread arrows: ← → pointing outward */
    const lx = W * 0.25;
    /* left-pointing arrow */
    g.fillStyle(C_LEFT, a);
    g.fillTriangle(lx - 18, y, lx - 6, y - 6, lx - 6, y + 6);
    /* right-pointing arrow */
    g.fillStyle(C_RIGHT, a);
    g.fillTriangle(lx + 18, y, lx + 6, y - 6, lx + 6, y + 6);
    /* label */
    // drawn as small dots between arrows to suggest "spread"

    /* RIGHT side — gather arrows: → ← pointing inward */
    const rx = W * 0.75;
    /* right-pointing arrow (coming from left) */
    g.fillStyle(C_LEFT, a);
    g.fillTriangle(rx - 6, y, rx - 18, y - 6, rx - 18, y + 6);
    /* left-pointing arrow (coming from right) */
    g.fillStyle(C_RIGHT, a);
    g.fillTriangle(rx + 6, y, rx + 18, y - 6, rx + 18, y + 6);
  }

  /* ---- ghost power-ups ---- */
  drawGhosts(obstacles: Obstacle[], sx: number, sy: number, time: number): void {
    const g = this.l.fx;
    for (const o of obstacles) {
      if (o.ghostX == null || o.ghostCollected) continue;
      const x = o.ghostX + sx;
      const y = o.y + sy;
      const pulse = 0.5 + 0.3 * Math.sin(time * 0.008);
      const r = GHOST_RADIUS + 2 * Math.sin(time * 0.006);

      /* outer glow */
      g.fillStyle(C_GHOST, 0.08 * pulse);
      g.fillCircle(x, y, r * 2.5);
      /* mid glow */
      g.fillStyle(C_GHOST, 0.18 * pulse);
      g.fillCircle(x, y, r * 1.5);
      /* core */
      g.fillStyle(C_GHOST, 0.55 * pulse);
      g.fillCircle(x, y, r);
      /* bright center */
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(x, y, r * 0.4);
    }
  }

  /* ---- ghost invincibility glow on dots ---- */
  drawGhostAura(lx: number, rx: number, dotY: number, time: number, sx: number, sy: number, alpha: number): void {
    const g = this.l.dots;
    const pulse = 0.4 + 0.3 * Math.sin(time * 0.012);
    const a = pulse * alpha;
    const r = DOT_R * 2.8;
    g.fillStyle(C_GHOST, a * 0.15);
    g.fillCircle(lx + sx, dotY + sy, r);
    g.fillCircle(rx + sx, dotY + sy, r);
    g.fillStyle(C_GHOST, a * 0.35);
    g.fillCircle(lx + sx, dotY + sy, DOT_R * 1.6);
    g.fillCircle(rx + sx, dotY + sy, DOT_R * 1.6);
  }

  /* ---- dark overlay (used on death) ---- */
  drawOverlay(alpha: number): void {
    const g = this.l.fx;
    g.fillStyle(0x000000, alpha);
    g.fillRect(0, 0, W, H);
  }

  /* ---- death particles ---- */
  drawParticles(particles: DeathParticle[], sx: number, sy: number): void {
    const g = this.l.fx;
    for (const p of particles) {
      if (p.life > 0) {
        g.fillStyle(p.color, p.life);
        g.fillCircle(p.x + sx, p.y + sy, 3.5 * p.life);
      }
    }
  }
}

export interface DeathParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: number;
}
