export const COLS = 10;
export const VISIBLE_ROWS = 20;
export const HIDDEN_ROWS = 2;
export const ROWS = VISIBLE_ROWS;
export const ARENA_ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

export const PIECES = {
    I: [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    L: [[0, 2, 0], [0, 2, 0], [0, 2, 2]],
    J: [[0, 3, 0], [0, 3, 0], [3, 3, 0]],
    O: [[4, 4], [4, 4]],
    Z: [[5, 5, 0], [0, 5, 5], [0, 0, 0]],
    S: [[0, 6, 6], [6, 6, 0], [0, 0, 0]],
    T: [[0, 7, 0], [7, 7, 7], [0, 0, 0]],
};

export function createMatrix(width = COLS, height = ARENA_ROWS) {
    return Array.from({ length: height }, () => Array(width).fill(0));
}

export function cloneMatrix(matrix) {
    return matrix.map(row => row.slice());
}

export function createPiece(type) {
    return cloneMatrix(PIECES[type]);
}

export function createRng(seed = Date.now()) {
    let value = Number.isFinite(seed) ? seed >>> 0 : hashSeed(String(seed));
    return () => {
        value = (value * 1664525 + 1013904223) >>> 0;
        return value / 4294967296;
    };
}

export function hashSeed(input) {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function refillBag(bag, rng = Math.random) {
    if (bag.length) return bag;
    const next = Object.keys(PIECES);
    for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
}

export function pullFromBag(bag, rng = Math.random) {
    const source = refillBag(bag, rng);
    return { type: source.pop(), bag: source };
}

export function collide(arena, player) {
    const matrix = player.matrix;
    const pos = player.pos;
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            if (matrix[y][x] !== 0 && (arena[y + pos.y] && arena[y + pos.y][x + pos.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

export function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0 && arena[y + player.pos.y]) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

export function hasTopOut(arena) {
    for (let y = 0; y < HIDDEN_ROWS; y++) {
        if (arena[y]?.some(value => value !== 0)) return true;
    }
    return false;
}

export function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < y; x++) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
}

const JLSTZ_KICKS = {
    "0>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "1>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    "1>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    "2>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "2>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    "3>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "3>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "0>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

const I_KICKS = {
    "0>1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    "1>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    "1>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    "2>1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    "2>3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    "3>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    "3>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    "0>3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

export function rotateWithSrs(arena, player, dir) {
    if (player.type === "O") return true;
    const from = player.rotation || 0;
    const to = (from + (dir > 0 ? 1 : 3)) % 4;
    const originalX = player.pos.x;
    const originalY = player.pos.y;
    rotate(player.matrix, dir);

    const kicks = getKickTests(player.type, from, to);
    for (const [x, y] of kicks) {
        player.pos.x = originalX + x;
        player.pos.y = originalY - y;
        if (!collide(arena, player)) {
            player.rotation = to;
            return true;
        }
    }

    rotate(player.matrix, -dir);
    player.pos.x = originalX;
    player.pos.y = originalY;
    return false;
}

export function getKickTests(type, from, to) {
    const key = `${from}>${to}`;
    if (type === "I") return I_KICKS[key] || [[0, 0]];
    return JLSTZ_KICKS[key] || [[0, 0]];
}

export function sweepArena(arena) {
    const clearedRows = [];
    outer: for (let y = arena.length - 1; y >= 0; y--) {
        for (let x = 0; x < arena[y].length; x++) {
            if (arena[y][x] === 0) continue outer;
        }
        clearedRows.push(y);
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        y++;
    }
    return clearedRows;
}

export function getGhostPosition(arena, player) {
    const ghost = {
        matrix: player.matrix,
        pos: { x: player.pos.x, y: player.pos.y },
    };
    while (!collide(arena, ghost)) ghost.pos.y++;
    ghost.pos.y--;
    return ghost.pos;
}

export function makeGarbage(arena, rows, options = {}) {
    const rng = options.rng || Math.random;
    const pattern = options.pattern || [];
    for (let i = 0; i < rows; i++) {
        arena.shift();
        const gap = pattern.length ? pattern[i % pattern.length] % COLS : Math.floor(rng() * COLS);
        arena.push(Array.from({ length: COLS }, (_, x) => (x === gap ? 0 : 8)));
    }
}

export function scoreClear(cleared, level, combo) {
    const base = [0, 100, 300, 500, 800][cleared] || 0;
    return base * level + Math.max(0, combo) * 50;
}

export function countGarbageCells(arena) {
    return arena.reduce((sum, row) => sum + row.filter(value => value === 8).length, 0);
}
