# Block Run / 方塊挑戰

[繁體中文](./README.md) | [English](./README.en.md)

`Block Run` is a browser-based falling-block game built with plain HTML, CSS, and JavaScript.  
There is no backend, no account system, and no framework build pipeline. The focus is simply playing the game.

## Live demo

[https://kenduest.github.io/block-run/](https://kenduest.github.io/block-run/)

## Screenshots

![Main menu](image/game-screenshot-01.png)
![In-game HUD](image/game-screenshot-02.png)
![Settings](image/game-screenshot-03.png)

## Highlights

- Modern falling-block rules: `7-bag`, `SRS wall kick`, `Hold`
- Tunable handling: `DAS`, `ARR`, `soft drop`, `lock delay`
- Multiple modes: `Marathon`, `Sprint`, `Ultra`, `Dig`, `Mystery`, `Zen`, `Daily`, `Stage`, `Training`
- Local records: best scores, achievements, stage progress, daily runs, replay summaries
- AI support: `AI Demo / AI Assist`

## How to run

### Option 1: Play online

Open:

[https://kenduest.github.io/block-run/](https://kenduest.github.io/block-run/)

### Option 2: Run locally

This project uses ES modules, so opening `game/index.html` directly with `file://` is not reliable.  
From the project root, run:

```sh
make serve
```

Then open:

```text
http://127.0.0.1:8766/index.html
```

To use a different port:

```sh
make serve PORT=8787
```

### Option 3: Build a standalone offline file

If you want a single local file that users can open directly without running a server:

```sh
make package
```

Output:

```text
dist/block-run-standalone.html
```

That file can be opened directly in a browser.

## Controls

| Key | Action |
| --- | --- |
| `←` `→` | Move |
| `↑` / `X` | Rotate clockwise |
| `Z` | Rotate counterclockwise |
| `↓` | Soft drop |
| `Space` | Hard drop |
| `C` | Hold |
| `A` | Toggle AI Assist |
| `P` / `Esc` | Pause |
| `G` | Toggle ghost piece |
| `R` | Zen undo |
| `V` | Zen clear board |

## Developer commands

```sh
make help
make serve
make check
make test
make verify
make package
```

- `make serve`: start a local static server
- `make check`: run JS syntax checks
- `make test`: run tests
- `make verify`: run the full verification flow
- `make package`: build the standalone offline file

## Project structure

```text
.
├── game/
│   ├── index.html
│   ├── styles.css
│   └── src/
├── image/
├── scripts/
├── tests/
├── Makefile
├── README.md
└── README.en.md
```

## Key files

- `game/src/game.js`: game flow, input handling, HUD, screen transitions
- `game/src/rules.js`: falling-block rules, collision, rotation, line clear
- `game/src/renderer.js`: board, next queue, and hold rendering
- `game/src/modes.js`: mode and stage data
- `game/src/storage.js`: local persistence
- `game/src/i18n.js`: language and text resources
- `scripts/build-single-file.mjs`: standalone packaging script

For architecture details (including i18n modularization, contribution guidance, and implementation notes), see:

- [AGENTS.md](./AGENTS.md)
- [docs/README.md](./docs/README.md)

## License

[MIT License](./LICENSE)
