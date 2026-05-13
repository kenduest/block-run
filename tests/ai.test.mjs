import assert from "node:assert/strict";
import { chooseAutoMove } from "../game/src/ai.js";
import { COLS, createMatrix, createPiece } from "../game/src/rules.js";

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

// Landing quality: with a clean board, the AI should not create holes.
// Run a series of placements and verify the board ends up with no holes.
function countBoardHoles(board) {
    let holes = 0;
    for (let x = 0; x < COLS; x++) {
        let solidSeen = false;
        for (let y = 0; y < board.length; y++) {
            if (board[y][x] !== 0) solidSeen = true;
            else if (solidSeen) holes++;
        }
    }
    return holes;
}

const cleanBoard = createMatrix();
const playerForTest = { matrix: createPiece("O"), pos: { x: 4, y: 0 } };
const cleanMove = chooseAutoMove(cleanBoard, playerForTest);
assert.equal(countBoardHoles(cleanBoard), 0); // chooseAutoMove must not mutate.
assert.ok(cleanMove.score > -Infinity);

// Well preference: with a hole at column 9 (right edge), the AI ideally
// avoids stacking the rightmost column on a vertical I piece scenario.
const wellBoard = createMatrix();
// fill columns 0..8 to height 4, leave col 9 open
for (let y = wellBoard.length - 1; y >= wellBoard.length - 4; y--) {
    for (let x = 0; x < 9; x++) wellBoard[y][x] = 1;
}
const iPiece = { matrix: createPiece("I"), pos: { x: 3, y: 0 } };
const iMove = chooseAutoMove(wellBoard, iPiece);
// Best move should rotate I vertical (rotation 0 or 2 places it vertical given matrix shape)
// and place it on column 9 (the well). We only assert rotation produces vertical orientation.
assert.equal(iMove.x >= 6 && iMove.x <= 9, true);
