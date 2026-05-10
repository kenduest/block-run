import { COLS, HIDDEN_ROWS, ROWS, createPiece } from "./rules.js";

const PALETTE = [
    null,
    { base: "#22d3ee", light: "#a7f3ff", deep: "#0891b2", glow: "rgba(34, 211, 238, 0.45)" },
    { base: "#fb923c", light: "#fed7aa", deep: "#c2410c", glow: "rgba(251, 146, 60, 0.40)" },
    { base: "#60a5fa", light: "#bfdbfe", deep: "#1d4ed8", glow: "rgba(96, 165, 250, 0.42)" },
    { base: "#facc15", light: "#fef3c7", deep: "#ca8a04", glow: "rgba(250, 204, 21, 0.40)" },
    { base: "#f87171", light: "#fecaca", deep: "#dc2626", glow: "rgba(248, 113, 113, 0.42)" },
    { base: "#4ade80", light: "#bbf7d0", deep: "#16a34a", glow: "rgba(74, 222, 128, 0.40)" },
    { base: "#c084fc", light: "#e9d5ff", deep: "#7e22ce", glow: "rgba(192, 132, 252, 0.42)" },
    { base: "#667085", light: "#98a2b3", deep: "#344054", glow: "rgba(152, 162, 179, 0.22)" },
];

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
    }

    configure(settings) {
        this.skin = settings.skin;
        this.effectsLevel = settings.effectsLevel;
    }

    resize() {
        this.cellSize = setupCanvas(this.boardCanvas, this.ctx, COLS, ROWS);
        this.previewCellSize = setupCanvas(this.nextCanvas, this.nextCtx, 4, 12);
        setupCanvas(this.holdCanvas, this.holdCtx, 4, 4);
    }

    render(state, ghostPos) {
        this.configure(state.settings);
        drawBoardBackground(this.ctx);
        drawGrid(this.ctx);
        drawMatrix(this.ctx, state.arena, { x: 0, y: -HIDDEN_ROWS }, this.cellSize, this.skin);
        if (state.player.matrix && state.settings.ghostEnabled && ghostPos) {
            drawGhostMatrix(this.ctx, state.player.matrix, { x: ghostPos.x, y: ghostPos.y - HIDDEN_ROWS }, this.cellSize);
        }
        if (state.player.matrix) {
            drawMatrix(this.ctx, state.player.matrix, { x: state.player.pos.x, y: state.player.pos.y - HIDDEN_ROWS }, this.cellSize, this.skin);
        }
        if (state.hiddenBlocksActive) drawHiddenOverlay(this.ctx);
        this.renderParticles();
    }

    renderPreviews(nextTypes, holdType, count = 3) {
        drawNextQueue(this.nextCtx, Array.isArray(nextTypes) ? nextTypes : [nextTypes], this.previewCellSize, this.skin, count);
        drawPreview(this.holdCtx, holdType, this.previewCellSize, this.skin);
    }

    burstLine(y, count = 18) {
        if (this.effectsLevel === "off") return;
        const visibleY = y - HIDDEN_ROWS;
        if (visibleY < 0 || visibleY >= ROWS) return;
        const multiplier = { low: 0.55, normal: 1, high: 1.55 }[this.effectsLevel] || 1;
        for (let i = 0; i < count * multiplier; i++) {
            this.particles.push({
                x: Math.random() * COLS,
                y: visibleY + 0.5,
                vx: (Math.random() - 0.5) * 0.12,
                vy: -Math.random() * 0.09 - 0.025,
                life: 420 + Math.random() * 280,
                age: 0,
                color: Math.random() > 0.5 ? "#24d98f" : "#38bdf8",
            });
        }
    }

    burstCenter(kind = "clear") {
        if (this.effectsLevel === "off") return;
        const count = kind === "tetris" ? 72 : kind === "gameover" ? 56 : 36;
        const color = kind === "gameover" ? "#fb7185" : kind === "level" ? "#facc15" : "#24d98f";
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 0.12 + 0.04;
            this.particles.push({
                x: COLS / 2,
                y: ROWS / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 520 + Math.random() * 360,
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

function drawBoardBackground(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, COLS, ROWS);
    gradient.addColorStop(0, "#0c1222");
    gradient.addColorStop(0.55, "#040817");
    gradient.addColorStop(1, "#02030a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, COLS, ROWS);
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

function drawMatrix(ctx, matrix, offset, pxSize, skin) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) drawCell(ctx, x + offset.x, y + offset.y, value, pxSize, skin);
        });
    });
}

function drawCell(ctx, x, y, value, pxSize, skin) {
    const style = PALETTE[value] || PALETTE[8];
    if (skin === "classic") return drawClassicCell(ctx, x, y, style, pxSize);
    if (skin === "flat") return drawFlatCell(ctx, x, y, style, pxSize);

    const inset = Math.max(0.045, 1.3 / pxSize);
    const radius = Math.max(0.08, 3.6 / pxSize);
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.48)";
    ctx.shadowBlur = 0.18;
    ctx.shadowOffsetY = 0.055;
    ctx.fillStyle = "rgba(0, 0, 0, 0.74)";
    roundedRect(ctx, x + inset * 0.7, y + inset, 1 - inset * 1.4, 1 - inset * 1.4, radius);
    ctx.fill();

    ctx.shadowColor = style.glow;
    ctx.shadowBlur = 0.22;
    const outer = ctx.createLinearGradient(x, y, x + 1, y + 1);
    outer.addColorStop(0, style.light);
    outer.addColorStop(0.2, style.base);
    outer.addColorStop(0.78, style.base);
    outer.addColorStop(1, style.deep);
    ctx.fillStyle = outer;
    roundedRect(ctx, x + inset, y + inset, 1 - inset * 2, 1 - inset * 2, radius);
    ctx.fill();

    ctx.shadowColor = "transparent";
    const shine = ctx.createRadialGradient(x + 0.32, y + 0.2, 0.04, x + 0.6, y + 0.64, 0.72);
    shine.addColorStop(0, "rgba(255, 255, 255, 0.62)");
    shine.addColorStop(0.34, "rgba(255, 255, 255, 0.12)");
    shine.addColorStop(1, "rgba(0, 0, 0, 0.28)");
    ctx.fillStyle = shine;
    roundedRect(ctx, x + inset * 2.2, y + inset * 2.2, 1 - inset * 4.4, 1 - inset * 4.4, radius * 0.72);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = Math.max(0.02, 1 / pxSize);
    roundedRect(ctx, x + inset, y + inset, 1 - inset * 2, 1 - inset * 2, radius);
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

function drawGhostMatrix(ctx, matrix, offset, pxSize) {
    ctx.save();
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) drawGhostCell(ctx, x + offset.x, y + offset.y, value, pxSize);
        });
    });
    ctx.restore();
}

function drawGhostCell(ctx, x, y, value, pxSize) {
    const style = PALETTE[value] || PALETTE[1];
    const inset = Math.max(0.14, 4 / pxSize);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    roundedRect(ctx, x + inset, y + inset, 1 - inset * 2, 1 - inset * 2, 0.08);
    ctx.fill();
    ctx.strokeStyle = style.base;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = Math.max(0.032, 1.6 / pxSize);
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
