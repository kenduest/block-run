const STORAGE_KEY = "block-run-state-v2";
const LEGACY_STORAGE_KEYS = [
    "block-run-state-v1",
    "block-challenge-state-v2",
    "block-challenge-state-v1",
];

export const DEFAULT_SETTINGS = {
    language: "auto",
    dasMs: 100,
    arrMs: 16,
    softDropMultiplier: 20,
    lockDelayMs: 500,
    nextPreviewCount: 3,
    marathonEndless: false,
    ghostEnabled: true,
    ghostDangerPulse: true,
    soundEnabled: true,
    soundVolume: 0.8,
    effectsLevel: "normal",
    skin: "premium",
    showHints: true,
    hapticEnabled: true,
    colorBlindMode: "off",
};

const DEFAULT_BESTS = {
    arcade: 0,
    marathon: 0,
    sprint: null,
    sprint20: null,
    sprint100: null,
    ultra: 0,
    ultra120: 0,
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

const CORRUPT_BACKUP_KEY = "block-run-state-corrupt";

const UI_PREF_KEY_PREFIX = "block-run-ui-pref:";

export function readUiPreference(key, fallback) {
    try {
        const raw = localStorage.getItem(`${UI_PREF_KEY_PREFIX}${key}`)
            ?? localStorage.getItem(key); // legacy keys
        if (raw === null || raw === undefined) return fallback;
        if (raw === "1" || raw === "true") return true;
        if (raw === "0" || raw === "false") return false;
        try { return JSON.parse(raw); } catch { return fallback; }
    } catch {
        return fallback;
    }
}

export function writeUiPreference(key, value) {
    try {
        const serialized = typeof value === "boolean" ? (value ? "1" : "0") : JSON.stringify(value);
        localStorage.setItem(`${UI_PREF_KEY_PREFIX}${key}`, serialized);
    } catch { /* ignore quota / privacy mode */ }
}

export function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
            || LEGACY_STORAGE_KEYS.map(key => localStorage.getItem(key)).find(Boolean);
        if (!raw) return structuredClone(DEFAULT_DATA);
        try {
            return normalizeData(JSON.parse(raw));
        } catch (parseError) {
            // Preserve the corrupt blob before falling back so it can be inspected/recovered.
            try { localStorage.setItem(CORRUPT_BACKUP_KEY, raw); } catch { /* ignore */ }
            console.warn("block-run: corrupt save data preserved at", CORRUPT_BACKUP_KEY, parseError);
            return structuredClone(DEFAULT_DATA);
        }
    } catch {
        return structuredClone(DEFAULT_DATA);
    }
}

export function saveData(data) {
    const normalized = normalizeData(data);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
        if (isQuotaError(error)) {
            // Trim replays (the heaviest payload) and retry once.
            normalized.recentReplays = (normalized.recentReplays || []).slice(0, 3).map(replay => ({
                ...replay,
                inputs: [],
            }));
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
                return;
            } catch (retryError) {
                console.warn("block-run: localStorage quota exceeded; falling back to in-memory state", retryError);
                return;
            }
        }
        throw error;
    }
}

function isQuotaError(error) {
    if (!error) return false;
    if (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED") return true;
    return Number(error.code) === 22 || Number(error.code) === 1014;
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

const TIME_BEST_MODES = new Set(["sprint", "sprint20", "sprint100", "dig"]);

export function updateBestScore(data, mode, score, summary = {}) {
    if (TIME_BEST_MODES.has(mode)) {
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
        achievements: normalizeAchievements(input?.achievements),
        daily: input?.daily && typeof input.daily === "object" ? input.daily : {},
        recentReplays: Array.isArray(input?.recentReplays) ? input.recentReplays.slice(0, 10).map(normalizeReplay) : [],
    };

    if (!["off", "low", "normal", "high"].includes(data.settings.effectsLevel)) data.settings.effectsLevel = "normal";
    data.settings.language = normalizeLanguageSetting(data.settings.language);
    if (!["premium", "flat", "classic"].includes(data.settings.skin)) data.settings.skin = "premium";
    if (!["off", "deutan", "protan", "tritan"].includes(data.settings.colorBlindMode)) data.settings.colorBlindMode = "off";
    if (![0, 1, 3, 5].includes(Number(data.settings.nextPreviewCount))) data.settings.nextPreviewCount = 3;
    data.settings.dasMs = clampNumber(data.settings.dasMs, 60, 260, DEFAULT_SETTINGS.dasMs);
    data.settings.arrMs = clampNumber(data.settings.arrMs, 0, 90, DEFAULT_SETTINGS.arrMs);
    data.settings.softDropMultiplier = clampNumber(data.settings.softDropMultiplier, 4, 40, DEFAULT_SETTINGS.softDropMultiplier);
    data.settings.lockDelayMs = clampNumber(data.settings.lockDelayMs, 120, 900, DEFAULT_SETTINGS.lockDelayMs);
    data.settings.marathonEndless = Boolean(data.settings.marathonEndless);
    data.settings.ghostEnabled = Boolean(data.settings.ghostEnabled);
    data.settings.ghostDangerPulse = data.settings.ghostDangerPulse !== false;
    data.settings.soundEnabled = data.settings.soundEnabled !== false;
    data.settings.soundVolume = clampNumber(data.settings.soundVolume, 0, 1, DEFAULT_SETTINGS.soundVolume);
    data.settings.showHints = data.settings.showHints !== false;
    data.settings.hapticEnabled = data.settings.hapticEnabled !== false;
    return data;
}

function normalizeLanguageSetting(value) {
    if (value === "auto" || value == null) return "auto";
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return "auto";
    if (normalized.startsWith("ja")) return "ja";
    if (normalized === "zh" || normalized.startsWith("zh-") || normalized.startsWith("zh_")) return "zh-Hant";
    if (normalized.startsWith("en")) return "en";
    return "auto";
}

function normalizeAchievements(input) {
    if (!input || typeof input !== "object") return {};
    const normalized = {};
    for (const [id, value] of Object.entries(input)) {
        if (!value) continue;
        if (typeof value === "object") {
            normalized[id] = pickFields(value, ["unlockedAt"]);
            if (!("unlockedAt" in normalized[id])) normalized[id].unlockedAt = Date.now();
            continue;
        }
        normalized[id] = { unlockedAt: Date.now() };
    }
    return normalized;
}

function normalizeReplay(replay) {
    if (!replay || typeof replay !== "object") return replay;
    const normalized = pickFields(replay, ["id", "seed", "mode", "stageId", "dailyKey", "inputs", "result"]);
    normalized.inputs = Array.isArray(normalized.inputs) ? normalized.inputs : [];
    normalized.result = normalizeReplayResult(normalized.result);
    return normalized;
}

function normalizeReplayResult(result) {
    if (!result || typeof result !== "object") return result;
    return pickFields(result, [
        "mode",
        "result",
        "score",
        "lines",
        "elapsedMs",
        "piecesPlaced",
        "pps",
        "kpp",
        "maxCombo",
        "tetrisCount",
        "stars",
    ]);
}

function pickFields(input, allowedKeys) {
    const output = {};
    for (const key of allowedKeys) {
        if (key in input) output[key] = input[key];
    }
    return output;
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
