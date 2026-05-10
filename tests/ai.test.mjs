import assert from "node:assert/strict";
import { chooseAutoMove } from "../src/ai.js";
import { createMatrix, createPiece } from "../src/rules.js";

const arena = createMatrix();
const player = {
    matrix: createPiece("T"),
    pos: { x: 3, y: 0 },
};

const move = chooseAutoMove(arena, player);

assert.equal(Number.isInteger(move.x), true);
assert.equal(Number.isInteger(move.rotation), true);
assert.equal(move.rotation >= 0 && move.rotation <= 3, true);
assert.equal(move.x >= -2 && move.x <= 10, true);
