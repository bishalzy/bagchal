// =============================================
//  BAGHCHAL — Replay System
//  Navigate position history with arrow keys
// =============================================

import { state } from './state.js';

const history = [];
let viewIndex = 0;

/**
 * Saves a snapshot of the current board state.
 * Called after every game action (place, move) and at game start.
 */
export function saveSnapshot(trappedTigers = 0) {
    history.push({
        baghs: new Set(state.baghs),
        bakhras: new Set(state.bakhras),
        turn: state.turn,
        bakhrasPlaced: state.bakhrasPlaced,
        bakhrasCaptured: state.bakhrasCaptured,
        gameOver: state.gameOver,
        winner: state.winner,
        trappedTigers,
    });
    viewIndex = history.length - 1;
}

/** True if viewing a past position (not the latest). */
export function isReplaying() {
    return history.length > 1 && viewIndex < history.length - 1;
}

/** Returns the state object to render — snapshot if replaying, live state otherwise. */
export function getViewState() {
    if (history.length > 0 && viewIndex >= 0 && viewIndex < history.length) {
        return history[viewIndex];
    }
    return state;
}

/** Step one position backward. Returns true if moved. */
export function stepBack() {
    if (viewIndex > 0) {
        viewIndex--;
        return true;
    }
    return false;
}

/** Step one position forward. Returns true if moved. */
export function stepForward() {
    if (viewIndex < history.length - 1) {
        viewIndex++;
        return true;
    }
    return false;
}

/** Jump to the latest (live) position. */
export function goToLive() {
    viewIndex = Math.max(0, history.length - 1);
}

/** Clear all history (called on game reset). */
export function resetReplay() {
    history.length = 0;
    viewIndex = 0;
}

/** Returns current replay position info. */
export function getReplayInfo() {
    return { current: viewIndex, total: history.length };
}
