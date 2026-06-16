# AGENTS.md

This file provides guidance to AI Agents when working with code in this repository.

## Build & Dev Commands

```bash
bun install          # Install dependencies
bun run dev          # Start Vite dev server on port 3000 (auto-opens browser)
bun run build        # Production build to dist/
bun run preview      # Preview production build locally
```

No test runner or linter is configured. TypeScript checking uses `strict: true` in tsconfig.json (noEmit — Vite handles transpilation).

## Architecture

**DUAL** is a Phaser 3 reflex arcade game (TypeScript, Vite, PWA). Two dots navigate through endless scrolling gates in their own lanes. Each dot is steered independently by its own thumb joystick — there is no auto-movement and no mirrored physics.

### Source Layout

- **`src/main.ts`** — Phaser game bootstrap (400×640 FIT viewport) + service worker registration
- **`src/config/constants.ts`** — All tunable game parameters: dimensions, physics, difficulty curves, 10 color themes, scoring, power-ups
- **`src/engine/`** — Isolated subsystems:
  - `InputManager` — Two-thumb virtual joysticks. Left half of screen drives `leftDir()`, right half drives `rightDir()` (each −1..+1). Calls `scene.input.addPointer(1)` so both touches track at once. Updates the `#joystick-*-knob` DOM elements in real time. Keyboard fallback (arrows/A/D/Space) maps to spread/gather across both dots.
  - `ObstaclePool` — Object-pooled obstacle spawning with procedural difficulty scaling (gap width, spacing, speed all tighten over distance). Spawns ghost and bullet-time pickups in the open space below selected walls.
  - `Renderer` — Layered Phaser Graphics drawing (bg → walls → trails → dots → fx). Handles themed backgrounds, portal gate effects, flicker/glitch, glow trails, death particles.
  - `SoundEngine` — Web Audio synth singleton (procedural sounds, no audio files). Global `sfx` instance, fails silently.
  - `UIManager` — Owns the HTML overlay (`#ui-inner`, fixed 400×640 virtual canvas scaled via CSS `svi`/`svb`). Switches between menu / HUD / leaderboard / game-over views, drives the intro demo class on `#game-hud`, and renders the bullet-walls and ghost-charges indicators.
  - `Leaderboard` — Provider-based score board (no backend of ours, no paid API). Defaults to a **local** localStorage board; switches to a **global PlayFab** board when `VITE_PLAYFAB_TITLE_ID` is set (client REST only — the Title ID is public, no secret key). One row per device UID; only the max score is kept (locally via `max()`, on PlayFab via statistic aggregation = Maximum). See `.env.example` for PlayFab setup.
- **`src/scenes/`** — Phaser scenes:
  - `MenuScene` — Title screen, demo dots, high score / level display.
  - `GameScene` — Main loop: physics → trails → scrolling → collision → theme transitions → flicker effects → rendering. Manages intro speed ramp, bullet-time speed transitions, and the death sequence with burst particles and restart.

### Key Patterns

- **Independent dot control**: Each dot's velocity is driven by its own joystick (`leftDir()` / `rightDir()`). Each dot is clamped to its own lane and collides independently against that lane's gate.
- **No auto-movement**: Dots stay still when both thumbs are lifted (friction decays residual velocity). There is no auto-spread fallback and no "pause spreading inside a gate" rule.
- **Progressive difficulty**: Speed, gap width, spacing, and gap offset all scale with `sqrt(distance)` (constants define min/max curves).
- **Intro phase**: First `INTRO_DURATION` (2.4s) uses `INTRO_SPEED_MULT` (0.5×) to ease the player in without feeling sluggish. The `#game-hud` carries an `intro-demo` class during this window so the joystick knobs auto-animate left-right as a control hint; the class is removed when the player first touches a joystick or when the timer expires.
- **Theme cycling**: 10 themes rotate every `LEVEL_POINTS` (1000) points with screen shake. Flicker effects activate at score `FLICKER_START_SCORE` (1500+).
- **Combo scoring**: Each gate scores `BASE_PASS_SCORE` (10) × the live combo multiplier (consecutive passes, capped at `MAX_COMBO_MULTI` = 10×), so a ×2 gate is worth double a ×1 gate. Near-misses (within 6px) trigger audio but don't break combo. (`LEVEL_POINTS` is 100× the base so the gates-per-level pacing is unchanged.)
- **Power-ups**:
  - **Ghost** (white concentric circle) — stacks; each charge phases through the next wall.
  - **Bullet time** (green dot) — only spawns from the displayed level `BULLET_MIN_LEVEL` (5) onward, since the early game is already slow. Slows scroll to `BULLET_SPEED_MULT` (0.5×) for `BULLET_WALL_COUNT` (2) wall passes, then ramps back to full speed over `BULLET_TRANSITION` (400ms). The HUD timer shows the *remaining wall count*, not seconds. (`ObstaclePool.level` is fed the live score-based level by `GameScene`.)
- **No external assets**: All sounds are synthesized via Web Audio. Icons are inline SVG / CSS shapes.

### Joystick UI

Two fixed rings sit at the bottom of the play area inside `#game-hud`:

- `#joystick-left` (cyan, centered ~(90, 590)) ↔ left dot
- `#joystick-right` (magenta, centered ~(310, 590)) ↔ right dot
- `.joystick-knob` is the inner indicator. Its `transform: translate(...)` is rewritten by `InputManager` on each pointer move; horizontal displacement is clamped to ±`JOYSTICK_MAX` (40px in game units) which also defines the input saturation point.
- During the intro window the `.intro-demo` ancestor class drives a CSS `joystick-demo-knob` keyframe animation on the knobs to demonstrate the gesture.

### PWA

Service worker (`public/sw.js`) uses cache-first for assets, network-first for navigation. Cache key: `dual-v1`. Manifest targets fullscreen portrait mode.
