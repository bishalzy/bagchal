export function createInitialState() {
    return {
        baghs: new Set(['a5', 'e5', 'a1', 'e1']),
        bakhras: new Set(),
        turn: 'bakhra',
        bakhrasPlaced: 0,
        bakhrasCaptured: 0,
        selected: null,
        legalMoves: [],
        gameOver: false,
        winner: null,
        moveHistory: [],
        lastMove: null,

        // Multiplayer additions
        isMultiplayer: false,
        localRole: null, // 'bakhra', 'bagh', or null (offline local play)
        roomId: null,
        players: [], // Array of players from server

        // Bot mode additions
        // isBotMode: true when the player is playing against the AI.
        // botRole: which side the bot plays ('bagh' or 'bakhra').
        // botDifficulty: 'easy' | 'medium' | 'hard'
        // botMoveHistory: array of {from, to} for the bot's own moves — used
        //   to detect and break oscillation (same move repeated 3+ times).
        // The human player always plays the opposite side.
        isBotMode: false,
        botRole: null,
        botDifficulty: 'hard',
        botMoveHistory: [],
    };
}

export let state = createInitialState();

export function resetState() {
    const isMultiplayer = state.isMultiplayer;
    const localRole = state.localRole;
    const roomId = state.roomId;
    const players = state.players;

    // Preserve bot mode across resets so "Play Again" keeps the bot active
    const isBotMode = state.isBotMode;
    const botRole = state.botRole;
    const botDifficulty = state.botDifficulty;

    const initial = createInitialState();
    for (let key in state) delete state[key];
    Object.assign(state, initial);

    // Restore network properties
    state.isMultiplayer = isMultiplayer;
    state.localRole = localRole;
    state.roomId = roomId;
    state.players = players;

    // Restore bot mode properties
    state.isBotMode = isBotMode;
    state.botRole = botRole;
    state.botDifficulty = botDifficulty;
}

export function syncStateFromServer(serverState) {
    state.baghs = new Set(serverState.baghs);
    state.bakhras = new Set(serverState.bakhras);
    state.turn = serverState.turn;
    state.bakhrasPlaced = serverState.bakhrasPlaced;
    state.bakhrasCaptured = serverState.bakhrasCaptured;
    state.gameOver = serverState.gameOver;
    state.winner = serverState.winner;
    if (serverState.moveHistory) {
        state.moveHistory = [...serverState.moveHistory];
    }

    // Use server-provided lastMove if available, otherwise derive from moveHistory
    if (serverState.lastMove) {
        state.lastMove = { ...serverState.lastMove };
    } else if (state.moveHistory && state.moveHistory.length > 0) {
        // Fallback: derive from moveHistory text for backward compatibility
        const lastMsg = state.moveHistory[state.moveHistory.length - 1];
        const arrowMatch = lastMsg.match(/(\w\d)\s*(?:->|→)\s*(\w\d)/);
        const placeMatch = lastMsg.match(/placed at (\w\d)/i);
        if (arrowMatch) {
            state.lastMove = { from: arrowMatch[1].toLowerCase(), to: arrowMatch[2].toLowerCase() };
        } else if (placeMatch) {
            state.lastMove = { from: null, to: placeMatch[1].toLowerCase() };
        }
    }

    // Clear selection state when updating from server
    state.selected = null;
    state.legalMoves = [];
}
