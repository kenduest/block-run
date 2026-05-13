import { COLS, cloneMatrix, collide, merge, rotate, sweepArena } from "./rules.js?v=__APP_VERSION__";

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
    const { holes, holeDepth } = countHoles(clone, heights);
    const bumpiness = heights.slice(1).reduce((sum, height, index) => sum + Math.abs(height - heights[index]), 0);
    const well = wellBonus(heights);
    const edgeBalance = edgeClearance(heights);
    return cleared * 1100
        + (cleared === 4 ? 600 : 0) // reward setups that produce a Tetris
        - aggregateHeight * 38
        - holes * 620
        - holeDepth * 90 // deep holes hurt more than shallow ones
        - bumpiness * 24
        - maxHeight * 18
        + well * 60
        + edgeBalance * 22;
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
    let holeDepth = 0;
    for (let x = 0; x < COLS; x++) {
        const start = arena.length - heights[x];
        for (let y = start; y < arena.length; y++) {
            if (arena[y][x] === 0) {
                holes++;
                // depth = how many filled cells sit above this hole
                holeDepth += y - start;
            }
        }
    }
    return { holes, holeDepth };
}

function wellBonus(heights) {
    // Reward a single deep column (good for Tetris). Penalise multiple wells.
    let bestWellDepth = 0;
    let wellCount = 0;
    for (let i = 0; i < heights.length; i++) {
        const left = i === 0 ? Infinity : heights[i - 1];
        const right = i === heights.length - 1 ? Infinity : heights[i + 1];
        const depth = Math.min(left, right) - heights[i];
        if (depth >= 3) {
            wellCount++;
            if (depth > bestWellDepth) bestWellDepth = depth;
        }
    }
    if (wellCount === 0) return 0;
    if (wellCount === 1) return bestWellDepth;
    return bestWellDepth - (wellCount - 1) * 2;
}

function edgeClearance(heights) {
    // Slight preference for keeping the rightmost column low — a common Tetris well slot.
    const right = heights[heights.length - 1];
    const average = heights.reduce((sum, value) => sum + value, 0) / heights.length;
    return Math.max(0, average - right);
}
