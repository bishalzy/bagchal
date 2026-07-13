import { state } from './state.js';
import { CANVAS_SIZE, PADDING, BOARD_SIZE, GRID_SIZE, CELL_SIZE, C, POS, ALL_POS, ROWS, COLS } from './constants.js';
import { IMG_TIGER, IMG_GOAT } from './assets.js';
import { updateUI } from './ui.js';
import { getViewState, isReplaying } from './replay.js';

const coloredImages = {};
function getColoredImage(img, color, size) {
    if (!img.complete || img.naturalWidth === 0) return null;
    const key = img.src + color + size;
    if (coloredImages[key]) return coloredImages[key];

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    
    coloredImages[key] = canvas;
    return canvas;
}

/** Reapplies the scale transform so logical coords (0–CANVAS_SIZE) fill the canvas buffer. */
function prepareCtx(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ctx.canvas.width / CANVAS_SIZE, ctx.canvas.height / CANVAS_SIZE);
}

let cachedBoardCanvas = null;
let cachedBoardSize = 0;

export function drawBoard(ctx) {
    prepareCtx(ctx);

    if (!cachedBoardCanvas || cachedBoardSize !== CANVAS_SIZE) {
        cachedBoardCanvas = document.createElement('canvas');
        cachedBoardCanvas.width = CANVAS_SIZE;
        cachedBoardCanvas.height = CANVAS_SIZE;
        const oCtx = cachedBoardCanvas.getContext('2d');

        oCtx.fillStyle = C.boardBg;
        oCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        oCtx.strokeStyle = C.line;
        oCtx.lineWidth = 4;
        oCtx.lineCap = 'round';

        for (let i = 0; i <= GRID_SIZE; i++) {
            oCtx.beginPath();
            oCtx.moveTo(PADDING, i * CELL_SIZE + PADDING);
            oCtx.lineTo(BOARD_SIZE + PADDING, i * CELL_SIZE + PADDING);
            oCtx.stroke();

            oCtx.beginPath();
            oCtx.moveTo(i * CELL_SIZE + PADDING, PADDING);
            oCtx.lineTo(i * CELL_SIZE + PADDING, BOARD_SIZE + PADDING);
            oCtx.stroke();
        }

        oCtx.lineWidth = 4;
        oCtx.strokeStyle = C.line;
        const diags = [
            ['a5', 'e1'], ['e5', 'a1'],
            ['c5', 'e3'], ['e3', 'c1'], ['c1', 'a3'], ['a3', 'c5'],
        ];
        for (const [a, b] of diags) {
            oCtx.beginPath();
            oCtx.moveTo(POS[a].px, POS[a].py);
            oCtx.lineTo(POS[b].px, POS[b].py);
            oCtx.stroke();
        }

        oCtx.fillStyle = C.line;
        for (const key of ALL_POS) {
            oCtx.beginPath();
            oCtx.arc(POS[key].px, POS[key].py, 3, 0, Math.PI * 2);
            oCtx.fill();
        }

        oCtx.fillStyle = C.labelText;
        oCtx.font = '600 13px Inter, sans-serif';
        oCtx.textAlign = 'center';
        oCtx.textBaseline = 'middle';

        for (let r = 0; r < 5; r++) {
            oCtx.fillText(ROWS[r], PADDING / 2 - 2, POS[COLS[0] + ROWS[r]].py);
        }
        for (let c = 0; c < 5; c++) {
            oCtx.fillText(COLS[c], POS[COLS[c] + ROWS[0]].px, BOARD_SIZE + PADDING + PADDING / 2 + 2);
        }
        cachedBoardSize = CANVAS_SIZE;
    }

    ctx.drawImage(cachedBoardCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

export function drawPiece(ctx, key, type, isSelected) {
    const { px, py } = POS[key];
    const isTiger = type === 'bagh';
    let radius = isTiger ? 26 : 20;

    if (isSelected) {
        radius *= 1.2;
    }

    const img = isTiger ? IMG_TIGER : IMG_GOAT;

    if (img.complete && img.naturalWidth > 0) {
        const imgSize = Math.round(radius * 2);
        const color = isTiger ? '#ea580c' : '#38bdf8';
        const coloredImg = getColoredImage(img, color, imgSize);
        if (coloredImg) {
            ctx.drawImage(coloredImg, px - imgSize / 2, py - imgSize / 2, imgSize, imgSize);
        } else {
            ctx.drawImage(img, px - imgSize / 2, py - imgSize / 2, imgSize, imgSize);
        }
    } else {
        ctx.fillStyle = isTiger ? '#5d3a1a' : '#5d3a1a';
        ctx.font = `bold ${isTiger ? 16 : 13}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isTiger ? 'T' : 'G', px, py + 1);
    }
}

export function drawLegalMoves(ctx, isDragging = false, drag = null) {
    let isGoat = false;
    if (isDragging && drag) {
        isGoat = drag.pieceType === 'bakhra';
    } else if (state.selected) {
        isGoat = state.bakhras.has(state.selected);
    }

    const defaultDotColor = isGoat ? 'rgba(135, 206, 235, 0.7)' : C.legalDot; // Light blue for goat

    for (const move of state.legalMoves) {
        const { px, py } = POS[move.to];
        const isCapture = !!move.capture;
        const r = isCapture ? (isDragging ? 18 : 12) : (isDragging ? 14 : 8);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = isCapture ? C.captureDot : defaultDotColor;
        ctx.fill();
        ctx.strokeStyle = C.dotBorder;
        ctx.lineWidth = isDragging ? 2 : 1;
        ctx.stroke();
    }
}

export function drawAll(ctx) {
    const vs = getViewState();
    const replaying = isReplaying();
    drawBoard(ctx);

    // Draw last move highlight
    if (vs.lastMove) {
        let moveColor = 'rgba(255, 215, 64, 0.4)'; // Default gold

        if (vs.lastMove.from && vs.lastMove.to) {
            const isTiger = vs.baghs.has(vs.lastMove.to);
            const isGoat = vs.bakhras.has(vs.lastMove.to);
            if (isTiger) moveColor = 'rgba(234, 88, 12, 0.4)'; // Orange
            else if (isGoat) moveColor = 'rgba(56, 189, 248, 0.4)'; // Darker Sky blue

            // Draw line connecting move
            const start = POS[vs.lastMove.from];
            const end = POS[vs.lastMove.to];
            ctx.beginPath();
            ctx.moveTo(start.px, start.py);
            ctx.lineTo(end.px, end.py);
            ctx.lineWidth = 12;
            ctx.lineCap = 'round';
            ctx.strokeStyle = moveColor;
            ctx.stroke();
        }
    }

    if (!replaying) {
        drawLegalMoves(ctx, false);
    }
    for (const b of vs.baghs) {
        drawPiece(ctx, b, 'bagh', !replaying && state.selected === b);
    }
    for (const g of vs.bakhras) {
        drawPiece(ctx, g, 'bakhra', !replaying && state.selected === g);
    }
}

export function render(ctx) {
    drawAll(ctx);
    updateUI();
}

export function renderDragging(ctx, drag) {
    drawBoard(ctx);
    drawLegalMoves(ctx, true, drag);

    for (const b of state.baghs) {
        if (b === drag.pieceKey) continue;
        drawPiece(ctx, b, 'bagh', false);
    }
    for (const g of state.bakhras) {
        if (g === drag.pieceKey) continue;
        drawPiece(ctx, g, 'bakhra', false);
    }

    const isTiger = drag.pieceType === 'bagh';
    const img = isTiger ? IMG_TIGER : IMG_GOAT;
    const radius = isTiger ? 26 : 20;

    ctx.globalAlpha = 0.85;
    if (img.complete && img.naturalWidth > 0) {
        const imgSize = radius * 2;
        const color = isTiger ? '#ea580c' : '#38bdf8';
        const coloredImg = getColoredImage(img, color, imgSize);
        if (coloredImg) {
            ctx.drawImage(coloredImg, drag.mouseX - imgSize / 2, drag.mouseY - imgSize / 2, imgSize, imgSize);
        } else {
            ctx.drawImage(img, drag.mouseX - imgSize / 2, drag.mouseY - imgSize / 2, imgSize, imgSize);
        }
    } else {
        ctx.fillStyle = isTiger ? '#5d3a1a' : '#5d3a1a';
        ctx.font = `bold ${isTiger ? 16 : 13}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isTiger ? 'T' : 'G', drag.mouseX, drag.mouseY);
    }
    ctx.globalAlpha = 1.0;
}
