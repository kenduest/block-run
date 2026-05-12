const DEFAULT_PREVIEW_COUNT = 3;

function normalizePreviewCount(value, fallback = DEFAULT_PREVIEW_COUNT) {
    if (typeof value === "function") return Number(value()) || fallback;
    return Number(value) || fallback;
}

function ensureState(state) {
    if (!state.bag) state.bag = [];
    if (!Array.isArray(state.nextQueue)) state.nextQueue = [];
    if (!state.player) state.player = { pos: { x: 0, y: 0 }, matrix: null, type: null, rotation: 0 };
    if (!state.arena) state.arena = [];
    if (state.previewCount == null) state.previewCount = DEFAULT_PREVIEW_COUNT;
}

function fillQueue(state, deps) {
    const pullFromBag = deps.pullFromBag;
    while (state.nextQueue.length < 5) {
        const pulled = pullFromBag(state.bag, state.rng);
        state.bag = pulled.bag;
        state.nextQueue.push(pulled.type);
    }
}

export function spawnNextPiece(state, deps = {}) {
    ensureState(state);
    fillQueue(state, deps);
    const spawnY = Number.isFinite(deps.spawnY) ? deps.spawnY : 0;

    const type = state.nextQueue.shift();
    state.player.type = type;
    state.player.matrix = deps.createPiece(type);
    state.player.rotation = 0;
    state.player.pos.y = spawnY;
    state.player.pos.x = Math.floor(deps.COLS / 2) - Math.floor(state.player.matrix[0].length / 2);
    state.canHold = true;

    fillQueue(state, deps);

    if (deps.collide(state.arena, state.player)) {
        if (state.mode === "zen") {
            state.arena = deps.createMatrix(deps.COLS, state.arena.length);
            state.garbageCells = 0;
            if (state.demo?.enabled) state.demo.move = deps.chooseAutoMove(state.arena, state.player);
            return {
                spawned: true,
                topOut: true,
                gameOver: false,
                zenReset: true,
            };
        }

        return {
            spawned: false,
            topOut: true,
            gameOver: true,
            zenReset: false,
        };
    }

    if (state.demo?.enabled) {
        state.demo.move = deps.chooseAutoMove(state.arena, state.player);
    }

    if (typeof deps.renderPreviews === "function") {
        const previewCount = normalizePreviewCount(deps.previewCount, DEFAULT_PREVIEW_COUNT);
        deps.renderPreviews(state.nextQueue, state.holdPiece, previewCount);
    }

    return {
        spawned: true,
        topOut: false,
        gameOver: false,
        zenReset: false,
    };
}

export function lockCurrentPiece(state, deps = {}) {
    ensureState(state);
    const beforeLevel = state.level;
    const previousLevel = Number.isFinite(state.previousLevel) ? state.previousLevel : state.level;
    const beforeScore = state.score;

    deps.merge(state.arena, state.player);
    state.piecesPlaced += 1;

    const clearedRows = deps.sweepArena(state.arena);
    const topOut = deps.hasTopOut(state.arena);
    state.garbageCells = deps.countGarbageCells(state.arena);

    state.lastClear = clearedRows.length;
    let isTetrisClear = false;
    let continuesB2b = false;
    let scoreAdded = 0;

    const linesCleared = clearedRows.length;
    if (linesCleared) {
        isTetrisClear = linesCleared === 4;
        continuesB2b = isTetrisClear && state.b2bChain > 0;
        state.combo += 1;
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        state.b2bChain = isTetrisClear ? state.b2bChain + 1 : 0;
        scoreAdded = deps.scoreClear(linesCleared, state.level, state.combo);
        state.score += scoreAdded;
        state.lines += linesCleared;
        if (isTetrisClear) state.tetrisCount += 1;
        state.zoneMeter = Math.min(100, state.zoneMeter + linesCleared * 12 + (isTetrisClear ? 12 : 0));
        state.level = Math.floor(state.lines / 10) + 1;
    } else {
        state.combo = -1;
        state.lastClear = 0;
    }

    const levelUp = state.level > previousLevel;
    if (levelUp) state.previousLevel = state.level;

    state.lockCounter = 0;
    state.moveResetCount = 0;

    return {
        action: "lock",
        levelBefore: beforeLevel,
        levelAfter: state.level,
        levelUp,
        linesCleared,
        isTetrisClear,
        continuesB2b,
        scoreAdded,
        scoreBefore: beforeScore,
        scoreAfter: state.score,
        topOut,
        topOutAllowed: state.mode === "zen",
        combo: state.combo,
        b2bChain: state.b2bChain,
        maxCombo: state.maxCombo,
        tetrisCount: state.tetrisCount,
        clearRows: clearedRows,
        piecesPlaced: state.piecesPlaced,
        lines: state.lines,
    };
}

function startLockDelay(state) {
    if (state.lockCounter <= 0) state.lockCounter = 1;
}

