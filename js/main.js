import { setupAssets } from './assets.js';
import { render } from './render.js';
import { setupInput } from './input.js';
import { resetState } from './state.js';
import { addLog } from './ui.js';
import { CANVAS_SIZE } from './constants.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

function resetGame() {
    resetState();
    document.getElementById('moveLogGoat').innerHTML = '';
    document.getElementById('moveLogTiger').innerHTML = '';
    addLog('Game started. Goat places first.', 'system');
    document.getElementById('gameOverOverlay').classList.remove('show');
    render(ctx);
}

document.getElementById('btnRestart').addEventListener('click', resetGame);
document.getElementById('btnPlayAgain').addEventListener('click', resetGame);

setupInput(canvas, ctx);
setupAssets(() => render(ctx));
render(ctx);
