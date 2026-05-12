export function finishRun(state, isGameOver, deps = {}) {
    const summary = deps.buildRunSummary ?
        deps.buildRunSummary(state) :
        buildRunSummary(state, deps);

    state.result = summary.result;
    state.gameOver = isGameOver || summary.result === "failed";
    state.lastResultGrade = deps.resultGrade(summary);
    state.lastRunNewRecord = deps.isNewBest(summary, deps.data);

    deps.updateBestScore(deps.data, state.mode, state.score, summary);

    if (state.mode === "stages" && state.result === "success") {
        const stage = typeof deps.currentStage === "function" ? deps.currentStage(state) : null;
        if (stage) deps.markStageComplete(deps.data, stage.id, summary.stars);
    }

    deps.recordGame(deps.data, summary);

    const achievements = deps.unlockAchievements(deps.data, state);
    if (achievements.length) deps.saveData(deps.data);

    return {
        summary,
        achievements,
        grade: state.lastResultGrade,
        isNewRecord: state.lastRunNewRecord,
    };
}

function buildRunSummary(state, deps = {}) {
    const stage = typeof deps.currentStage === "function" ? deps.currentStage(state) : null;
    return {
        mode: state.mode,
        result: state.result,
        score: state.score,
        lines: state.lines,
        level: state.level,
        elapsedMs: Math.round(state.elapsedMs),
        piecesPlaced: state.piecesPlaced,
        inputs: state.inputs,
        pps: state.piecesPlaced / Math.max(state.elapsedMs / 1000, 1),
        kpp: state.inputs / Math.max(state.piecesPlaced, 1),
        maxCombo: state.maxCombo,
        tetrisCount: state.tetrisCount,
        seed: state.seed,
        stageId: state.mode === "stages" && stage ? stage.id : null,
        stars: state.mode === "stages" && stage ? deps.calculateStageStars(state, stage) : 0,
        dailyKey: state.dailyKey,
        inputLog: state.inputLog.slice(-420),
    };
}
