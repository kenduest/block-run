# Block Run / 方塊挑戰

[繁體中文](./README.md) | [English](./README.en.md)

`Block Run` 是一款以瀏覽器執行的落塊遊戲，使用原生 HTML、CSS 與 JavaScript 製作。  
沒有後端、沒有帳號系統、沒有框架建置流程，重點就是直接遊玩。

## 線上遊玩

[https://kenduest.github.io/block-run/](https://kenduest.github.io/block-run/)

## 畫面預覽

![主選單](image/game-screenshot-01.png)
![遊戲中 HUD](image/game-screenshot-02.png)
![設定畫面](image/game-screenshot-03.png)

## 遊戲特色

- 現代落塊規則：`7-bag`、`SRS wall kick`、`Hold`
- 可調操作手感：`DAS`、`ARR`、`soft drop`、`lock delay`
- 多種模式：`Marathon`、`Sprint`、`Ultra`、`Dig`、`Mystery`、`Zen`、`Daily`、`Stage`、`Training`
- 本機紀錄：最佳分數、成就、關卡進度、每日成績、replay 摘要
- AI 輔助：支援 `AI Demo / AI Assist`
- 新手提示、快捷鍵摘要、觸控操作提示與結果差值摘要

## 如何執行

### 方法 1：直接玩線上版本

打開：

[https://kenduest.github.io/block-run/](https://kenduest.github.io/block-run/)

### 方法 2：本機啟動

此專案使用 ES modules，直接用 `file://` 開 `game/index.html` 不夠穩定。  
建議在專案根目錄執行：

```sh
make serve
```

然後用瀏覽器開：

```text
http://127.0.0.1:8766/index.html
```

如果要改 port：

```sh
make serve PORT=8787
```

### 方法 3：輸出單檔離線版

如果你要給一般使用者本機直接開，不想要求啟動 server：

```sh
make package
```

產出：

```text
dist/block-run-standalone.html
```

這個檔案可以直接雙擊或用瀏覽器開啟。

## 操作鍵位

| 按鍵 | 功能 |
| --- | --- |
| `←` `→` | 左右移動 |
| `↑` / `X` | 順時針旋轉 |
| `Z` | 逆時針旋轉 |
| `↓` | 軟降 |
| `Space` | 硬降 |
| `Enter` | 開始遊戲、結算後再玩一次 |
| `C` | 保留方塊 |
| `A` | 切換 AI Assist |
| `P` / `Esc` | 暫停 |
| `G` | 切換落點預覽 |
| `Shift` + `?` | 顯示或隱藏新手操作提示 |
| `R` | Zen 模式復原 |
| `V` | Zen 模式清版 |

## 觸控操作

手機或平板會顯示觸控控制列，也支援手勢操作：

| 手勢 | 功能 |
| --- | --- |
| 左右滑 | 左右移動 |
| 上滑 | 硬降 |
| 下滑 | 快速下落 |
| 雙擊棋盤 | 旋轉 |
| 長按下鍵 | 持續下落 |

## 開發指令

```sh
make help
make serve
make check
make test
make verify
make package
```

- `make serve`：啟動本機靜態伺服器
- `make check`：檢查 JS 語法
- `make test`：執行測試
- `make verify`：執行完整驗證
- `make package`：產生單檔離線版

## 快取與版本

本機開發與 GitHub Pages 發佈都會替瀏覽器載入的 JS/CSS 加上版本查詢字串，避免首頁或模組被舊快取卡住。  
`make serve` 會使用啟動時的 timestamp 當開發版本；發佈用輸出會改用對應的 app version。

## 專案結構

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

## 主要檔案

- `game/src/game.js`：遊戲流程、輸入處理、HUD、畫面切換
- `game/src/rules.js`：落塊規則、碰撞、旋轉、消行
- `game/src/renderer.js`：棋盤、Next Queue、Hold 繪製
- `game/src/modes.js`：模式與關卡資料
- `game/src/storage.js`：本機資料儲存
- `game/src/i18n.js`：語系與主要文字
- `scripts/build-single-file.mjs`：離線版打包腳本

如需架構文件（含 i18n 模組化、開發規則、進階資料夾說明），請看：

- [AGENTS.md](./AGENTS.md)
- [docs/README.md](./docs/README.md)

## 授權

[MIT License](./LICENSE)
