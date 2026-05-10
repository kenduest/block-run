import { TEXT } from "./i18n.js?v=hidden-rows-fix-20260510";

const STORAGE_KEY = "block-run-state-v2";
const LEGACY_STORAGE_KEYS = [
    "block-run-state-v1",
    "block-challenge-state-v2",
    "block-challenge-state-v1",
];

export const DEFAULT_SETTINGS = {
    dasMs: 125,
    arrMs: 28,
    softDropMultiplier: 18,
    lockDelayMs: 500,
    nextPreviewCount: 3,
    marathonEndless: false,
    ghostEnabled: false,
    soundEnabled: true,
    effectsLevel: "normal",
    skin: "premium",
    showHints: true,
};

const DEFAULT_BESTS = {
    arcade: 0,
    marathon: 0,
    sprint: null,
    ultra: 0,
    dig: null,
    mystery: 0,
    zen: 0,
    daily: {},
    stages: 0,
    training: 0,
};

const DEFAULT_TOTALS = {
    games: 0,
    wins: 0,
    playTimeMs: 0,
    pieces: 0,
    inputs: 0,
    lines: 0,
    score: 0,
    tetris: 0,
    maxCombo: 0,
};

const DEFAULT_DATA = {
    version: 2,
    settings: DEFAULT_SETTINGS,
    bestScores: DEFAULT_BESTS,
    totals: DEFAULT_TOTALS,
    modeTotals: {},
    completedStages: [],
    stageStars: {},
    achievements: {},
    daily: {},
    recentReplays: [],
};

export function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
            || LEGACY_STORAGE_KEYS.map(key => localStorage.getItem(key)).find(Boolean);
        if (!raw) return structuredClone(DEFAULT_DATA);
        return normalizeData(JSON.parse(raw));
    } catch {
        return structuredClone(DEFAULT_DATA);
    }
}

export function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeData(data)));
}

export function resetRecords(data) {
    data.bestScores = structuredClone(DEFAULT_BESTS);
    data.totals = structuredClone(DEFAULT_TOTALS);
    data.modeTotals = {};
    data.completedStages = [];
    data.stageStars = {};
    data.achievements = {};
    data.daily = {};
    data.recentReplays = [];
    saveData(data);
}

export function updateBestScore(data, mode, score, summary = {}) {
    if (mode === "sprint" || mode === "dig") {
        const current = data.bestScores[mode];
        if (summary.result === "success" && (!current || summary.elapsedMs < current.elapsedMs)) {
            data.bestScores[mode] = pickSummary(summary);
        }
    } else if (mode === "daily") {
        const key = summary.dailyKey;
        if (key) {
            const current = data.daily[key];
            if (!current || score > current.score || (summary.result === "success" && current.result !== "success")) {
                data.daily[key] = pickSummary(summary);
            }
            data.bestScores.daily = data.daily;
        }
    } else {
        data.bestScores[mode] = Math.max(Number(data.bestScores[mode]) || 0, score);
    }
    saveData(data);
}

export function markStageComplete(data, stageId, stars = 1) {
    if (!data.completedStages.includes(stageId)) data.completedStages.push(stageId);
    data.stageStars[stageId] = Math.max(Number(data.stageStars[stageId]) || 0, stars);
    saveData(data);
}

export function recordGame(data, summary) {
    data.totals.games++;
    if (summary.result === "success") data.totals.wins++;
    data.totals.playTimeMs += summary.elapsedMs || 0;
    data.totals.pieces += summary.piecesPlaced || 0;
    data.totals.inputs += summary.inputs || 0;
    data.totals.lines += summary.lines || 0;
    data.totals.score += summary.score || 0;
    data.totals.tetris += summary.tetrisCount || 0;
    data.totals.maxCombo = Math.max(data.totals.maxCombo || 0, summary.maxCombo || 0);

    const modeTotals = data.modeTotals[summary.mode] || structuredClone(DEFAULT_TOTALS);
    modeTotals.games++;
    if (summary.result === "success") modeTotals.wins++;
    modeTotals.playTimeMs += summary.elapsedMs || 0;
    modeTotals.pieces += summary.piecesPlaced || 0;
    modeTotals.inputs += summary.inputs || 0;
    modeTotals.lines += summary.lines || 0;
    modeTotals.score += summary.score || 0;
    modeTotals.tetris += summary.tetrisCount || 0;
    modeTotals.maxCombo = Math.max(modeTotals.maxCombo || 0, summary.maxCombo || 0);
    data.modeTotals[summary.mode] = modeTotals;

    data.recentReplays.unshift({
        id: `${Date.now()}-${Math.round(Math.random() * 9999)}`,
        seed: summary.seed,
        mode: summary.mode,
        stageId: summary.stageId || null,
        dailyKey: summary.dailyKey || null,
        inputs: summary.inputLog || [],
        result: pickSummary(summary),
    });
    data.recentReplays = data.recentReplays.slice(0, 10);
    saveData(data);
}

