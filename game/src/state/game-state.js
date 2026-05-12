import { buildDailyRules, todayKey } from "../modes.js?v=__APP_VERSION__";
import {
    COLS,
    ARENA_ROWS,
    createMatrix,
    createRng,
    hashSeed,
    pullFromBag,
} from "../rules.js?v=__APP_VERSION__";
import {
    DEFAULT_DEMO_STATE,
    DEFAULT_GAME_STATE,
    DEFAULT_PLAYER_STATE,
    DEFAULT_QUEUE_TARGET,
    DEFAULT_RUN_COUNTERS,
} from "./defaults.js?v=__APP_VERSION__";

const DAILY_MODE_ID = "daily";
const STAGES_MODE_ID = "stages";
const MARATHON_MODE_ID = "marathon";
const ZEN_MODE_ID = "zen";
const MYSTERY_MODE_ID = "mystery";

export function createInitialGameState(data = {}) {
    const settings = data?.settings || {};
    return {
        ...structuredClone(DEFAULT_GAME_STATE),
        settings,
        rng: Math.random,
        arena: createMatrix(COLS, ARENA_ROWS),
        player: structuredClone(DEFAULT_PLAYER_STATE),
        demo: structuredClone(DEFAULT_DEMO_STATE),
    };
}


export function resetDemoState(state, demo = {}) {
    state.demo = {
        ...structuredClone(DEFAULT_DEMO_STATE),
        ...demo,
    };
    return state;
}

export function resetRunState(state, modeConfig = {}, seed) {
    const modeId = resolveModeId(state, modeConfig);
    const stage = resolveStageConfig(state, modeConfig);
    const dateKey = modeConfig.dateKey || todayKey();
    const providedSeed = seed ?? modeConfig.seed;
    const generatedSeed = generateSeed(modeId, stage, dateKey);
    const runSeed = providedSeed ?? generatedSeed;
    const dailyRules = modeId === DAILY_MODE_ID && (modeConfig.dailyRules || buildDailyRules(dateKey));

    state.score = 0;
    state.lines = 0;
    state.level = 1;
    state.previousLevel = 1;
    state.b2bChain = 0;
    state.combo = -1;
    state.maxCombo = 0;
    state.lastClear = 0;
    state.tetrisCount = 0;
    state.zoneMeter = 0;
    state.zoneActiveMs = 0;
    state.garbageCells = 0;
    state.startingGarbageCells = 0;
    state.elapsedMs = 0;
    state.piecesPlaced = 0;
    state.inputs = 0;
    state.inputLog = [];
    state.lastSnapshot = null;
    state.seed = runSeed;
    state.rng = createRng(runSeed);
    state.rules = {
        endless: modeId === MARATHON_MODE_ID && Boolean(state.settings.marathonEndless),
        noHold: Boolean(stage?.modifiers?.noHold),
        limitedPreview: stage?.modifiers?.limitedPreview ?? null,
        periodicGarbageMs: stage?.modifiers?.periodicGarbageMs ?? null,
        zoneMeter: Boolean(stage?.modifiers?.zoneMeter) || modeId === ZEN_MODE_ID,
    };
    state.dailyKey = modeId === DAILY_MODE_ID ? dateKey : null;
    state.dailyRules = modeId === DAILY_MODE_ID ? structuredClone(dailyRules || null) : null;
    state.mystery = shouldEnableMystery(modeId, stage)
        ? {
            nextInMs: 30000,
            activeLabel: null,
            speedMultiplier: 1,
            activeMs: 0,
            events: 0,
            warningShown: false,
        }
        : null;
    state.hiddenBlocksActive = false;
    state.garbageTickMs = 0;
    state.result = "playing";
    state.gameOver = false;
    state.lastResultGrade = "C";
    state.lastRunNewRecord = false;
    state.arena = createMatrix(COLS, ARENA_ROWS);
    state.player = structuredClone(DEFAULT_PLAYER_STATE);
    state.nextQueue = [];
    state.holdPiece = null;
    state.canHold = true;
    state.seed = runSeed;
    state.rng = createRng(runSeed);

    if (modeId === DAILY_MODE_ID && state.dailyRules?.seed) {
        state.seed = state.dailyRules.seed;
        state.rng = createRng(state.seed);
    }
    const runState = { ...state, ...structuredClone(DEFAULT_RUN_COUNTERS) };
    state.demo = structuredClone(DEFAULT_DEMO_STATE);
    Object.assign(state, runState);
    fillQueue(state);
    return state;
}

function generateSeed(modeId, stage, dateKey) {
    if (modeId === DAILY_MODE_ID) return hashSeed(`daily-${dateKey}`);
    return hashSeed(`${modeId}-${stage?.id || "free"}-${Date.now()}`);
}

function resolveModeId(state, modeConfig) {
    return modeConfig?.id || modeConfig?.mode || modeConfig?.modeId || state?.mode || DEFAULT_GAME_STATE.mode;
}

function resolveStageConfig(state, modeConfig) {
    if (modeConfig?.stageConfig) return modeConfig.stageConfig;
    if (modeConfig?.stage) return modeConfig.stage;
    if (modeConfig?.currentStage) return modeConfig.currentStage;
    if (modeConfig?.stageIndex !== undefined && modeConfig?.stages?.[modeConfig.stageIndex]) {
        return modeConfig.stages[modeConfig.stageIndex];
    }
    if (state?.mode === STAGES_MODE_ID && Array.isArray(modeConfig?.stages)) {
        const index = Number(state?.stageIndex || 0);
        return modeConfig.stages[index];
    }
    return null;
}

function shouldEnableMystery(modeId, stage) {
    return modeId === MYSTERY_MODE_ID || Boolean(stage?.modifiers?.mystery);
}

function fillQueue(state) {
    while (state.nextQueue.length < DEFAULT_QUEUE_TARGET) {
        const pulled = pullFromBag(state.bag, state.rng);
        state.bag = pulled.bag;
        state.nextQueue.push(pulled.type);
    }
}
