# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A CSS demo showcase and CSS-First Agent Skill knowledge base. The root `index.html` + `style.css` contain a live demo (currently a YouTube clone with CSS View Transitions). The `.claude/skills/css-first/` directory holds the agent skill — 47 CSS demos, behavioral rules, and MDN references.

## No Build Process

This is a static project. No package.json, no bundler, no test runner. Open `index.html` directly in a browser to preview demos.

## Coding Style

- 2-space indentation for HTML, CSS, and Markdown
- Use logical CSS properties (`inline-size` not `width`, `block-size` not `height`, `inset-block-start` not `top`)
- Use modern CSS features (2021-2026): `oklch()`, CSS nesting, `@starting-style`, `view-transition-name`, anchor positioning, `corner-shape`, scroll-driven animations
- Prioritize CSS-only solutions over JavaScript
- Demos should be self-documenting with brief comments and MDN links

## CSS Demo File Convention

Demos in `css-demos/` use this header:

```css
/**
 * [Feature Name]
 *
 * MDN: [link]
 * Baseline: [🟢/🔵/🟡/🟣 Status]
 * Support: [Percentage]
 *
 * Task: [What it does]
 * Why: [Rationale]
 */
```

Browser support levels: 🟢 Widely Available (95%+), 🔵 Newly Available (85-94%), 🟡 Limited (70-84%), 🟣 Experimental (<70%)

## Key Paths

- `index.html` / `style.css` — Live demo entry point
- `.claude/skills/css-first/SKILL.md` — Full skill definition, capabilities, quick reference table
- `.claude/skills/css-first/css-demos/INDEX.md` — Catalog of all CSS demos with metadata
- `.claude/skills/css-first/references/rules/` — 7 behavioral rules (css-only enforcement, logical properties, modern features, semantic intent, framework awareness, browser support, progressive enhancement)
- `.claude/skills/css-first/references/live-mdn-fetch.md` — Workflow for fetching real-time MDN Baseline data

## Commit Messages

Conventional Commits: `type: short summary` (e.g., `docs: add new layout demo`, `feat: add YouTube clone demo`)
