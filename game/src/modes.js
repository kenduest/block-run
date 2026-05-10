import { hashSeed } from "./rules.js?v=__APP_VERSION__";
import { TEXT } from "./i18n.js?v=__APP_VERSION__";

export const MODE_ORDER = ["marathon", "sprint", "ultra", "dig", "mystery", "zen", "daily", "stages", "training"];

export const STAGES = [
    stage("stage-1", 0, { type: "lines", target: 6 }, { pieceLimit: 42 }),
    stage("stage-2", 1, { type: "score", target: 3000 }, { pieceLimit: 48, starGoals: { score: 5200, maxCombo: 2 } }),
    stage("stage-3", 2, { type: "tetris", target: 1 }, { pieceLimit: 55, startingGarbage: 1 }),
    stage("stage-4", 3, { type: "lines", target: 12 }, { timeLimitMs: 120000, startingGarbage: 2, speedEvents: [{ afterMs: 45000, multiplier: 0.72, label: "45 秒後加速" }] }),
    stage("stage-5", 4, { type: "score", target: 7200 }, { timeLimitMs: 105000, startingGarbage: 3, speedEvents: [{ afterMs: 30000, multiplier: 0.78, label: "30 秒後加速" }, { afterMs: 70000, multiplier: 0.58, label: "70 秒後再加速" }] }),
    stage("stage-6", 5, { type: "lines", target: 16 }, { pieceLimit: 62, modifiers: { limitedPreview: 1 }, speedEvents: [{ afterMs: 25000, multiplier: 0.66, label: "25 秒後加速" }] }),
    stage("stage-7", 6, { type: "lines", target: 16 }, { pieceLimit: 58, startingGarbage: 5, garbagePattern: [4, 4, 5, 5] }),
    stage("stage-8", 7, { type: "garbage", target: 54 }, { pieceLimit: 72, startingGarbage: 6, garbagePattern: [1, 8, 2, 7, 3, 6] }),
    stage("stage-9", 8, { type: "lines", target: 20 }, { pieceLimit: 66, startingGarbage: 7, garbagePattern: [3, 4, 3, 4] }),
    stage("stage-10", 9, { type: "lines", target: 12 }, { timeLimitMs: 60000, startingGarbage: 1 }),
    stage("stage-11", 10, { type: "score", target: 5200 }, { pieceLimit: 30, startingGarbage: 2 }),
    stage("stage-12", 11, { type: "score", target: 9000 }, { timeLimitMs: 90000, starGoals: { score: 13000, maxCombo: 4 } }),
    stage("stage-13", 12, { type: "lines", target: 14 }, { pieceLimit: 55, modifiers: { noHold: true } }),
    stage("stage-14", 13, { type: "lines", target: 18 }, { timeLimitMs: 130000, modifiers: { hiddenBlocks: true } }),
    stage("stage-15", 14, { type: "score", target: 11000 }, { timeLimitMs: 140000, modifiers: { zoneMeter: true }, startingGarbage: 4 }),
    stage("stage-16", 15, { type: "lines", target: 24 }, { timeLimitMs: 150000, startingGarbage: 5, garbagePattern: [2, 7], modifiers: { periodicGarbageMs: 22000 } }),
    stage("stage-17", 16, { type: "score", target: 14000 }, { timeLimitMs: 150000, modifiers: { mystery: true, limitedPreview: 3 }, speedEvents: [{ afterMs: 50000, multiplier: 0.72, label: "50 秒後加速" }] }),
    stage("stage-18", 17, { type: "lines", target: 28 }, { pieceLimit: 78, startingGarbage: 8, garbagePattern: [4, 4, 5, 5], speedEvents: [{ afterMs: 35000, multiplier: 0.7, label: "35 秒後加速" }, { afterMs: 95000, multiplier: 0.52, label: "95 秒後再加速" }] }),
];

