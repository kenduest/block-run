export function configureRun(state, modeId, deps = {}) {
    const now = deps.now || (() => Date.now());
    const todayKey = deps.todayKey;
    const buildDailyRules = deps.buildDailyRules;
    const currentStage = deps.currentStage;
    const hashSeed = deps.hashSeed;

    const dateKey = todayKey ? todayKey() : `${new Date().toISOString().slice(0, 10)}`;
    const stage = modeId === "stages" && typeof currentStage === "function" ? currentStage(state) : null;

    state.seed = modeId === "daily"
        ? buildDailyRules(dateKey).seed
        : hashSeed(`${modeId}-${stage?.id || "free"}-${now()}`);

    state.rng = deps.createRng(state.seed);
    state.rules = {
        endless: modeId === "marathon" && state.settings.marathonEndless,
        noHold: stage?.modifiers?.noHold || false,
        limitedPreview: stage?.modifiers?.limitedPreview || null,
        periodicGarbageMs: stage?.modifiers?.periodicGarbageMs || null,
        zoneMeter: stage?.modifiers?.zoneMeter || modeId === "zen",
    };

    if (modeId === "daily") {
        state.dailyKey = dateKey;
        state.dailyRules = buildDailyRules(dateKey);
        state.seed = state.dailyRules.seed;
        state.rng = deps.createRng(state.seed);
    } else {
        state.dailyKey = null;
        state.dailyRules = null;
    }

    if (modeId === "mystery" || stage?.modifiers?.mystery) {
        state.mystery = {
            nextInMs: 30000,
            activeLabel: deps.TEXT?.game?.activeLabel,
            speedMultiplier: 1,
            activeMs: 0,
            events: 0,
            warningShown: false,
        };
        return state;
    }

    state.mystery = null;
    return state;
}

export function updateModeEvents(state, deltaMs, deps = {}) {
    const events = {
        periodicGarbage: false,
        mystery: {
            warningShown: false,
            timerVisible: false,
            triggered: false,
            nextInMs: null,
            activeMs: 0,
            label: null,
        },
    };

    if (state.rules.periodicGarbageMs) {
        state.garbageTickMs += deltaMs;
        if (state.garbageTickMs >= state.rules.periodicGarbageMs) {
            state.garbageTickMs = 0;
            deps.makeGarbage(state.arena, 1, {
                rng: state.rng,
                pattern: deps.currentStage?.(state)?.garbagePattern,
            });
            state.garbageCells = deps.countGarbageCells(state.arena);
            events.periodicGarbage = true;
        }
    }

    if (state.mystery) {
        state.mystery.nextInMs -= deltaMs;
        state.mystery.activeMs = Math.max(0, state.mystery.activeMs - deltaMs);

        if (state.mystery.activeMs <= 0) {
            state.hiddenBlocksActive = false;
            state.mystery.speedMultiplier = 1;
        }

        if (!state.mystery.warningShown && state.mystery.nextInMs > 0 && state.mystery.nextInMs <= 3000) {
            state.mystery.warningShown = true;
            events.mystery.warningShown = true;
        }

        if (state.mystery.warningShown && state.mystery.nextInMs > 0 && state.mystery.nextInMs <= 3000) {
            events.mystery.timerVisible = true;
            events.mystery.nextInMs = state.mystery.nextInMs;
        }

        if (state.mystery.nextInMs <= 0) {
            const triggered = triggerMysteryEvent(state, deps);
            events.mystery.triggered = true;
            events.mystery.label = triggered;
            events.mystery.activeMs = state.mystery.activeMs;
            events.mystery.timerVisible = false;
            state.mystery.nextInMs = 30000;
            state.mystery.warningShown = false;
        }
    }

    return events;
}

function triggerMysteryEvent(state, deps) {
    const eventPickers = [
        () => {
            state.mystery.activeLabel = deps.TEXT?.game?.mysteryEvents?.speed;
            state.mystery.speedMultiplier = 0.62;
            state.mystery.activeMs = 8000;
            return "speed";
        },
        () => {
            state.mystery.activeLabel = deps.TEXT?.game?.mysteryEvents?.hidden;
            state.hiddenBlocksActive = true;
            state.mystery.activeMs = 5000;
            return "hidden";
        },
        () => {
            state.mystery.activeLabel = deps.TEXT?.game?.mysteryEvents?.reversePreview;
            state.nextQueue.reverse();
            state.mystery.activeMs = 6000;
            return "reversePreview";
        },
        () => {
            state.mystery.activeLabel = deps.TEXT?.game?.mysteryEvents?.garbage;
            deps.makeGarbage(state.arena, 1, { rng: state.rng });
            state.garbageCells = deps.countGarbageCells(state.arena);
            state.mystery.activeMs = 6000;
            return "garbage";
        },
    ];

    const pick = eventPickers[Math.floor(state.rng() * eventPickers.length)] || eventPickers[0];
    const label = pick();
    state.mystery.events++;
    return label;
}

export function evaluateResult(state, deps = {}) {
    const modes = deps.MODES || {};
    return modes[state.mode]?.resultEvaluator?.(state) || "playing";
}
