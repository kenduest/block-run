# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See also: [AGENTS.md](./AGENTS.md) for the per-file map (game flow, rules, renderer, modes, i18n layout).

## Commands

All workflows are driven through `make`:

- `make serve` — launch the local static server (`scripts/dev-server.mjs`) at `http://127.0.0.1:8766/`. Override with `PORT=...` / `HOST=...`. The server rewrites `__APP_VERSION__` placeholders at request time so module cache-busting works in dev.
- `make url` — print the entry URL.
- `make check` — `node --check` syntax pass over every `game/src/**/*.js` and `tests/*.test.mjs`.
- `make test` — run each `tests/*.test.mjs` as a plain Node script. Run a single test directly: `node tests/rules.test.mjs`.
- `make verify` — `check` + `test`. Run this before claiming a fix is done.
- `make package` — produce `dist/block-run-standalone.html` via `scripts/build-single-file.mjs` (inlines all ES modules and CSS into one file).
- `make pages-artifact` — produce the GitHub Pages artifact in `dist/pages` with `APP_VERSION` derived from `git rev-parse --short=12 HEAD`.

No npm/yarn — there is no `package.json`. Node is used only to run scripts and the dev server.

## Architecture

Browser-only ES-module app served from `game/` with no build step in dev. `game/index.html` is the entry; `game/src/game.js` wires the rest together.

**Module layers** (all imports use `?v=__APP_VERSION__` query strings for cache-busting; preserve this convention when adding imports):

- `game/src/game.js` — top-level orchestrator: input, HUD, screen state machine, settings, AI assist toggle. Composes the other modules; do not put rules/render logic here.
- `game/src/core/` — engine pieces extracted from `game.js`: `game-loop.js` (tick), `gameplay-actions.js` (apply input/spawn/lock), `mode-runtime.js` (configure/evaluate run, mode events), `result-flow.js` (end-of-run).
- `game/src/rules.js` — pure falling-block rules: 7-bag, SRS wall kicks, collision, line clear, garbage. Should stay free of DOM/canvas concerns.
- `game/src/renderer.js` — canvas drawing for board, hold, next queue, ghost preview.
- `game/src/modes.js` — mode definitions (Marathon/Sprint/Ultra/Dig/Mystery/Zen/Daily/Stage/Training) and stage data.
- `game/src/state/` — `game-state.js` and `ui-state.js` factories plus `defaults.js`.
- `game/src/ui/screens/` — pause / profile / result / settings screen renderers.
- `game/src/storage.js` — `localStorage` for records, settings, stats, achievements, replay summaries. `DEFAULT_SETTINGS` is the source of truth for settings shape.
- `game/src/progression.js` — achievements, grades, "is new best" logic.
- `game/src/ai.js` — AI demo / assist move chooser.
- `game/src/touch.js` — touch/gesture controls.
- `game/src/i18n.js` — back-compat re-export. New code may import directly from `game/src/services/i18n/index.js?v=__APP_VERSION__`. All user-facing strings live in `game/src/services/i18n/locales/{en,zh-Hant,ja}.js`.

**Packaging.** `scripts/build-single-file.mjs` does its own mini-bundling by regex-matching `import`/`export` statements and concatenating modules in dependency order. If you add unusual syntax (re-export forms, dynamic imports, default exports) verify the bundle still builds — the regex set in that script is the contract.

**Asset versioning.** Both dev (`make serve`) and Pages (`make pages-artifact`) substitute `__APP_VERSION__` into HTML/CSS/JS. When you add a new browser-loaded asset or import path, include the `?v=__APP_VERSION__` query so it participates in cache-busting.

## Working rules (from AGENTS.md)

- Keep the project framework-free. Do not add a build system, bundler, or dependency unless the user explicitly asks.
- The playable app is `game/`. Root-level `index.html` / `src/` would be legacy resurrection — do not recreate them.
- For UI changes, verify desktop layout first (16:9), and check both the menu screens and the in-game HUD since they share visual patterns and state.
- Keep the center board visually stable: no layout shift, oversized text, clipped panels, or preview canvases that resize after screen changes.
- Commits should group by user-visible behavior, not by tiny mechanical edits.