export const MODES = {
    marathon: mode("marathon", {
        speedCurve: (level, state) => Math.max(82, 920 - (level - 1) * 64 - zoneSlowdown(state)),
        objectiveText: state => state.rules?.endless ? TEXT.modes.objectives.marathonEndless : TEXT.modes.objectives.marathon,
        progress: state => progress(TEXT.modes.progress.lineGoal, TEXT.modes.progress.lines150(state.lines), state.lines / 150),
        resultEvaluator: state => state.lines >= 150 && !state.rules?.endless ? "success" : state.gameOver ? "failed" : "playing",
        statsFields: ["score", "lines", "time", "pps", "tetris"],
    }),
    sprint: mode("sprint", {
        speedCurve: () => 720,
        objectiveText: () => TEXT.modes.objectives.sprint,
        progress: state => progress(TEXT.modes.progress.sprint40, TEXT.modes.progress.lines40(state.lines), state.lines / 40),
        resultEvaluator: state => state.lines >= 40 ? "success" : state.gameOver ? "failed" : "playing",
        statsFields: ["time", "pps", "kpp"],
    }),
    ultra: mode("ultra", {
        speedCurve: (level, state) => Math.max(88, 820 - (level - 1) * 48 - zoneSlowdown(state)),
        objectiveText: () => TEXT.modes.objectives.ultra,
        progress: state => progress(TEXT.modes.progress.remainingTime, formatTime(Math.max(0, 180000 - state.elapsedMs)), state.elapsedMs / 180000),
        resultEvaluator: state => state.elapsedMs >= 180000 ? "success" : state.gameOver ? "failed" : "playing",
        statsFields: ["score", "tetris", "combo"],
    }),
    dig: mode("dig", {
        speedCurve: (level, state) => Math.max(96, 780 - (level - 1) * 48 - zoneSlowdown(state)),
        objectiveText: state => TEXT.modes.objectives.dig(state.garbageCells),
        progress: state => progress(TEXT.modes.progress.remainingGarbage, TEXT.modes.progress.garbageCells(state.garbageCells), 1 - state.garbageCells / Math.max(1, state.startingGarbageCells)),
        resultEvaluator: state => state.garbageCells <= 0 ? "success" : state.gameOver ? "failed" : "playing",
        statsFields: ["time", "pps", "lines"],
    }),
    mystery: mode("mystery", {
        speedCurve: (level, state) => Math.max(80, (840 - (level - 1) * 56) * (state.mystery?.speedMultiplier || 1)),
        objectiveText: state => TEXT.modes.objectives.mystery(formatTime(state.mystery?.nextInMs || 30000)),
        progress: state => progress(TEXT.modes.progress.nextEvent, formatTime(state.mystery?.nextInMs || 30000), 1 - (state.mystery?.nextInMs || 0) / 30000),
        resultEvaluator: state => state.lines >= 60 ? "success" : state.gameOver ? "failed" : "playing",
        statsFields: ["score", "lines", "events"],
    }),
    zen: mode("zen", {
        speedCurve: () => 900,
        objectiveText: () => TEXT.modes.objectives.zen,
        progress: state => progress(TEXT.modes.progress.practiceTime, formatTime(state.elapsedMs), Math.min(1, state.elapsedMs / 300000)),
        resultEvaluator: () => "playing",
        statsFields: ["time", "pieces", "pps"],
    }),
    daily: mode("daily", {
        speedCurve: (level, state) => Math.max(90, 820 - (level - 1) * 58 + (state.dailyRules?.speedOffset || 0)),
        objectiveText: state => TEXT.modes.objectives.daily(state.dailyRules?.label || TEXT.modes.objectives.dailyFallback),
        progress: state => progress(TEXT.modes.progress.dailyGoal, TEXT.modes.progress.dailyLines(state.lines, state.dailyRules?.targetLines || 30), state.lines / (state.dailyRules?.targetLines || 30)),
        resultEvaluator: state => state.lines >= (state.dailyRules?.targetLines || 30) ? "success" : state.gameOver ? "failed" : "playing",
        buildSeed: date => hashSeed(`daily-${date || todayKey()}`),
        statsFields: ["score", "time", "pps"],
    }),
    stages: mode("stages", {
        speedCurve: (level, state) => {
            const base = Math.max(110, 820 - (level - 1) * 54);
            return Math.max(70, Math.round(base * stageSpeedMultiplier(state)));
        },
        objectiveText: state => {
            const current = currentStage(state);
            const limit = current.timeLimitMs ? `，${Math.round(current.timeLimitMs / 1000)} 秒內` : current.pieceLimit ? `，${current.pieceLimit} 顆內` : "";
            const speed = current.speedEvents?.length ? `，${current.speedEvents[0].label}` : "";
            return `${current.name}：${objectiveLabel(current.objective)}${limit}${speed}`;
        },
        progress: state => {
            const current = currentStage(state);
            const currentValue = objectiveValue(state, current.objective);
            const limitText = current.timeLimitMs
                ? ` / ${formatTime(Math.max(0, current.timeLimitMs - state.elapsedMs))}`
                : current.pieceLimit
                    ? ` / ${Math.max(0, current.pieceLimit - state.piecesPlaced)} 顆`
                    : "";
            return progress(objectiveShortLabel(current.objective), `${Math.min(currentValue, current.objective.target)}/${current.objective.target}${limitText}`, currentValue / current.objective.target);
        },
        resultEvaluator: state => evaluateStageResult(state),
        statsFields: ["score", "lines", "stars"],
    }),
    training: mode("training", {
        speedCurve: () => 460,
        objectiveText: () => TEXT.modes.objectives.training,
        progress: state => progress(TEXT.modes.progress.practiceTime, formatTime(state.elapsedMs), Math.min(1, state.elapsedMs / 180000)),
        resultEvaluator: state => (state.gameOver ? "failed" : "playing"),
        statsFields: ["pps", "lpm", "kpp"],
    }),
};

