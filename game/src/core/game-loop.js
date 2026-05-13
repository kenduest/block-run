export function tick(state, deltaMs, deps = {}) {
    const deltaTime = Math.max(0, deltaMs || 0);
    if (!state) return {};

    state.elapsedMs += deltaTime;
    state.zoneActiveMs = Math.max(0, state.zoneActiveMs - deltaTime);

    const repeat = updateInputRepeat(state, deltaTime, deps);
    const modeEvents = typeof deps.updateModeEvents === "function"
        ? deps.updateModeEvents(state, deltaTime, deps)
        : null;
    const demo = runDemo(state, deltaTime, deps);

    const speed = typeof deps.getFallSpeed === "function"
        ? deps.getFallSpeed(state)
        : Number.POSITIVE_INFINITY;
    const softMultiplier = (deps.isSoftDropActive?.() ? (state.settings.softDropMultiplier || 1) : 1);

    state.dropCounter += deltaTime * softMultiplier;

    let softDropAction = null;
    if (state.dropCounter > speed) {
        softDropAction = typeof deps.applyAction === "function" ? deps.applyAction("down") : null;
    }

    const lock = updateLockDelay(state, deltaTime, deps);
    const result = typeof deps.evaluateResult === "function" ? deps.evaluateResult(state) : "playing";

    return {
        repeat,
        modeEvents,
        demo,
        softDropAction,
        lock,
        result,
    };
}

function updateInputRepeat(state, deltaTime, deps) {
    const keyState = deps.keyState || {};
    const settings = state.settings || {};
    const events = [];
    const INSTANT_DAS_LIMIT = 32;

    for (const name of ["left", "right"]) {
        const entry = keyState[name];
        if (!entry?.down) continue;

        entry.das += deltaTime;
        if (entry.das < (settings.dasMs || 0)) continue;

        const arrMs = Number(settings.arrMs);
        if (arrMs === 0) {
            // Instant DAS: shift to wall in one tick.
            let safety = INSTANT_DAS_LIMIT;
            while (safety-- > 0) {
                if (typeof deps.applyAction !== "function") break;
                const result = deps.applyAction(name, { source: "repeat" });
                events.push({ action: name, repeated: true });
                if (!result || result.moved === false) break;
            }
            entry.arr = 0;
            continue;
        }

        entry.arr += deltaTime;
        const interval = Math.max(1, arrMs);

        while (entry.arr >= interval) {
            entry.arr -= interval;
            events.push({ action: name, repeated: true });
            if (typeof deps.applyAction === "function") deps.applyAction(name, { source: "repeat" });
        }
    }

    return events;
}

function updateLockDelay(state, deltaTime, deps) {
    if (!state.player.matrix || !isGrounded(state, deps)) {
        state.lockCounter = 0;
        return { locked: false, waiting: false };
    }

    if (state.lockCounter <= 0) state.lockCounter = 1;
    state.lockCounter += deltaTime;

    if (state.lockCounter >= (state.settings?.lockDelayMs || 0)) {
        if (typeof deps.onLock === "function") {
            return {
                locked: true,
                waiting: false,
                data: deps.onLock(),
            };
        }
        return { locked: true, waiting: false };
    }

    return { locked: false, waiting: true };
}

function isGrounded(state, deps) {
    if (!state.player.matrix) return false;
    state.player.pos.y++;
    const grounded = deps.collide(state.arena, state.player);
    state.player.pos.y--;
    return grounded;
}

function runDemo(state, deltaTime, deps) {
    if (!state.demo?.enabled || !state.player.matrix) return { active: false };
    if (!deps.chooseAutoMove || !deps.reachedAutoMove || !deps.applyAction) {
        return { active: false, blocked: true };
    }

    state.demo.stepMs += deltaTime;
    if (state.demo.stepMs < 95) return { active: true, skipped: true };
    state.demo.stepMs = 0;

    state.demo.move = state.demo.move || deps.chooseAutoMove(state.arena, state.player);
    const target = state.demo.move || { x: state.player.pos.x, rotation: 0 };

    const actionInfo = { active: true };

    if (target.rotation > 0) {
        deps.applyAction("rotate", { source: "demo" });
        target.rotation -= 1;
        actionInfo.action = "rotate";
        state.demo.move = target;
        return actionInfo;
    }

    if (state.player.pos.x < target.x) {
        deps.applyAction("right", { source: "demo" });
        actionInfo.action = "right";
        return actionInfo;
    }

    if (state.player.pos.x > target.x) {
        deps.applyAction("left", { source: "demo" });
        actionInfo.action = "left";
        return actionInfo;
    }

    if (deps.reachedAutoMove(state.player, target)) {
        deps.applyAction("drop", { source: "demo", forceHardDrop: true });
        actionInfo.action = "drop";
        actionInfo.hardDrop = true;
    }

    return actionInfo;
}
