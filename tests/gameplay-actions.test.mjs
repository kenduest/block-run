import assert from "node:assert/strict";
import { applyAction } from "../game/src/core/gameplay-actions.js";

function createState(overrides = {}) {
    return {
        arena: [[0]],
        player: { matrix: [[1]], pos: { x: 4, y: 0 }, rotation: 0, type: "T", lastKickIndex: -1 },
        settings: { lockDelayMs: 500 },
        level: 1,
        previousLevel: 1,
        score: 0,
        lines: 0,
        combo: -1,
        maxCombo: -1,
        b2bChain: 0,
        piecesPlaced: 0,
        tetrisCount: 0,
        tspinCount: 0,
        perfectClearCount: 0,
        garbageCells: 0,
        lockCounter: 0,
        moveResetCount: 0,
        mode: "marathon",
        lastActionWasRotation: false,
        lastKickIndex: -1,
        ...overrides,
    };
}

function createDeps(overrides = {}) {
    return {
        collide: (_arena, player) => player.pos.y > 2,
        isGrounded: () => false,
        rotateWithSrs: (_arena, player) => {
            player.rotation = 1;
            player.lastKickIndex = 0;
            return true;
        },
        detectTspin: () => "full",
        merge: () => {},
        sweepArena: () => [],
        hasTopOut: () => false,
        countGarbageCells: () => 0,
        scoreClear: () => 400,
        ...overrides,
    };
}

// Rotating into place and then hard-dropping should still score as a T-spin.
{
    const state = createState();
    let detectCalls = 0;
    const deps = createDeps({
        detectTspin: () => {
            detectCalls += 1;
            return "full";
        },
    });

    const rotateResult = applyAction(state, "rotate", deps);
    assert.equal(rotateResult.rotated, true);

    const dropResult = applyAction(state, "drop", deps);

    assert.equal(dropResult.lockResult.tspin, "full");
    assert.equal(dropResult.lockResult.tspinCount, 1);
    assert.equal(detectCalls, 1);
}

console.log("gameplay-actions tests passed");
