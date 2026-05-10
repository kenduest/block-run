# Block Run / 方塊挑戰

[繁體中文](./README.md) | [English](./README.en.md)

`Block Run` 是一款以瀏覽器執行的落塊遊戲，使用原生 HTML、CSS 與 JavaScript 製作。它是偏向本機遊玩的單機作品：沒有後端、沒有帳號系統、沒有線上排行榜，也沒有框架建置流程。

專案最初從原型開始，後來擴充成可重複遊玩的單人遊戲，包含現代化操作手感、多種模式、關卡挑戰、每日挑戰、本機紀錄，以及 AI 輔助展示玩法。

## 畫面預覽

### 主選單

![Block Run main menu](image/game-screenshot-01.png)

### 遊戲中 HUD

![Block Run in-game HUD](image/game-screenshot-02.png)

### 設定畫面

![Block Run settings](image/game-screenshot-03.png)

## 特色

- 現代落塊規則與手感：
  支援 `7-bag`、`SRS wall kick`、`Hold`、可調整的 `Next Queue`、`DAS`、`ARR`、`soft drop` 與 `lock delay`。
- 多種遊戲模式：
  提供 `Marathon`、`Sprint`、`Ultra`、`Dig`、`Mystery`、`Zen`、`Daily Challenge`、`Stage Mode` 與 `Training`。
- 本機進度與紀錄：
  包含最佳分數、各模式紀錄、關卡星數、成就、每日成績與近期 replay 摘要，皆儲存在 `localStorage`。
- 遊戲導向介面：
  採用中央主棋盤搭配側邊 HUD，顯示目標、預覽、保留、操作資訊與提示。
- 內容集中維護：
  UI 文字、模式標籤、說明與關卡文案集中在 `game/src/i18n.js`。

## 遊戲模式

- `Marathon`：清除 150 行，可選擇延伸成 endless。
- `Sprint`：固定 40 行競速，追蹤時間、PPS 與 KPP。
- `Ultra`：3 分鐘分數挑戰。
- `Dig`：垃圾行清除練習。
- `Mystery`：本機事件修飾玩法，例如速度變化、隱藏資訊、預覽反轉或額外垃圾行。
- `Zen`：較輕鬆的練習模式，支援復原與清版。
- `Daily Challenge`：同一天使用相同 seed 與條件。
- `Stage Mode`：18 個手工設計關卡，包含星等、限制與特殊規則。
- `Training`：固定速度的效率練習模式。
- `AI Demo / AI Assist`：用來展示或觀察 AI 自動遊玩。

## 快速開始

如果你只是想把遊戲跑起來，照下面做即可：

1. 準備一個本機靜態伺服器。最簡單的是使用 Python 內建的 `http.server`。
2. 在專案根目錄執行：

```sh
make serve
```

3. 用瀏覽器開啟：

```text
http://127.0.0.1:8766/index.html
```

如果 `8766` port 已被占用，可以改成：

```sh
make serve PORT=8787
```

再開啟：

```text
http://127.0.0.1:8787/index.html
```

## 單檔離線版

如果你想提供給一般使用者直接本機開啟，不想要求他們啟動 server，可以產生單一 HTML 檔：

```sh
make package
```

產出檔案：

```text
dist/block-run-standalone.html
```

這個檔案可直接用瀏覽器開啟，不需要 `http.server`、`make serve` 或其他本機伺服器。

## 線上 Demo

直接遊玩網址：

```text
https://kenduest.github.io/block-run/
```

`main` branch 更新後，GitHub Pages 會自動重新部署。

## 本機執行

此專案使用 ES modules，直接用 `file://` 開啟 `game/index.html` 在不同瀏覽器上不夠穩定，因此建議使用本機靜態伺服器。

```sh
make serve
```

然後開啟：

```text
指令輸出的本機網址
```

如需改 port：

```sh
make serve PORT=<你的-port>
```

如果你的環境沒有 `make`，也可以直接用 Python：

```sh
cd game
python3 -m http.server 8766 --bind 127.0.0.1
```

## 開發指令

```sh
make help
make serve
make check
make test
make verify
make package
```

- `make serve`：啟動 `game/` 的本機靜態伺服器。
- `make check`：用 Node 檢查原始碼與測試檔語法。
- `make test`：執行 `tests/` 下所有測試。
- `make verify`：依序執行 `check` 與 `test`。
- `make package`：產生可直接用 `file://` 開啟的單檔離線版 HTML。

## 操作鍵位

| 按鍵 | 功能 |
| --- | --- |
| `←` `→` | 左右移動 |
| `↑` / `X` | 順時針旋轉 |
| `Z` | 逆時針旋轉 |
| `↓` | 軟降 |
| `Space` | 硬降 |
| `C` | 保留方塊 |
| `A` | 切換 AI Assist |
| `P` / `Esc` | 暫停 |
| `G` | 切換落點預覽 |
| `R` | Zen 模式復原 |
| `V` | Zen 模式清版 |

## 資料儲存

遊戲資料會存在瀏覽器本機。包含：

- 設定
- 最佳分數
- 總遊玩統計
- 各模式累計紀錄
- 關卡通關與星數
- 成就
- 每日挑戰紀錄
- 近期 replay 摘要

若儲存資料損壞或格式不符，遊戲會回退到正規化後的預設值，而不是要求手動清除資料。

## 專案結構

```text
.
├── game/
│   ├── index.html
│   ├── styles.css
│   └── src/
│       ├── ai.js
│       ├── game.js
│       ├── i18n.js
│       ├── modes.js
│       ├── renderer.js
│       ├── rules.js
│       └── storage.js
├── docs/
│   └── README.md
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── pages.yml
├── scripts/
│   └── build-single-file.mjs
├── dist/
│   └── block-run-standalone.html
├── image/
│   ├── game-screenshot-01.png
│   ├── game-screenshot-02.png
│   └── game-screenshot-03.png
├── Makefile
└── tests/
    ├── ai.test.mjs
    ├── rules.test.mjs
    ├── stages.test.mjs
    └── storage.test.mjs
```

## 架構說明

- `game/src/game.js`：
  遊戲流程、輸入處理、模式切換、HUD 更新、設定與結果/紀錄畫面。
- `game/src/rules.js`：
  棋盤邏輯、方塊生成、碰撞、SRS、消行與垃圾行輔助。
- `game/src/renderer.js`：
  棋盤、保留、Next Queue 與畫面效果的 canvas 繪製。
- `game/src/modes.js`：
  模式定義、每日挑戰規則與關卡資料。
- `game/src/storage.js`：
  本機儲存、正規化、紀錄、成就與 replay 摘要。
- `game/src/i18n.js`：
  集中管理 UI 文案、模式名稱、成就與關卡文字。

## 測試

此專案沒有 package manager 依賴，也沒有建置流程。驗證直接透過 Node 執行：

```sh
make verify
```

目前測試涵蓋：

- bag 生成與旋轉規則
- stage 資料完整性
- AI 輔助邏輯
- storage 正規化與紀錄行為

## 開發注意事項

- 文案優先改在 `game/src/i18n.js`，不要把文字散落在執行邏輯裡。
- 遊戲規則盡量放在 `game/src/rules.js`，資料定義放在 `game/src/modes.js`。
- 介面調整後，至少確認一次桌面 16:9 畫面。中央棋盤應維持視覺主體，側邊資訊不應裁切或造成版面晃動。
- 這個專案刻意保持 framework-free；新增複雜度要有足夠理由。

## 授權

採用 [MIT License](./LICENSE)。
