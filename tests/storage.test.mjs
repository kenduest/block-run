import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, loadData, markStageComplete, recordGame, resetRecords, saveData, updateBestScore } from "../game/src/storage.js";

const store = new Map();
globalThis.localStorage = {
    getItem: key => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
};

store.set("block-challenge-state-v2", JSON.stringify({
    version: 2,
    settings: { nextPreviewCount: 1 },
}));

let migrated = loadData();
assert.equal(migrated.settings.nextPreviewCount, 1);
store.clear();

let data = loadData();
assert.equal(data.settings.nextPreviewCount, 3);
assert.equal(data.settings.ghostEnabled, true);
assert.equal(data.settings.soundVolume, DEFAULT_SETTINGS.soundVolume);
assert.equal(data.totals.games, 0);

data.settings.nextPreviewCount = 9;
data.settings.dasMs = "bad";
saveData(data);
assert.equal(store.has("block-run-state-v2"), true);
data = loadData();
assert.equal(data.settings.nextPreviewCount, 3);
assert.equal(data.settings.dasMs, 125);
assert.equal(data.settings.soundVolume, DEFAULT_SETTINGS.soundVolume);

store.set("block-run-state-v2", JSON.stringify({
    settings: {
        language: "zh-TW",
    },
    achievements: {
        first_tetris: { label: "首次四行消除", unlockedAt: 1234 },
    },
    recentReplays: [{
        id: "legacy",
        mode: "daily",
        stageId: "stage-1",
        dailyKey: "2026-05-11",
        seed: 7,
        inputs: [],
        modeLabel: "每日挑戰",
        stageLabel: "開場暖身",
        result: {
            mode: "daily",
            result: "success",
            score: 9000,
            label: "今日通關",
            stageLabel: "開場暖身",
        },
    }],
}));
data = loadData();
assert.equal(data.settings.language, "zh-Hant");
assert.deepEqual(data.achievements.first_tetris, { unlockedAt: 1234 });
assert.equal("modeLabel" in data.recentReplays[0], false);
assert.equal("stageLabel" in data.recentReplays[0], false);
assert.equal("label" in data.recentReplays[0].result, false);
assert.equal("stageLabel" in data.recentReplays[0].result, false);

store.set("block-run-state-v2", JSON.stringify({
    settings: {
        language: "ja-JP",
    },
}));
data = loadData();
assert.equal(data.settings.language, "ja");

store.set("block-run-state-v2", JSON.stringify({
    settings: {
        language: "en-US",
        soundVolume: 99,
        ghostEnabled: 0,
    },
}));
data = loadData();
assert.equal(data.settings.language, "en");
assert.equal(data.settings.soundVolume, 1);
assert.equal(data.settings.ghostEnabled, false);

store.set("block-run-state-v2", JSON.stringify({
    settings: {
        soundVolume: -2,
    },
}));
data = loadData();
assert.equal(data.settings.soundVolume, 0);

store.set("block-run-state-v2", JSON.stringify({
    settings: {
        soundVolume: "bad",
    },
}));
data = loadData();
assert.equal(data.settings.soundVolume, DEFAULT_SETTINGS.soundVolume);

data.settings.nextPreviewCount = 0;
saveData(data);
data = loadData();
assert.equal(data.settings.nextPreviewCount, 0);

updateBestScore(data, "sprint", 0, { mode: "sprint", result: "success", elapsedMs: 42000, score: 1200 });
data = loadData();
assert.equal(data.bestScores.sprint.elapsedMs, 42000);
updateBestScore(data, "sprint", 0, { mode: "sprint", result: "success", elapsedMs: 45000, score: 1600 });
data = loadData();
assert.equal(data.bestScores.sprint.elapsedMs, 42000);

markStageComplete(data, "stage-1", 2);
data = loadData();
assert.equal(data.stageStars["stage-1"], 2);
assert.equal(data.completedStages.includes("stage-1"), true);

recordGame(data, {
    mode: "marathon",
    result: "success",
    score: 10000,
    lines: 150,
    elapsedMs: 900000,
    piecesPlaced: 280,
    inputs: 900,
    tetrisCount: 8,
    maxCombo: 5,
    seed: 99,
    inputLog: [[10, "left"]],
});
data = loadData();
assert.equal(data.totals.games, 1);
assert.equal(data.totals.tetris, 8);
assert.equal(data.recentReplays.length, 1);
assert.equal("label" in data.recentReplays[0].result, false);

resetRecords(data);
data = loadData();
assert.equal(data.totals.games, 0);
assert.equal(data.recentReplays.length, 0);
assert.equal(data.settings.nextPreviewCount, 0);
