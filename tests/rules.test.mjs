import assert from "node:assert/strict";
import {
    COLS,
    createMatrix,
    createPiece,
    createRng,
    detectTspin,
    hasTopOut,
    collide,
    isPerfectClear,
    merge,
    getKickTests,
    makeGarbage,
    pullFromBag,
    rotateWithSrs,
    scoreClear,
} from "../game/src/rules.js";

let bag = [];
const rng = createRng(1234);
const firstSeven = [];
for (let i = 0; i < 7; i++) {
    const pulled = pullFromBag(bag, rng);
    bag = pulled.bag;
    firstSeven.push(pulled.type);
}

assert.equal(new Set(firstSeven).size, 7);
assert.deepEqual([...firstSeven].sort(), ["I", "J", "L", "O", "S", "T", "Z"]);

const arena = createMatrix();
const player = {
    type: "T",
    matrix: createPiece("T"),
    rotation: 0,
    pos: { x: -1, y: 0 },
};
assert.equal(rotateWithSrs(arena, player, 1), true);
assert.equal(player.rotation, 1);
assert.equal(collide(arena, player), false);

assert.ok(getKickTests("I", 0, 1).some(([x]) => Math.abs(x) === 2));

makeGarbage(arena, 2, { pattern: [2, 7] });
assert.equal(arena.at(-2)[2], 0);
assert.equal(arena.at(-1)[7], 0);
assert.equal(arena.at(-1).filter(Boolean).length, COLS - 1);

const topOutArena = createMatrix();
const topOutPlayer = {
    type: "T",
    matrix: createPiece("T"),
    rotation: 0,
    pos: { x: 3, y: 0 },
};
merge(topOutArena, topOutPlayer);
assert.equal(hasTopOut(topOutArena), true);

const safeArena = createMatrix();
const safePlayer = {
    type: "O",
    matrix: createPiece("O"),
    rotation: 0,
    pos: { x: 4, y: 2 },
};
merge(safeArena, safePlayer);
assert.equal(hasTopOut(safeArena), false);

// scoreClear — base and B2B and Perfect Clear
assert.equal(scoreClear(1, 1, -1), 100);
assert.equal(scoreClear(4, 1, -1), 800);
assert.equal(scoreClear(4, 1, -1, { b2b: true }), 1200);
assert.equal(scoreClear(2, 2, -1, { tspin: "full" }), 1200 * 2);
assert.equal(scoreClear(2, 1, -1, { tspin: "full", b2b: true }), Math.floor(1200 * 1.5));
assert.equal(scoreClear(0, 1, -1, { tspin: "full" }), 400);
assert.equal(scoreClear(1, 1, -1, { tspin: "mini" }), 200);
assert.equal(scoreClear(1, 1, -1, { perfectClear: true }), 100 + 800);

// isPerfectClear
const emptyArena = createMatrix();
assert.equal(isPerfectClear(emptyArena), true);
emptyArena[3][3] = 1;
assert.equal(isPerfectClear(emptyArena), false);

// detectTspin — T-piece in pocket, 3-corner check
const tspinArena = createMatrix();
const bottom = tspinArena.length - 1;
// Build a small pocket so a T pointing down at (3, bottom-2) has 3 corners filled.
tspinArena[bottom][3] = 8;
tspinArena[bottom][5] = 8;
tspinArena[bottom - 2][3] = 8;
tspinArena[bottom - 2][5] = 8;
tspinArena[bottom - 1][5] = 8;
tspinArena[bottom - 1][3] = 8;
const tPiece = { type: "T", matrix: createPiece("T"), rotation: 2, pos: { x: 3, y: bottom - 2 } };
// Rotate the T matrix to point down (rotation 2).
const tspin = detectTspin(tspinArena, tPiece, 0);
assert.notEqual(tspin, "none");

// Non-T piece never reports T-spin.
const sPiece = { type: "S", matrix: createPiece("S"), rotation: 0, pos: { x: 0, y: 0 } };
assert.equal(detectTspin(tspinArena, sPiece, 4), "none");
