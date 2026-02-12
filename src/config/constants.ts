/* Game dimensions */
export const W = 400;
export const H = 640;
export const HALF = W / 2;

/* Player */
export const DOT_R = 9;
export const DOT_Y = H - 130;
export const ACCEL = 0.6;
export const FRICTION = 0.82;
export const MAX_VEL = 7;
export const TRAIL_LEN = 10;

/* Obstacles */
export const GAP_INITIAL = 72;
export const GAP_MIN = 36;
export const WALL_H = 14;
export const SPACING_INITIAL = 210;
export const SPACING_MIN = 115;
export const SPEED_INITIAL = 1.8;
export const SPEED_GROWTH = 0.012;      // applied to sqrt(dist)
export const GAP_SHRINK = 0.13;         // applied to sqrt(dist)
export const SPACING_SHRINK = 0.34;     // applied to sqrt(dist)
export const OFFSET_GROWTH = 0.15;      // applied to sqrt(dist)

/* Combo */
export const MAX_COMBO_MULTI = 10;

/* Portal gate markers */
export const GATE_W = 3;
export const GATE_EXTEND = 10;

/* Colors */
export const C_BG      = 0x05050a;
export const C_LEFT    = 0x00e8ff;
export const C_RIGHT   = 0xff0099;
export const C_WALL    = 0x151528;
export const C_EDGE    = 0x2a2a4a;
export const C_DIVIDER = 0x0e0e1c;
export const C_GRID    = 0x08081a;

/* Background themes — cycle every 100 points */
export interface Theme {
  name: string;
  bg: number;
  grid: number;
  wall: number;
  edge: number;
  divider: number;
}

export const THEMES: readonly Theme[] = [
  { name: 'void',    bg: 0x05050a, grid: 0x08081a, wall: 0x151528, edge: 0x2a2a4a, divider: 0x0e0e1c },
  { name: 'abyss',   bg: 0x050a12, grid: 0x081a2a, wall: 0x102040, edge: 0x1a3a6a, divider: 0x0a1828 },
  { name: 'inferno', bg: 0x0f0505, grid: 0x1a0808, wall: 0x281515, edge: 0x4a2a2a, divider: 0x1c0e0e },
  { name: 'toxic',   bg: 0x050a05, grid: 0x081a08, wall: 0x152815, edge: 0x2a4a2a, divider: 0x0e1c0e },
  { name: 'plasma',  bg: 0x0a050f, grid: 0x140a1a, wall: 0x201530, edge: 0x3a2a5a, divider: 0x140e1c },
  { name: 'solar',   bg: 0x0f0a05, grid: 0x1a1408, wall: 0x282015, edge: 0x4a3a2a, divider: 0x1c180e },
  { name: 'frost',   bg: 0x050a0f, grid: 0x081420, wall: 0x152035, edge: 0x2a3a5a, divider: 0x0e141c },
  { name: 'blood',   bg: 0x0a0308, grid: 0x18061a, wall: 0x280a20, edge: 0x4a1a3a, divider: 0x1c0818 },
  { name: 'neon',    bg: 0x030a0f, grid: 0x061828, wall: 0x0a2540, edge: 0x1a4a6a, divider: 0x081420 },
  { name: 'ember',   bg: 0x0f0803, grid: 0x1a1206, wall: 0x28200a, edge: 0x4a381a, divider: 0x1c1408 },
] as const;

/* Flicker / distortion */
export const FLICKER_START_SCORE = 150;
export const FLICKER_INTERVAL_MIN = 3000;
export const FLICKER_INTERVAL_MAX = 8000;
export const FLICKER_DURATION = 180;

/* Ghost power-up */
export const GHOST_MIN_LEVEL = 5;
export const GHOST_SPAWN_CHANCE = 0.08;
export const GHOST_RADIUS = 12;
export const GHOST_DURATION = 1000;
export const C_GHOST = 0xffffff;

/* Storage */
export const HI_SCORE_KEY = 'dual_hi';
