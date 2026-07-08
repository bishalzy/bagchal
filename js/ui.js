import { state } from './state.js';
import { MAX_BAKHRA } from './constants.js';
import { countTrappedTigers } from './logic.js';

export function updateUI() {
    const toPlace = MAX_BAKHRA - state.bakhrasPlaced;
    document.getElementById('goatsToPlace').textContent = toPlace;
    document.getElementById('goatsOnBoard').textContent = state.bakhras.size;
    document.getElementById('goatsCaptured').textContent = state.bakhrasCaptured;
    document.getElementById('tigersOnBoard').textContent = state.baghs.size;
    document.getElementById('tigersTrapped').textContent = countTrappedTigers();
    document.getElementById('tigerKills').textContent = state.bakhrasCaptured;

    const turnText = document.getElementById('turnText');
    const panelBakhra = document.getElementById('panelBakhra');
    const panelBagh = document.getElementById('panelBagh');

    if (state.gameOver) {
        turnText.textContent = state.winner === 'bagh' ? 'TIGERS WIN!' : 'GOATS WIN!';
    } else if (state.turn === 'bakhra') {
        turnText.textContent = "GOAT's Turn";
        panelBakhra.classList.add('active');
        panelBagh.classList.remove('active');
    } else {
        turnText.textContent = "TIGER's Turn";
        panelBagh.classList.add('active');
        panelBakhra.classList.remove('active');
    }

    const overlay = document.getElementById('gameOverOverlay');
    if (state.gameOver) {
        overlay.classList.add('show');
        document.getElementById('gameOverTitle').textContent =
            state.winner === 'bagh' ? 'TIGERS WIN' : 'GOATS WIN';
        document.getElementById('gameOverMsg').textContent =
            state.winner === 'bagh'
                ? `Tigers captured ${state.bakhrasCaptured} goats!`
                : 'All tigers are trapped! Goats win!';
    } else {
        overlay.classList.remove('show');
    }
}

export function addLog(msg, type) {
    const logGoat = document.getElementById('moveLogGoat');
    const logTiger = document.getElementById('moveLogTiger');

    const span = document.createElement('span');
    span.className = `log-entry log-${type}`;
    span.textContent = msg;

    if (type === 'goat' || type === 'system') {
        logGoat.appendChild(span.cloneNode(true));
        logGoat.scrollTop = logGoat.scrollHeight;
    }

    if (type === 'tiger' || type === 'capture' || type === 'system') {
        logTiger.appendChild(span.cloneNode(true));
        logTiger.scrollTop = logTiger.scrollHeight;
    }

    state.moveHistory.push(msg);
}
