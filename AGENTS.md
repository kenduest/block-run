# Block Run agent notes

@RTK.md

## Project shape

- The playable app lives in `game/`.
- Use `game/index.html` as the browser entry.
- Root-level `index.html` and `src/` are legacy history only; do not bring them back.

## Main files

- `game/src/game.js`: game flow, screen state, HUD, settings, profile/result screens, AI assist toggle.
- `game/src/rules.js`: falling-block rules, bag generation, rotation, collision, line clear, garbage logic.
- `game/src/renderer.js`: board, hold, next queue, and visual rendering.
- `game/src/modes.js`: mode definitions, stages, daily/challenge data.
- `game/src/storage.js`: local records, settings, stats, achievements, replay summaries.
- `game/src/i18n.js`: UI copy. Prefer editing text here instead of scattering strings.

## Run and verify

- Start local server with `make serve`.
- Print the game URL with `make url`.
- Run full verification with `make verify`.
- Run syntax-only checks with `make check`.

## Working rules

- Keep the project framework-free. Do not introduce a build system unless the user explicitly asks for it.
- For UI work, verify desktop layout first. This game is tuned for a 16:9 play experience and should not feel like a text report.
- Keep the center board visually stable. Avoid layout shift, oversized text, clipped panels, or preview canvases that resize after screen changes.
- When changing settings or menu UI, check both the menu screens and the in-game HUD because they share visual patterns and state.
- If you change browser-loaded assets, update cache-busting query strings in `game/index.html` and related module imports when needed.

## Commit guidance

- Before claiming a fix is done, run `make verify`.
- Keep commits grouped by user-visible behavior, not by tiny mechanical edits.
