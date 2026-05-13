import { COLS, HIDDEN_ROWS, ROWS, createPiece } from "./rules.js?v=__APP_VERSION__";

const PALETTES = {
    off: [
        null,
        { base: "#22d3ee", light: "#a7f3ff", deep: "#0891b2", glow: "rgba(34, 211, 238, 0.45)" },
        { base: "#fb923c", light: "#fed7aa", deep: "#c2410c", glow: "rgba(251, 146, 60, 0.40)" },
        { base: "#60a5fa", light: "#bfdbfe", deep: "#1d4ed8", glow: "rgba(96, 165, 250, 0.42)" },
        { base: "#facc15", light: "#fef3c7", deep: "#ca8a04", glow: "rgba(250, 204, 21, 0.40)" },
        { base: "#f87171", light: "#fecaca", deep: "#dc2626", glow: "rgba(248, 113, 113, 0.42)" },
        { base: "#4ade80", light: "#bbf7d0", deep: "#16a34a", glow: "rgba(74, 222, 128, 0.40)" },
        { base: "#c084fc", light: "#e9d5ff", deep: "#7e22ce", glow: "rgba(192, 132, 252, 0.42)" },
        { base: "#667085", light: "#98a2b3", deep: "#344054", glow: "rgba(152, 162, 179, 0.22)" },
    ],
    // Deuteranopia (red-green): keep blue/yellow/orange spectrum, avoid pure green/red.
    deutan: [
        null,
        { base: "#2dd4ff", light: "#bce6ff", deep: "#0277a8", glow: "rgba(45, 212, 255, 0.45)" },
        { base: "#f59e0b", light: "#fed7aa", deep: "#92400e", glow: "rgba(245, 158, 11, 0.45)" },
        { base: "#3b82f6", light: "#bfdbfe", deep: "#1e3a8a", glow: "rgba(59, 130, 246, 0.45)" },
        { base: "#facc15", light: "#fef3c7", deep: "#854d0e", glow: "rgba(250, 204, 21, 0.45)" },
        { base: "#e879f9", light: "#f5d0fe", deep: "#86198f", glow: "rgba(232, 121, 249, 0.45)" },
        { base: "#cbd5e1", light: "#f1f5f9", deep: "#475569", glow: "rgba(203, 213, 225, 0.4)" },
        { base: "#f97316", light: "#fed7aa", deep: "#9a3412", glow: "rgba(249, 115, 22, 0.5)" },
        { base: "#667085", light: "#98a2b3", deep: "#344054", glow: "rgba(152, 162, 179, 0.22)" },
    ],
    // Protanopia (red weakness): boost yellow/blue contrast, soften reds.
    protan: [
        null,
        { base: "#06b6d4", light: "#a7f3ff", deep: "#0e7490", glow: "rgba(6, 182, 212, 0.45)" },
        { base: "#fcd34d", light: "#fef3c7", deep: "#a16207", glow: "rgba(252, 211, 77, 0.45)" },
        { base: "#1d4ed8", light: "#93c5fd", deep: "#1e3a8a", glow: "rgba(29, 78, 216, 0.45)" },
        { base: "#fde047", light: "#fef9c3", deep: "#854d0e", glow: "rgba(253, 224, 71, 0.45)" },
        { base: "#a78bfa", light: "#e9d5ff", deep: "#6d28d9", glow: "rgba(167, 139, 250, 0.45)" },
        { base: "#94a3b8", light: "#e2e8f0", deep: "#475569", glow: "rgba(148, 163, 184, 0.4)" },
        { base: "#fb923c", light: "#fed7aa", deep: "#9a3412", glow: "rgba(251, 146, 60, 0.5)" },
        { base: "#667085", light: "#98a2b3", deep: "#344054", glow: "rgba(152, 162, 179, 0.22)" },
    ],
    // Tritanopia (blue-yellow weakness): keep red/cyan separation, avoid blue/yellow conflicts.
    tritan: [
        null,
        { base: "#22d3ee", light: "#a7f3ff", deep: "#0891b2", glow: "rgba(34, 211, 238, 0.45)" },
        { base: "#fb7185", light: "#fecdd3", deep: "#9f1239", glow: "rgba(251, 113, 133, 0.45)" },
        { base: "#a855f7", light: "#e9d5ff", deep: "#6b21a8", glow: "rgba(168, 85, 247, 0.45)" },
        { base: "#fef08a", light: "#fef9c3", deep: "#854d0e", glow: "rgba(254, 240, 138, 0.4)" },
        { base: "#dc2626", light: "#fecaca", deep: "#7f1d1d", glow: "rgba(220, 38, 38, 0.5)" },
        { base: "#10b981", light: "#bbf7d0", deep: "#065f46", glow: "rgba(16, 185, 129, 0.45)" },
        { base: "#f472b6", light: "#fbcfe8", deep: "#9d174d", glow: "rgba(244, 114, 182, 0.45)" },
        { base: "#667085", light: "#98a2b3", deep: "#344054", glow: "rgba(152, 162, 179, 0.22)" },
    ],
};

