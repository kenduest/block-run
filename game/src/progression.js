import { TEXT } from "./i18n.js?v=__APP_VERSION__";

export const ACHIEVEMENT_DEFINITIONS = {
    first_tetris: {
        labelKey: "achievements.firstTetris",
        unlock: state => state.lastClear === 4 || state.tetrisCount > 0,
    },
    first_sprint: {
        labelKey: "achievements.firstSprint",
        unlock: state => state.mode === "sprint" && state.result === "success",
    },
    combo_5: {
        labelKey: "achievements.combo5",
        // state.combo is 0-indexed (first clear -> 0, fifth -> 4); >=4 means a 5-chain.
        unlock: state => state.maxCombo >= 4,
        progress: context => ({ current: Math.max(0, Number(context.liveState.maxCombo ?? context.data?.totals?.maxCombo ?? 0) + 1), target: 5 }),
    },
    score_10000: {
        labelKey: "achievements.score10000",
        unlock: state => state.score >= 10000,
        progress: context => ({ current: Math.max(0, bestArcadeScore(context)), target: 10000 }),
    },
    stage_clear: {
        labelKey: "achievements.stageClear",
        unlock: state => state.mode === "stages" && state.result === "success",
    },
    no_hold_clear: {
        labelKey: "achievements.noHoldClear",
        unlock: state => state.mode === "stages" && state.result === "success" && state.rules?.noHold,
    },
    dig_clear: {
        labelKey: "achievements.digClear",
        unlock: state => state.mode === "dig" && state.result === "success",
    },
    ultra_target: {
        labelKey: "achievements.ultraTarget",
        unlock: state => state.mode === "ultra" && state.score >= 12000,
        progress: context => ({ current: Math.max(0, Number(context.data?.bestScores?.ultra ?? 0), context.liveState.mode === "ultra" ? Number(context.liveState.score ?? 0) : 0), target: 12000 }),
    },
    daily_clear: {
        labelKey: "achievements.dailyClear",
        unlock: state => state.mode === "daily" && state.result === "success",
    },
};

const RESULT_GRADE_RULES = {
    sprint: {
        thresholds: [
            ["S", 75],
            ["A", 105],
            ["B", 150],
        ],
    },
    sprint20: {
        thresholds: [
            ["S", 35],
            ["A", 55],
            ["B", 80],
        ],
    },
    sprint100: {
        thresholds: [
            ["S", 200],
            ["A", 270],
            ["B", 380],
        ],
    },
    dig: {
        thresholds: [
            ["S", 90],
            ["A", 125],
            ["B", 180],
        ],
    },
};

export const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENT_DEFINITIONS);

export function achievementLabel(id) {
    const key = ACHIEVEMENT_DEFINITIONS[id]?.labelKey;
    return key?.split(".").reduce((value, part) => value?.[part], TEXT) || id;
}

export function unlockAchievements(data, state) {
    const unlocked = [];
    for (const [id, definition] of Object.entries(ACHIEVEMENT_DEFINITIONS)) {
        if (!definition.unlock?.(state, data) || data.achievements?.[id]) continue;
        data.achievements[id] = { unlockedAt: Date.now() };
        unlocked.push(id);
    }
    return unlocked;
}

export function describeAchievementProgress(id, data = {}, liveState = {}) {
    const definition = ACHIEVEMENT_DEFINITIONS[id];
    if (!definition?.progress) return null;

    const progress = definition.progress({ data, liveState });
    if (!progress) return null;

    const target = Math.max(0, Number(progress.target || 0));
    const rawCurrent = Math.max(0, Number(progress.current || 0));
    const current = target > 0 ? Math.min(rawCurrent, target) : rawCurrent;
    const unlocked = Boolean(data?.achievements?.[id]) || (target > 0 && current >= target);
    return {
        current,
        target,
        display: `${current}/${target}`,
        unlocked,
    };
}

export function resultGrade(summary) {
    const elapsedSeconds = Math.max(summary.elapsedMs / 1000, 1);
    if (summary.result === "failed" && summary.mode !== "zen") return "C";

    const timedRule = RESULT_GRADE_RULES[summary.mode];
    if (timedRule) {
        for (const [grade, seconds] of timedRule.thresholds) {
            if (elapsedSeconds <= seconds) return grade;
        }
        return "C";
    }

    const weightedScore = scoreRun(summary);
    if (weightedScore >= 68) return "S";
    if (weightedScore >= 50) return "A";
    if (weightedScore >= 34) return "B";
    return "C";
}

export function resultGradeText(grade) {
    const labels = TEXT.result.gradeNames || {};
    return labels[grade] || grade;
}

export function resultGradeHint(grade) {
    if (typeof TEXT.result.gradeHintDetail === "function") return TEXT.result.gradeHintDetail(grade);
    if (grade === "S") return TEXT.result.gradeHint || "Top-tier pace and efficiency.";
    if (grade === "A") return TEXT.result.gradeHint || "Strong pace and solid control.";
    if (grade === "B") return TEXT.result.gradeHint || "Clear with room to sharpen pace.";
    return TEXT.result.gradeHint || "Keep the stack cleaner and push efficiency.";
}

const TIME_BEST_MODES = new Set(["sprint", "sprint20", "sprint100", "dig"]);

export function isNewBest(summary, data) {
    const currentBest = data.bestScores[summary.mode];
    if (TIME_BEST_MODES.has(summary.mode)) {
        return summary.result === "success" && (!currentBest || summary.elapsedMs < currentBest.elapsedMs);
    }
    if (summary.mode === "daily") {
        const currentDaily = data.daily[summary.dailyKey];
        return !currentDaily || summary.score > currentDaily.score || (summary.result === "success" && currentDaily.result !== "success");
    }
    return summary.score > (Number(currentBest) || 0);
}

function bestArcadeScore(context) {
    const scores = [
        Number(context.liveState.score ?? 0),
        Number(context.data?.bestScores?.marathon ?? 0),
        Number(context.data?.bestScores?.ultra ?? 0),
        Number(context.data?.bestScores?.mystery ?? 0),
        Number(context.data?.bestScores?.zen ?? 0),
        Number(context.data?.bestScores?.stages ?? 0),
        Number(context.data?.bestScores?.training ?? 0),
    ].filter(Number.isFinite);
    return Math.max(0, ...scores);
}

function scoreRun(summary) {
    let score = 0;
    if (summary.result === "success") score += 28;
    score += Math.min(18, summary.lines * 0.5);
    score += Math.min(16, summary.maxCombo * 4);
    score += Math.min(16, summary.tetrisCount * 4);
    score += Math.min(12, summary.pps * 8);
    score += Math.min(10, Math.max(0, 4 - summary.kpp) * 4);
    if (summary.mode === "stages") score += summary.stars * 6;
    return score;
}
