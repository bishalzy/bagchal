import { state } from './state.js';
import { CANVAS_SIZE, PADDING, BOARD_SIZE, GRID_SIZE, CELL_SIZE, C, POS, ALL_POS, ROWS, COLS } from './constants.js';
import { IMG_TIGER, IMG_GOAT } from './assets.js';
import { updateUI } from './ui.js';

export function drawBoard(ctx) {
    const grad = ctx.createRadialGradient(
        CANVAS_SIZE / 2, CANVAS_SIZE / 2, 50,
        CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE
    );
    grad.addColorStop(0, C.boardBg);
    grad.addColorStop(1, C.boardBgEdge);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = C.line;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(PADDING, i * CELL_SIZE + PADDING);
        ctx.lineTo(BOARD_SIZE + PADDING, i * CELL_SIZE + PADDING);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE + PADDING, PADDING);
        ctx.lineTo(i * CELL_SIZE + PADDING, BOARD_SIZE + PADDING);
        ctx.stroke();
    }

    ctx.lineWidth = 3;
    ctx.strokeStyle = C.lineThin;
    const diags = [
        ['a5', 'e1'], ['e5', 'a1'],
        ['c5', 'e3'], ['e3', 'c1'], ['c1', 'a3'], ['a3', 'c5'],
    ];
    for (const [a, b] of diags) {
        ctx.beginPath();
        ctx.moveTo(POS[a].px, POS[a].py);
        ctx.lineTo(POS[b].px, POS[b].py);
        ctx.stroke();
    }

    ctx.fillStyle = C.line;
    for (const key of ALL_POS) {
        ctx.beginPath();
        ctx.arc(POS[key].px, POS[key].py, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = C.labelText;
    ctx.font = '600 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let r = 0; r < 5; r++) {
        ctx.fillText(ROWS[r], PADDING / 2 - 2, POS[COLS[0] + ROWS[r]].py);
    }
    for (let c = 0; c < 5; c++) {
        ctx.fillText(COLS[c], POS[COLS[c] + ROWS[0]].px, BOARD_SIZE + PADDING + PADDING / 2 + 2);
    }
}

export function drawPiece(ctx, key, type, isSelected) {
    const { px, py } = POS[key];
    const isTiger = type === 'bagh';
    const radius = isTiger ? 26 : 20;
    const img = isTiger ? IMG_TIGER : IMG_GOAT;

    if (isSelected) {
        ctx.beginPath();
        ctx.arc(px, py, radius + 12, 0, Math.PI * 2);
        ctx.fillStyle = C.selectedGlow;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = C.selected;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    if (img.complete && img.naturalWidth > 0) {
        const imgSize = radius * 2;
        ctx.drawImage(img, px - imgSize / 2, py - imgSize / 2, imgSize, imgSize);
    } else {
        ctx.fillStyle = isTiger ? '#5d3a1a' : '#5d3a1a';
        ctx.font = `bold ${isTiger ? 16 : 13}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isTiger ? 'T' : 'G', px, py + 1);
    }
}

export function drawLegalMoves(ctx) {
    for (const move of state.legalMoves) {
        const { px, py } = POS[move.to];
        const isCapture = !!move.capture;
        const r = isCapture ? 12 : 8;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = isCapture ? C.captureDot : C.legalDot;
        ctx.fill();
        ctx.strokeStyle = C.dotBorder;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

export function drawAll(ctx) {
    drawBoard(ctx);
    drawLegalMoves(ctx);
    for (const b of state.baghs) {
        drawPiece(ctx, b, 'bagh', state.selected === b);
    }
    for (const g of state.bakhras) {
        drawPiece(ctx, g, 'bakhra', state.selected === g);
    }
}

export function render(ctx) {
    drawAll(ctx);
    updateUI();
}

export function renderDragging(ctx, drag) {
    drawBoard(ctx);
    drawLegalMoves(ctx);

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
        ctx.drawImage(img, drag.mouseX - imgSize / 2, drag.mouseY - imgSize / 2, imgSize, imgSize);
    } else {
        ctx.fillStyle = isTiger ? '#5d3a1a' : '#5d3a1a';
        ctx.font = `bold ${isTiger ? 16 : 13}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isTiger ? 'T' : 'G', drag.mouseX, drag.mouseY);
    }
    ctx.globalAlpha = 1.0;

    updateUI();
}