const LINE_BURST_COLORS = {
    clear: ["#24d98f", "#38bdf8"],
    tetris: ["#fde047", "#fbbf24", "#fb923c"],
    tspin: ["#c084fc", "#e879f9", "#f9a8d4"],
    perfect: ["#fef9c3", "#fde68a", "#a7f3d0", "#bae6fd"],
};

const CENTER_BURST_SETTINGS = {
    clear: { count: 36, color: "#24d98f", minSpeed: 0.04, maxSpeed: 0.16, life: 520 },
    tetris: { count: 72, color: "#fbbf24", minSpeed: 0.05, maxSpeed: 0.22, life: 620 },
    tspin: { count: 60, color: "#d8b4fe", minSpeed: 0.05, maxSpeed: 0.2, life: 600 },
    perfect: { count: 96, color: "#fef9c3", minSpeed: 0.06, maxSpeed: 0.26, life: 720 },
    level: { count: 36, color: "#facc15", minSpeed: 0.04, maxSpeed: 0.16, life: 520 },
    gameover: { count: 56, color: "#fb7185", minSpeed: 0.04, maxSpeed: 0.18, life: 520 },
};

let PALETTE = PALETTES.off;

function selectPalette(mode) {
    return PALETTES[mode] || PALETTES.off;
}

export class Renderer {
    constructor(boardCanvas, nextCanvas, holdCanvas) {
        this.boardCanvas = boardCanvas;
        this.ctx = boardCanvas.getContext("2d");
        this.nextCanvas = nextCanvas;
        this.nextCtx = nextCanvas.getContext("2d");
        this.holdCanvas = holdCanvas;
        this.holdCtx = holdCanvas.getContext("2d");
        this.particles = [];
        this.cellSize = 32;
        this.previewCellSize = 28;
        this.skin = "premium";
        this.effectsLevel = "normal";
        this.colorBlindMode = "off";
        this.ghostDangerPulse = true;
        this.dangerPulse = false;
        this.boardFlashUntil = 0;
        this.cachedBoardGradient = null;
        this.cachedBoardGradientSize = null;
        this.cellGradientCache = new Map();
    }

    configure(settings) {
        this.skin = settings.skin;
        this.effectsLevel = settings.effectsLevel;
        const nextColorMode = settings.colorBlindMode || "off";
        if (nextColorMode !== this.colorBlindMode) {
            this.colorBlindMode = nextColorMode;
            PALETTE = selectPalette(nextColorMode);
            this.cellGradientCache.clear();
        }
        this.ghostDangerPulse = settings.ghostDangerPulse !== false;
    }

    resize() {
        this.cellSize = setupCanvas(this.boardCanvas, this.ctx, COLS, ROWS);
        this.previewCellSize = setupCanvas(this.nextCanvas, this.nextCtx, 4, 12);
        setupCanvas(this.holdCanvas, this.holdCtx, 4, 4);
        this.cachedBoardGradient = null;
        this.cellGradientCache.clear();
    }

