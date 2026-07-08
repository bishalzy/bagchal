export function createInitialState() {
    return {
        baghs: new Set(['a5', 'e5', 'a1', 'e1']),  // 4 tigers at corners
        bakhras: new Set(),                      // goats start empty
        turn: 'bakhra',                          // goat places first
        bakhrasPlaced: 0,                        // out of 20
        bakhrasCaptured: 0,                      // tiger wins at 5
        selected: null,                          // selected piece coordinate
        legalMoves: [],                          // [{to, capture?}]
        gameOver: false,
        winner: null,
        moveHistory: [],
    };
}

export let state = createInitialState();

export function resetState() {
    state = createInitialState();
}
