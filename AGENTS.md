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
- `game/src/i18n.js`: public i18n entrypoint kept for backward compatibility (`TEXT`, `setLanguage`, `getCurrentLanguage`, `applyStaticText`, `joinText`).
- `game/src/services/i18n/index.js`: i18n runtime entry with language switching and public function contracts.
- `game/src/services/i18n/runtime.js`: shared i18n utilities (`detectBrowserLanguage`, `textAt`, `joinText`, `applyStaticText` helpers).
- `game/src/services/i18n/locales/en.js`, `zh-Hant.js`, `ja.js`: locale dictionaries.

## i18n modularization notes

- Keep all user-facing text inside `game/src/services/i18n/locales/*.js`.
- Keep compatibility imports unchanged for existing modules by importing from `game/src/i18n.js`.
- New or refactored code may import directly from `game/src/services/i18n/index.js?v=__APP_VERSION__` when needed.

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