export function unlockAchievements(data, state) {
    const unlocked = [];
    const checks = [
        ["first_tetris", state.lastClear === 4 || state.tetrisCount > 0, TEXT.achievements.firstTetris],
        ["first_sprint", state.mode === "sprint" && state.result === "success", TEXT.achievements.firstSprint],
        ["combo_5", state.maxCombo >= 4, TEXT.achievements.combo5],
        ["score_10000", state.score >= 10000, TEXT.achievements.score10000],
        ["stage_clear", state.mode === "stages" && state.result === "success", TEXT.achievements.stageClear],
        ["no_hold_clear", state.mode === "stages" && state.result === "success" && state.rules?.noHold, TEXT.achievements.noHoldClear],
        ["dig_clear", state.mode === "dig" && state.result === "success", TEXT.achievements.digClear],
        ["ultra_target", state.mode === "ultra" && state.score >= 12000, TEXT.achievements.ultraTarget],
        ["daily_clear", state.mode === "daily" && state.result === "success", TEXT.achievements.dailyClear],
    ];

    for (const [id, passed, label] of checks) {
        if (passed && !data.achievements[id]) {
            data.achievements[id] = { label, unlockedAt: Date.now() };
            unlocked.push(label);
        }
    }
    if (unlocked.length) saveData(data);
    return unlocked;
}

function normalizeData(input) {
    const data = {
        ...structuredClone(DEFAULT_DATA),
        ...(input && typeof input === "object" ? input : {}),
        settings: { ...DEFAULT_SETTINGS, ...(input?.settings || {}) },
        bestScores: { ...DEFAULT_BESTS, ...(input?.bestScores || {}) },
        totals: { ...DEFAULT_TOTALS, ...(input?.totals || {}) },
        modeTotals: input?.modeTotals && typeof input.modeTotals === "object" ? input.modeTotals : {},
        completedStages: Array.isArray(input?.completedStages) ? input.completedStages : [],
        stageStars: input?.stageStars && typeof input.stageStars === "object" ? input.stageStars : {},
        achievements: input?.achievements && typeof input.achievements === "object" ? input.achievements : {},
        daily: input?.daily && typeof input.daily === "object" ? input.daily : {},
        recentReplays: Array.isArray(input?.recentReplays) ? input.recentReplays.slice(0, 10) : [],
    };

    if (!["off", "low", "normal", "high"].includes(data.settings.effectsLevel)) data.settings.effectsLevel = "normal";
    if (!["premium", "flat", "classic"].includes(data.settings.skin)) data.settings.skin = "premium";
    if (![0, 1, 3, 5].includes(Number(data.settings.nextPreviewCount))) data.settings.nextPreviewCount = 3;
    data.settings.dasMs = clampNumber(data.settings.dasMs, 60, 260, DEFAULT_SETTINGS.dasMs);
    data.settings.arrMs = clampNumber(data.settings.arrMs, 0, 90, DEFAULT_SETTINGS.arrMs);
    data.settings.softDropMultiplier = clampNumber(data.settings.softDropMultiplier, 4, 40, DEFAULT_SETTINGS.softDropMultiplier);
    data.settings.lockDelayMs = clampNumber(data.settings.lockDelayMs, 120, 900, DEFAULT_SETTINGS.lockDelayMs);
    data.settings.marathonEndless = Boolean(data.settings.marathonEndless);
    data.settings.ghostEnabled = Boolean(data.settings.ghostEnabled);
    data.settings.soundEnabled = data.settings.soundEnabled !== false;
    data.settings.showHints = data.settings.showHints !== false;
    return data;
}

function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
}

function pickSummary(summary) {
    return {
        mode: summary.mode,
        result: summary.result,
        score: summary.score || 0,
        lines: summary.lines || 0,
        elapsedMs: summary.elapsedMs || 0,
        piecesPlaced: summary.piecesPlaced || 0,
        pps: summary.pps || 0,
        kpp: summary.kpp || 0,
        maxCombo: summary.maxCombo || 0,
        tetrisCount: summary.tetrisCount || 0,
        stars: summary.stars || 0,
    };
}
