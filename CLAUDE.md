# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
bun install          # Install dependencies
bun run dev          # Start Vite dev server on port 3000 (auto-opens browser)
bun run build        # Production build to dist/
bun run preview      # Preview production build locally
```

No test runner or linter is configured. TypeScript checking uses `strict: true` in tsconfig.json (noEmit — Vite handles transpilation).

## Architecture

**DUAL** is a Phaser 3 reflex arcade game (TypeScript, Vite, PWA). Two mirrored dots navigate through endless scrolling gates — moving left spreads both dots apart, moving right gathers them. The right dot always receives the opposite velocity of the left.

### Source Layout

- **`src/main.ts`** — Phaser game bootstrap (400×640 FIT viewport) + service worker registration
- **`src/config/constants.ts`** — All tunable game parameters: dimensions, physics, difficulty curves, 8 color themes, scoring
- **`src/engine/`** — Isolated subsystems:
  - `InputManager` — Unified keyboard (arrows/A/D/space) + multi-touch (left-half = spread, right-half = gather)
  - `ObstaclePool` — Object-pooled obstacle spawning with procedural difficulty scaling (gap width, spacing, speed all tighten over distance)
  - `Renderer` — Layered Phaser Graphics drawing (bg → walls → trails → dots → fx). Handles themed backgrounds, portal gate effects, flicker/glitch, glow trails, death particles
  - `SoundEngine` — Web Audio synth singleton (5 procedural sounds, no audio files). Global `sfx` instance, fails silently
- **`src/scenes/`** — Phaser scenes:
  - `MenuScene` — Title screen, demo dots, high score display
  - `GameScene` — Main loop: physics → trails → scrolling → collision → theme transitions → flicker effects → rendering. Manages death sequence with burst particles and restart

### Key Patterns

- **Mirrored physics**: Left dot velocity is applied; right dot gets the inverse. Both collide independently against their lane's obstacles.
- **Progressive difficulty**: Speed, gap width, spacing, and gap offset all scale with distance traveled (constants define min/max curves).
- **Theme cycling**: 8 themes rotate every 100 points with screen shake. Flicker effects activate at score 150+.
- **Combo scoring**: Consecutive passes multiply points (max 10×). Near-misses (within 6px) trigger audio but don't break combo.
- **No external assets**: All sounds are synthesized via Web Audio. Icons are inline SVGs.

### PWA

Service worker (`public/sw.js`) uses cache-first for assets, network-first for navigation. Cache key: `dual-v1`. Manifest targets fullscreen portrait mode.
