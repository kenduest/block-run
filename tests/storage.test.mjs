import assert from "node:assert/strict";
import { loadData, markStageComplete, recordGame, resetRecords, saveData, updateBestScore } from "../src/storage.js";

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
assert.equal(data.totals.games, 0);

data.settings.nextPreviewCount = 9;
data.settings.dasMs = "bad";
saveData(data);
assert.equal(store.has("block-run-state-v2"), true);
data = loadData();
assert.equal(data.settings.nextPreviewCount, 3);
assert.equal(data.settings.dasMs, 125);

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

resetRecords(data);
data = loadData();
assert.equal(data.totals.games, 0);
assert.equal(data.recentReplays.length, 0);
assert.equal(data.settings.nextPreviewCount, 0);
