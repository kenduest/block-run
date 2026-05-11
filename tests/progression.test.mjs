import assert from "node:assert/strict";
import {
    ACHIEVEMENT_IDS,
    describeAchievementProgress,
    isNewBest,
    resultGrade,
    unlockAchievements,
} from "../game/src/progression.js";

const baseData = {
    achievements: {},
    totals: { maxCombo: 2 },
    bestScores: {
        marathon: 9800,
        ultra: 7600,
        mystery: 4200,
        zen: 0,
        stages: 0,
        training: 0,
        sprint: null,
        dig: null,
        daily: {},
    },
    daily: {},
};

assert.equal(ACHIEVEMENT_IDS.includes("combo_5"), true);

const unlocked = unlockAchievements(structuredClone(baseData), {
    lastClear: 4,
    tetrisCount: 1,
    mode: "marathon",
    result: "success",
    score: 12000,
    maxCombo: 4,
    rules: {},
});
assert.deepEqual(unlocked.sort(), ["combo_5", "first_tetris", "score_10000"]);

assert.deepEqual(describeAchievementProgress("combo_5", baseData, { maxCombo: 2 }), {
    current: 3,
    target: 5,
    display: "3/5",
    unlocked: false,
});

assert.deepEqual(describeAchievementProgress("score_10000", baseData, { score: 4200 }), {
    current: 9800,
    target: 10000,
    display: "9800/10000",
    unlocked: false,
});

assert.deepEqual(describeAchievementProgress("ultra_target", {
    ...baseData,
    bestScores: { ...baseData.bestScores, ultra: 11000 },
}, { mode: "ultra", score: 15000 }), {
    current: 12000,
    target: 12000,
    display: "12000/12000",
    unlocked: true,
});

assert.equal(describeAchievementProgress("first_sprint", baseData, { mode: "marathon", result: "success" }), null);

assert.equal(resultGrade({
    mode: "sprint",
    result: "success",
    elapsedMs: 72000,
    lines: 40,
    maxCombo: 2,
    tetrisCount: 1,
    pps: 1.8,
    kpp: 1.9,
    stars: 0,
}), "S");

assert.equal(resultGrade({
    mode: "dig",
    result: "success",
    elapsedMs: 170000,
    lines: 32,
    maxCombo: 1,
    tetrisCount: 0,
    pps: 1.1,
    kpp: 2.4,
    stars: 0,
}), "B");

assert.equal(resultGrade({
    mode: "marathon",
    result: "failed",
    elapsedMs: 120000,
    lines: 18,
    maxCombo: 0,
    tetrisCount: 0,
    pps: 0.7,
    kpp: 3.6,
    stars: 0,
}), "C");

assert.equal(resultGrade({
    mode: "stages",
    result: "success",
    elapsedMs: 84000,
    lines: 24,
    maxCombo: 5,
    tetrisCount: 2,
    pps: 1.9,
    kpp: 1.7,
    stars: 3,
}), "S");

assert.equal(isNewBest({
    mode: "marathon",
    result: "success",
    score: 10000,
}, baseData), true);

assert.equal(isNewBest({
    mode: "ultra",
    result: "success",
    score: 7500,
}, baseData), false);

assert.equal(isNewBest({
    mode: "sprint",
    result: "success",
    elapsedMs: 52000,
}, {
    ...baseData,
    bestScores: { ...baseData.bestScores, sprint: { elapsedMs: 54000 } },
}), true);

assert.equal(isNewBest({
    mode: "daily",
    result: "success",
    score: 9200,
    dailyKey: "2026-05-11",
}, {
    ...baseData,
    daily: {
        "2026-05-11": { result: "failed", score: 9100 },
    },
}), true);
