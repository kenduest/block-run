import { COLS, cloneMatrix, collide, merge, rotate, sweepArena } from "./rules.js";

export function chooseAutoMove(arena, player) {
    let best = null;

    for (let rotation = 0; rotation < 4; rotation++) {
        const matrix = cloneMatrix(player.matrix);
        for (let i = 0; i < rotation; i++) rotate(matrix, 1);

        for (let x = -matrix[0].length; x < COLS + matrix[0].length; x++) {
            const candidate = { matrix, pos: { x, y: 0 } };
            if (collide(arena, candidate)) continue;
            while (!collide(arena, candidate)) candidate.pos.y++;
            candidate.pos.y--;
            if (candidate.pos.y < 0) continue;

            const score = evaluateLanding(arena, candidate);
            if (!best || score > best.score) best = { x, rotation, score };
        }
    }

    return best || { x: player.pos.x, rotation: 0, score: -Infinity };
}

export function reachedAutoMove(player, move) {
    return player.pos.x === move.x;
}

function evaluateLanding(arena, player) {
    const clone = arena.map(row => row.slice());
    merge(clone, player);
    const cleared = sweepArena(clone).length;
    const heights = columnHeights(clone);
    const aggregateHeight = heights.reduce((sum, height) => sum + height, 0);
    const maxHeight = Math.max(...heights);
    const holes = countHoles(clone, heights);
    const bumpiness = heights.slice(1).reduce((sum, height, index) => sum + Math.abs(height - heights[index]), 0);
    return cleared * 1100 - aggregateHeight * 38 - holes * 620 - bumpiness * 26 - maxHeight * 18;
}

function columnHeights(arena) {
    return Array.from({ length: COLS }, (_, x) => {
        for (let y = 0; y < arena.length; y++) {
            if (arena[y][x] !== 0) return arena.length - y;
        }
        return 0;
    });
}

function countHoles(arena, heights) {
    let holes = 0;
    for (let x = 0; x < COLS; x++) {
        const start = arena.length - heights[x];
        for (let y = start; y < arena.length; y++) {
            if (arena[y][x] === 0) holes++;
        }
    }
    return holes;
}