    render(state, ghostPos) {
        this.configure(state.settings);
        const visibleTop = state.player.matrix ? state.player.pos.y - HIDDEN_ROWS : Infinity;
        this.dangerPulse = this.ghostDangerPulse && visibleTop <= 2;
        this.drawBoardBackground();
        drawGrid(this.ctx);
        drawMatrix(this.ctx, state.arena, { x: 0, y: -HIDDEN_ROWS }, this.cellSize, this.skin, this);
        if (state.player.matrix && state.settings.ghostEnabled && ghostPos) {
            drawGhostMatrix(this.ctx, state.player.matrix, { x: ghostPos.x, y: ghostPos.y - HIDDEN_ROWS }, this.cellSize, this.dangerPulse);
        }
        if (state.player.matrix) {
            drawMatrix(this.ctx, state.player.matrix, { x: state.player.pos.x, y: state.player.pos.y - HIDDEN_ROWS }, this.cellSize, this.skin, this);
        }
        if (state.hiddenBlocksActive) drawHiddenOverlay(this.ctx);
        this.drawBoardFlash();
        this.renderParticles();
    }

    drawBoardBackground() {
        const ctx = this.ctx;
        if (!this.cachedBoardGradient) {
            const gradient = ctx.createLinearGradient(0, 0, COLS, ROWS);
            gradient.addColorStop(0, "#0c1222");
            gradient.addColorStop(0.55, "#040817");
            gradient.addColorStop(1, "#02030a");
            this.cachedBoardGradient = gradient;
        }
        ctx.fillStyle = this.cachedBoardGradient;
        ctx.fillRect(0, 0, COLS, ROWS);
    }

    drawBoardFlash() {
        const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
        if (now < this.boardFlashUntil) {
            const remaining = (this.boardFlashUntil - now) / 600;
            const alpha = Math.max(0, Math.min(0.55, remaining * 0.55));
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = "#fef9c3";
            this.ctx.fillRect(0, 0, COLS, ROWS);
            this.ctx.restore();
        }
    }

    getCellGradients(value) {
        const key = `${this.skin}:${value}:${this.colorBlindMode}`;
        let entry = this.cellGradientCache.get(key);
        if (entry) return entry;
        const style = PALETTE[value] || PALETTE[8];
        const ctx = this.ctx;
        const outer = ctx.createLinearGradient(0, 0, 1, 1);
        outer.addColorStop(0, style.light);
        outer.addColorStop(0.2, style.base);
        outer.addColorStop(0.78, style.base);
        outer.addColorStop(1, style.deep);
        const shine = ctx.createRadialGradient(0.32, 0.2, 0.04, 0.6, 0.64, 0.72);
        shine.addColorStop(0, "rgba(255, 255, 255, 0.62)");
        shine.addColorStop(0.34, "rgba(255, 255, 255, 0.12)");
        shine.addColorStop(1, "rgba(0, 0, 0, 0.28)");
        entry = { style, outer, shine };
        this.cellGradientCache.set(key, entry);
        return entry;
    }

    renderPreviews(nextTypes, holdType, count = 3) {
        drawNextQueue(this.nextCtx, Array.isArray(nextTypes) ? nextTypes : [nextTypes], this.previewCellSize, this.skin, count);
        drawPreview(this.holdCtx, holdType, this.previewCellSize, this.skin);
    }

    burstLine(y, count = 18, kind = "clear") {
        if (this.effectsLevel === "off") return;
        const visibleY = y - HIDDEN_ROWS;
        if (visibleY < 0 || visibleY >= ROWS) return;
        const multiplier = { low: 0.55, normal: 1, high: 1.55 }[this.effectsLevel] || 1;
        const palette = LINE_BURST_COLORS[kind] || LINE_BURST_COLORS.clear;
        for (let i = 0; i < count * multiplier; i++) {
            this.particles.push({
                x: Math.random() * COLS,
                y: visibleY + 0.5,
                vx: (Math.random() - 0.5) * 0.12,
                vy: -Math.random() * 0.09 - 0.025,
                life: 420 + Math.random() * 280,
                age: 0,
                color: palette[Math.floor(Math.random() * palette.length)],
            });
        }
    }