export function getModeList() {
    return MODE_ORDER.map(id => MODES[id]);
}

export function currentStage(state) {
    return STAGES[state.stageIndex % STAGES.length];
}

export function stageSpeedMultiplier(state) {
    const current = currentStage(state);
    return (current.speedEvents || [])
        .filter(event => state.elapsedMs >= event.afterMs)
        .reduce((multiplier, event) => Math.min(multiplier, event.multiplier), 1);
}

export function stageSpeedText(current) {
    if (!current.speedEvents?.length) return "速度固定";
    return current.speedEvents.map(event => event.label).join("、");
}

export function evaluateStageResult(state) {
    const current = currentStage(state);
    if (objectiveValue(state, current.objective) >= current.objective.target) return "success";
    if (state.gameOver) return "failed";
    if (current.timeLimitMs && state.elapsedMs >= current.timeLimitMs) return "failed";
    if (current.pieceLimit && state.piecesPlaced >= current.pieceLimit) return "failed";
    return "playing";
}

export function calculateStageStars(state, current = currentStage(state)) {
    if (evaluateStageResult(state) !== "success") return 0;
    let stars = 1;
    const goals = current.starGoals || {};
    const efficient = (goals.timeMs && state.elapsedMs <= goals.timeMs)
        || (goals.pieces && state.piecesPlaced <= goals.pieces)
        || (goals.maxCombo && state.maxCombo >= goals.maxCombo)
        || (!goals.timeMs && !goals.pieces && !goals.maxCombo && state.piecesPlaced <= (current.pieceLimit || 80) * 0.86);
    if (efficient) stars++;
    if ((goals.score && state.score >= goals.score) || state.lastClear === 4 || state.tetrisCount > 0 || state.maxCombo >= 3) stars++;
    return Math.min(3, stars);
}

export function buildDailyRules(dateKey = todayKey()) {
    const seed = hashSeed(`daily-rules-${dateKey}`);
    const targetLines = 24 + (seed % 4) * 6;
    const garbageRows = 1 + (seed % 5);
    const speedOffset = -(seed % 3) * 35;
    return {
        seed: hashSeed(`daily-${dateKey}`),
        targetLines,
        garbageRows,
        speedOffset,
        label: `${targetLines} 行、開場障礙 ${garbageRows} 行`,
    };
}

export function todayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function formatTime(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = String(total % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
}

export function formatPreciseTime(ms) {
    const total = Math.max(0, ms / 1000);
    const minutes = Math.floor(total / 60);
    const seconds = (total % 60).toFixed(2).padStart(5, "0");
    return `${minutes}:${seconds}`;
}

export function objectiveValue(state, objective) {
    if (objective.type === "score") return state.score;
    if (objective.type === "tetris") return state.tetrisCount;
    if (objective.type === "garbage") return Math.max(0, state.startingGarbageCells - state.garbageCells);
    return state.lines;
}

export function objectiveLabel(objective) {
    if (objective.type === "score") return TEXT.modes.objectiveLabels.score(objective.target);
    if (objective.type === "tetris") return TEXT.modes.objectiveLabels.tetris(objective.target);
    if (objective.type === "garbage") return TEXT.modes.objectiveLabels.garbage;
    return TEXT.modes.objectiveLabels.lines(objective.target);
}

function objectiveShortLabel(objective) {
    if (objective.type === "score") return TEXT.modes.objectiveLabels.scoreShort;
    if (objective.type === "tetris") return TEXT.modes.objectiveLabels.tetrisShort;
    if (objective.type === "garbage") return TEXT.modes.objectiveLabels.garbageShort;
    return TEXT.modes.progress.lineGoal;
}

function progress(label, value, ratio) {
    return { label, value, ratio: Math.max(0, Math.min(1, ratio || 0)) };
}

function mode(id, config) {
    return { id, ...TEXT.modes[id], ...config };
}

function stage(id, textIndex, objective, extra = {}) {
    const text = TEXT.stages[textIndex];
    return {
        id,
        ...text,
        objective,
        starGoals: defaultStarGoals(objective, extra),
        timeLimitMs: null,
        pieceLimit: null,
        startingGarbage: 0,
        garbagePattern: [],
        speedEvents: [],
        modifiers: {},
        ...extra,
    };
}

function defaultStarGoals(objective, extra) {
    if (extra.starGoals) return extra.starGoals;
    if (objective.type === "score") return { score: Math.round(objective.target * 1.35), maxCombo: 3 };
    if (extra.timeLimitMs) return { timeMs: Math.round(extra.timeLimitMs * 0.78), score: objective.target * 350 };
    if (extra.pieceLimit) return { pieces: Math.max(8, Math.round(extra.pieceLimit * 0.78)), score: objective.target * 320 };
    return { score: objective.target * 300, maxCombo: 2 };
}

function zoneSlowdown(state) {
    return state.zoneActiveMs > 0 ? 180 : 0;
}
