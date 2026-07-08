import { setupAssets } from './assets.js';
import { render } from './render.js';
import { setupInput } from './input.js';
import { resetState } from './state.js';
import { addLog, resetMoveNumber } from './ui.js';
import { CANVAS_SIZE } from './constants.js';
import { saveSnapshot, resetReplay } from './replay.js';
import { countTrappedTigers } from './logic.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

/**
 * Sizes the canvas buffer to match its CSS display size × devicePixelRatio,
 * then scales the 2D context so logical coordinates (0–CANVAS_SIZE) map
 * to the full high-resolution buffer. This eliminates blur on all displays.
 */
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    // Scale so our CANVAS_SIZE coordinate system fills the buffer
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(canvas.width / CANVAS_SIZE, canvas.height / CANVAS_SIZE);

    render(ctx);
}

// Re-render on resize (window resize, zoom, orientation change)
new ResizeObserver(resizeCanvas).observe(canvas);

function resetGame() {
    resetState();
    resetReplay();
    resetMoveNumber();
    document.getElementById('moveLog').innerHTML = '';
    addLog('Game started. Goat places first.', 'system');
    document.getElementById('gameOverOverlay').classList.remove('show');
    saveSnapshot(countTrappedTigers());
    resizeCanvas();
}

document.getElementById('btnPlayAgain').addEventListener('click', resetGame);

setupInput(canvas, ctx);
setupAssets(() => resizeCanvas());

// Save initial board state as first snapshot
saveSnapshot(0);
resizeCanvas();