    burstCenter(kind = "clear") {
        if (this.effectsLevel === "off") return;
        const settings = CENTER_BURST_SETTINGS[kind] || CENTER_BURST_SETTINGS.clear;
        const count = settings.count;
        const color = settings.color;
        if (kind === "perfect") this.boardFlashUntil = (performance?.now?.() || Date.now()) + 600;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * (settings.maxSpeed - settings.minSpeed) + settings.minSpeed;
            this.particles.push({
                x: COLS / 2,
                y: ROWS / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: settings.life + Math.random() * 360,
                age: 0,
                color,
            });
        }
    }

    tickParticles(deltaMs) {
        for (const particle of this.particles) {
            particle.age += deltaMs;
            particle.x += particle.vx * deltaMs * 0.06;
            particle.y += particle.vy * deltaMs * 0.06;
            particle.vy += 0.0002 * deltaMs;
        }
        this.particles = this.particles.filter(particle => particle.age < particle.life);
    }

    renderParticles() {
        for (const particle of this.particles) {
            const alpha = Math.max(0, 1 - particle.age / particle.life);
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = 0.22;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 0.055 + alpha * 0.045, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }
}

function setupCanvas(canvas, ctx, logicalWidth, logicalHeight) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    const displayWidth = Math.max(1, Math.round(rect.width));
    const displayHeight = Math.max(1, Math.round(rect.height));
    const pixelWidth = Math.round(displayWidth * ratio);
    const pixelHeight = Math.round(displayHeight * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
    }
    ctx.setTransform(pixelWidth / logicalWidth, 0, 0, pixelHeight / logicalHeight, 0, 0);
    return pixelWidth / logicalWidth;
}

function drawGrid(ctx) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
    ctx.lineWidth = 0.024;
    for (let x = 1; x < COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ROWS);
        ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(COLS, y);
        ctx.stroke();
    }
}

function drawPreview(ctx, type, pxSize, skin) {
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, 4, 4);
    if (!type) return;
    const matrix = createPiece(type);
    const width = matrix[0].length;
    const height = matrix.length;
    drawMatrix(ctx, matrix, { x: (4 - width) / 2, y: (4 - height) / 2 }, pxSize, skin);
}

function drawNextQueue(ctx, types, pxSize, skin, count) {
    const visible = types.slice(0, count);
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, 4, 12);
    visible.forEach((type, index) => {
        if (!type) return;
        const matrix = createPiece(type);
        const width = matrix[0].length;
        const height = matrix.length;
        const slotY = index * 4;
        drawMatrix(ctx, matrix, { x: (4 - width) / 2, y: slotY + (4 - height) / 2 }, pxSize, skin);
    });
}

function drawMatrix(ctx, matrix, offset, pxSize, skin, renderer = null) {
    for (let y = 0; y < matrix.length; y++) {
        const row = matrix[y];
        for (let x = 0; x < row.length; x++) {
            const value = row[x];
            if (value !== 0) drawCell(ctx, x + offset.x, y + offset.y, value, pxSize, skin, renderer);
        }
    }
}

function drawCell(ctx, x, y, value, pxSize, skin, renderer = null) {
    const style = PALETTE[value] || PALETTE[8];
    if (skin === "classic") return drawClassicCell(ctx, x, y, style, pxSize);
    if (skin === "flat") return drawFlatCell(ctx, x, y, style, pxSize);

    const inset = Math.max(0.045, 1.3 / pxSize);
    const radius = Math.max(0.08, 3.6 / pxSize);
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = "rgba(0, 0, 0, 0.48)";
    ctx.shadowBlur = 0.18;
    ctx.shadowOffsetY = 0.055;
    ctx.fillStyle = "rgba(0, 0, 0, 0.74)";
    roundedRect(ctx, inset * 0.7, inset, 1 - inset * 1.4, 1 - inset * 1.4, radius);
    ctx.fill();

    ctx.shadowColor = style.glow;
    ctx.shadowBlur = 0.22;
    const cache = renderer ? renderer.getCellGradients(value) : null;
    if (cache) {
        ctx.fillStyle = cache.outer;
    } else {
        const outer = ctx.createLinearGradient(0, 0, 1, 1);
        outer.addColorStop(0, style.light);
        outer.addColorStop(0.2, style.base);
        outer.addColorStop(0.78, style.base);
        outer.addColorStop(1, style.deep);
        ctx.fillStyle = outer;
    }
    roundedRect(ctx, inset, inset, 1 - inset * 2, 1 - inset * 2, radius);
    ctx.fill();

    ctx.shadowColor = "transparent";
    if (cache) {
        ctx.fillStyle = cache.shine;
    } else {
        const shine = ctx.createRadialGradient(0.32, 0.2, 0.04, 0.6, 0.64, 0.72);
        shine.addColorStop(0, "rgba(255, 255, 255, 0.62)");
        shine.addColorStop(0.34, "rgba(255, 255, 255, 0.12)");
        shine.addColorStop(1, "rgba(0, 0, 0, 0.28)");
        ctx.fillStyle = shine;
    }
    roundedRect(ctx, inset * 2.2, inset * 2.2, 1 - inset * 4.4, 1 - inset * 4.4, radius * 0.72);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = Math.max(0.02, 1 / pxSize);
    roundedRect(ctx, inset, inset, 1 - inset * 2, 1 - inset * 2, radius);
    ctx.stroke();
    ctx.restore();
}

