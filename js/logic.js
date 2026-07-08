import { state } from './state.js';
import { ADJ, POS, COLS, ROWS, MAX_BAKHRA, CAPTURE_TO_WIN } from './constants.js';
import { playSound } from './audio.js';
import { addLog } from './ui.js';

export function isOccupied(pos) {
    return state.baghs.has(pos) || state.bakhras.has(pos);
}

export function getStepMoves(pos) {
    return ADJ[pos].filter(n => !isOccupied(n)).map(n => ({ to: n, capture: null }));
}

export function getJumpMoves(pos) {
    const moves = [];
    const from = POS[pos];
    for (const mid of ADJ[pos]) {
        if (!state.bakhras.has(mid)) continue;
        const midP = POS[mid];
        const dc = midP.col - from.col;
        const dr = midP.row - from.row;
        const landCol = midP.col + dc;
        const landRow = midP.row + dr;
        if (landCol < 0 || landCol > 4 || landRow < 0 || landRow > 4) continue;
        const landKey = COLS[landCol] + ROWS[landRow];
        if (!isOccupied(landKey) && ADJ[mid].includes(landKey)) {
            moves.push({ to: landKey, capture: mid });
        }
    }
    return moves;
}

export function getLegalMovesFor(pos) {
    if (state.baghs.has(pos)) {
        return [...getStepMoves(pos), ...getJumpMoves(pos)];
    }
    if (state.bakhras.has(pos)) {
        return getStepMoves(pos);
    }
    return [];
}

export function countTrappedTigers() {
    let count = 0;
    for (const t of state.baghs) {
        if (getLegalMovesFor(t).length === 0) count++;
    }
    return count;
}

export function checkWinConditions() {
    if (state.bakhrasCaptured >= CAPTURE_TO_WIN) {
        state.gameOver = true;
        state.winner = 'bagh';
        return;
    }
    let allTrapped = true;
    for (const t of state.baghs) {
        if (getLegalMovesFor(t).length > 0) { allTrapped = false; break; }
    }
    if (allTrapped && state.baghs.size > 0) {
        state.gameOver = true;
        state.winner = 'bakhra';
    }
}

export function switchTurn() {
    state.turn = state.turn === 'bakhra' ? 'bagh' : 'bakhra';
    state.selected = null;
    state.legalMoves = [];
}

export function placeGoat(pos) {
    if (state.turn !== 'bakhra') return false;
    if (state.bakhrasPlaced >= MAX_BAKHRA) return false;
    if (isOccupied(pos)) return false;

    state.bakhras.add(pos);
    state.bakhrasPlaced++;
    addLog(`Goat placed at ${pos.toUpperCase()}`, 'goat');
    playSound('bakhra');
    switchTurn();
    checkWinConditions();
    return true;
}

export function selectPiece(pos) {
    if (state.turn === 'bagh' && state.baghs.has(pos)) {
        const moves = getLegalMovesFor(pos);
        if (moves.length === 0) return false;
        state.selected = pos;
        state.legalMoves = moves;
        return true;
    }
    if (state.turn === 'bakhra' && state.bakhrasPlaced >= MAX_BAKHRA && state.bakhras.has(pos)) {
        const moves = getLegalMovesFor(pos);
        if (moves.length === 0) return false;
        state.selected = pos;
        state.legalMoves = moves;
        return true;
    }
    return false;
}

export function movePiece(to) {
    if (!state.selected) return false;
    const move = state.legalMoves.find(m => m.to === to);
    if (!move) return false;

    const from = state.selected;
    const isTiger = state.baghs.has(from);

    if (isTiger) {
        state.baghs.delete(from);
        state.baghs.add(to);
    } else {
        state.bakhras.delete(from);
        state.bakhras.add(to);
    }

    if (move.capture) {
        state.bakhras.delete(move.capture);
        state.bakhrasCaptured++;
        addLog(`Tiger ${from.toUpperCase()}→${to.toUpperCase()} captures ${move.capture.toUpperCase()}!`, 'capture');
        playSound('capture');
    } else {
        const label = isTiger ? 'Tiger' : 'Goat';
        addLog(`${label} ${from.toUpperCase()}→${to.toUpperCase()}`, isTiger ? 'tiger' : 'goat');
        playSound(isTiger ? 'bagh' : 'bakhra');
    }

    switchTurn();
    checkWinConditions();
    return true;
}
