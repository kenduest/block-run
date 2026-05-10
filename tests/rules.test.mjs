import assert from "node:assert/strict";
import {
    COLS,
    createMatrix,
    createPiece,
    createRng,
    hasTopOut,
    collide,
    merge,
    getKickTests,
    makeGarbage,
    pullFromBag,
    rotateWithSrs,
} from "../src/rules.js";

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