function resetLockDelay(state, deps) {
    if (!deps.isGrounded(state) || state.moveResetCount >= 15) return;
    state.lockCounter = 1;
    state.moveResetCount += 1;
}

function movePiece(state, deps, dir) {
    state.player.pos.x += dir;
    if (deps.collide(state.arena, state.player)) {
        state.player.pos.x -= dir;
        return { action: "move", direction: dir, moved: false, lockReset: false };
    }

    resetLockDelay(state, deps);
    if (typeof deps.playTone === "function") deps.playTone(260, 0.025);
    return { action: "move", direction: dir, moved: true, lockReset: true };
}

function rotatePiece(state, deps, dir) {
    const rotated = deps.rotateWithSrs(state.arena, state.player, dir);
    if (!rotated) return { action: "rotate", dir, rotated: false, lockReset: false };
    resetLockDelay(state, deps);
    if (typeof deps.playTone === "function") deps.playTone(330, 0.035);
    return { action: "rotate", dir, rotated: true, lockReset: true };
}

function dropPiece(state, deps, isSoft = false) {
    state.player.pos.y++;
    if (deps.collide(state.arena, state.player)) {
        state.player.pos.y--;
        if (isSoft) {
            state.lockCounter = state.settings.lockDelayMs;
        } else {
            startLockDelay(state);
        }
        return {
            action: "drop",
            soft: isSoft,
            blocked: true,
            dropped: false,
            lockStarted: true,
        };
    }

    if (isSoft) state.score += 1;
    state.dropCounter = 0;
    return { action: "drop", soft: isSoft, blocked: false, dropped: true, lockStarted: false };
}

function hardDrop(state, deps) {
    let distance = 0;
    while (!deps.collide(state.arena, state.player)) {
        state.player.pos.y++;
        distance++;
    }
    state.player.pos.y--;

    const points = Math.max(0, distance - 1) * 2;
    if (points) state.score += points;

    const snapshot = deps.snapshotArena && deps.snapshotArena(state);
    if (snapshot) state.lastSnapshot = snapshot;
    const lockResult = lockCurrentPiece(state, deps);
    state.dropCounter = 0;

    if (!lockResult.linesCleared && typeof deps.playTone === "function") {
        deps.playTone(150, 0.05, "sawtooth");
    }

    return {
        action: "hardDrop",
        points,
        distance,
        topOut: lockResult.topOut,
        topOutAllowed: state.mode === "zen",
        lockResult,
        snapshot: state.lastSnapshot,
    };
}

function holdPiece(state, deps) {
    if (!state.canHold || state.rules.noHold) return { action: "hold", held: false, allowed: false };

    const currentType = state.player.type;
    if (state.holdPiece) {
        state.player.type = state.holdPiece;
        state.player.matrix = deps.createPiece(state.player.type);
        state.player.rotation = 0;
        state.holdPiece = currentType;
        state.player.pos.y = Number.isFinite(deps.spawnY) ? deps.spawnY : 0;
        state.player.pos.x = Math.floor(deps.COLS / 2) - Math.floor(state.player.matrix[0].length / 2);

        if (deps.collide(state.arena, state.player)) {
            return {
                action: "hold",
                held: false,
                switched: false,
                gameOver: true,
                topOut: true,
            };
        }
    } else {
        state.holdPiece = currentType;
        const spawnResult = spawnNextPiece(state, deps);
        if (spawnResult?.gameOver) {
            return {
                action: "hold",
                held: false,
                switched: false,
                gameOver: true,
                topOut: spawnResult.topOut,
            };
        }
    }

    state.canHold = false;

    if (typeof deps.renderPreviews === "function") {
        const previewCount = normalizePreviewCount(deps.previewCount, DEFAULT_PREVIEW_COUNT);
        deps.renderPreviews(state.nextQueue, state.holdPiece, previewCount);
    }

    if (typeof deps.playTone === "function") deps.playTone(520, 0.04);

    return {
        action: "hold",
        held: true,
        switched: Boolean(state.holdPiece && state.holdPiece !== currentType),
        topOut: false,
        gameOver: false,
    };
}

export function applyAction(state, actionName, deps = {}) {
    ensureState(state);

    if (!state.player.matrix) {
        return { action: actionName, ignored: true };
    }

    if (actionName === "left") return movePiece(state, deps, -1);
    if (actionName === "right") return movePiece(state, deps, 1);
    if (actionName === "down") return dropPiece(state, deps, true);
    if (actionName === "rotate") return rotatePiece(state, deps, 1);
    if (actionName === "rotateReverse") return rotatePiece(state, deps, -1);
    if (actionName === "drop") return hardDrop(state, deps);
    if (actionName === "hold") return holdPiece(state, deps);

    return { action: actionName, ignored: true };
}

export function isGrounded(state, deps = {}) {
    if (!state.player.matrix) return false;
    state.player.pos.y++;
    const grounded = deps.collide(state.arena, state.player);
    state.player.pos.y--;
    return grounded;
}
