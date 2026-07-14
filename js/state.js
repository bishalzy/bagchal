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
    };
}

export let state = createInitialState();

export function resetState() {
    const isMultiplayer = state.isMultiplayer;
    const localRole = state.localRole;
    const roomId = state.roomId;
    const players = state.players;

    state = createInitialState();

    // Preserve network properties on reset
    state.isMultiplayer = isMultiplayer;
    state.localRole = localRole;
    state.roomId = roomId;
    state.players = players;
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

    // Derive lastMove from moveHistory for board highlight after rejoin
    if (state.moveHistory && state.moveHistory.length > 0) {
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