function drawFlatCell(ctx, x, y, style, pxSize) {
    const inset = Math.max(0.06, 1.6 / pxSize);
    ctx.save();
    ctx.fillStyle = style.base;
    ctx.fillRect(x + inset, y + inset, 1 - inset * 2, 1 - inset * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fillRect(x + inset, y + inset, 1 - inset * 2, 0.18);
    ctx.strokeStyle = style.light;
    ctx.lineWidth = Math.max(0.018, 1 / pxSize);
    ctx.strokeRect(x + inset, y + inset, 1 - inset * 2, 1 - inset * 2);
    ctx.restore();
}

function drawClassicCell(ctx, x, y, style, pxSize) {
    const inset = Math.max(0.03, 1 / pxSize);
    ctx.save();
    ctx.fillStyle = style.base;
    ctx.fillRect(x + inset, y + inset, 1 - inset * 2, 1 - inset * 2);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.48)";
    ctx.lineWidth = Math.max(0.02, 1 / pxSize);
    ctx.strokeRect(x + inset, y + inset, 1 - inset * 2, 1 - inset * 2);
    ctx.restore();
}

function drawGhostMatrix(ctx, matrix, offset, pxSize, dangerPulse = false) {
    ctx.save();
    const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    const pulse = dangerPulse ? 0.5 + 0.5 * Math.sin(now / 240) : 0;
    const strokeAlpha = dangerPulse ? 0.85 + pulse * 0.1 : 0.85;
    const strokeColor = dangerPulse ? "#fb7185" : null;
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) drawGhostCell(ctx, x + offset.x, y + offset.y, value, pxSize, strokeAlpha, strokeColor);
        });
    });
    ctx.restore();
}

function drawGhostCell(ctx, x, y, value, pxSize, strokeAlpha = 0.85, strokeColor = null) {
    const style = PALETTE[value] || PALETTE[1];
    const inset = Math.max(0.14, 4 / pxSize);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    roundedRect(ctx, x + inset, y + inset, 1 - inset * 2, 1 - inset * 2, 0.08);
    ctx.fill();
    ctx.strokeStyle = strokeColor || style.base;
    ctx.globalAlpha = strokeAlpha;
    ctx.lineWidth = Math.max(0.036, 1.8 / pxSize);
    ctx.setLineDash([0.14, 0.12]);
    roundedRect(ctx, x + inset, y + inset, 1 - inset * 2, 1 - inset * 2, 0.08);
    ctx.stroke();
}

function drawHiddenOverlay(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(3, 7, 18, 0.62)";
    ctx.fillRect(0, 0, COLS, ROWS);
    ctx.strokeStyle = "rgba(250, 204, 21, 0.36)";
    ctx.lineWidth = 0.05;
    ctx.setLineDash([0.24, 0.18]);
    for (let y = 2; y < ROWS; y += 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(COLS, y + 1.8);
        ctx.stroke();
    }
    ctx.restore();
}

function roundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}
