import assert from "node:assert/strict";
import { tick } from "../game/src/core/game-loop.js";

function createState(overrides = {}) {
    return {
        elapsedMs: 0,
        zoneActiveMs: 0,
        dropCounter: 0,
        lockCounter: 0,
        player: { matrix: [[1]], pos: { x: 4, y: 0 }, rotation: 0, type: "I" },
        arena: [[0]],
        settings: { dasMs: 100, arrMs: 16, softDropMultiplier: 20, lockDelayMs: 500 },
        ...overrides,
    };
}

// elapsedMs accumulates
{
    const state = createState();
    tick(state, 33, { keyState: {}, collide: () => true });
    assert.equal(state.elapsedMs, 33);
}

// DAS-then-ARR repeat
{
    const state = createState();
    const repeats = [];
    const keyState = { left: { down: true, das: 0, arr: 0 }, right: { down: false, das: 0, arr: 0 } };
    // Below DAS — no repeat
    tick(state, 50, {
        keyState,
        collide: () => true,
        applyAction: (action) => { repeats.push(action); return { moved: true }; },
    });
    assert.equal(repeats.length, 0);
    // Cross DAS — should fire repeats per ARR
    tick(state, 100, {
        keyState,
        collide: () => true,
        applyAction: (action) => { repeats.push(action); return { moved: true }; },
    });
    assert.ok(repeats.length >= 1, `expected repeats after DAS, got ${repeats.length}`);
    assert.ok(repeats.every(action => action === "left"));
}

// Instant DAS (ARR === 0): shifts until the action stops moving
{
    const state = createState({
        settings: { dasMs: 100, arrMs: 0, softDropMultiplier: 20, lockDelayMs: 500 },
    });
    const events = [];
    const keyState = { left: { down: true, das: 200, arr: 0 }, right: { down: false, das: 0, arr: 0 } };
    let movesLeft = 5;
    tick(state, 16, {
        keyState,
        collide: () => true,
        applyAction: (action) => {
            events.push(action);
            const moved = movesLeft-- > 0;
            return { moved };
        },
    });
    // 5 successful + 1 final failed shift = 6 events
    assert.equal(events.length, 6);
    assert.ok(events.every(action => action === "left"));
}

// Lock delay accumulates and triggers onLock when reached
{
    let lockCalled = 0;
    const state = createState();
    state.lockCounter = 0;
    // Make piece grounded (collide returns true when peeking one cell down).
    const result = tick(state, 100, {
        keyState: {},
        collide: () => true,
        onLock: () => { lockCalled++; return { ok: true }; },
    });
    // First grounded tick starts lock at counter=1; not yet >= 500ms
    assert.equal(result.lock?.locked, false);
    tick(state, 600, {
        keyState: {},
        collide: () => true,
        onLock: () => { lockCalled++; return { ok: true }; },
    });
    assert.equal(lockCalled, 1);
}

console.log("game-loop tests passed");
