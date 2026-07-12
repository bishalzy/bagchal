// =============================================
//  BAGHCHAL — Constants & Game Data
// =============================================

export const BOARD_SIZE = 640;
export const PADDING = 52;
export const CANVAS_SIZE = BOARD_SIZE + PADDING * 2;
export const GRID_SIZE = 4;
export const CELL_SIZE = BOARD_SIZE / GRID_SIZE;
export const CLICK_RADIUS = 26;  // Strict radius for precise clicks
export const DRAG_RADIUS = 100;  // Forgiving radius for drag-and-drop

export const C = {
    boardBg: '#f9fafb',
    boardBgEdge: '#f3f4f6',
    line: '#343a40',
    lineThin: '#495057',
    labelText: '#495057',
    legalDot: 'rgba(102,187,106,0.7)',
    captureDot: 'rgba(244,67,54,0.7)',
    dotBorder: 'rgba(0,0,0,0.2)',
};

// ---- Coordinate System ----
export const COLS = ['a', 'b', 'c', 'd', 'e'];
export const ROWS = ['1', '2', '3', '4', '5'];

export const POS = {};
for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
        const key = COLS[c] + ROWS[r];
        POS[key] = {
            px: c * CELL_SIZE + PADDING,
            py: (4 - r) * CELL_SIZE + PADDING,
            col: c,
            row: r,
        };
    }
}
export const ALL_POS = Object.keys(POS);

// ---- Adjacency Graph ----
export const ADJ = {};
ALL_POS.forEach(k => ADJ[k] = []);

function addEdge(a, b) {
    if (!ADJ[a].includes(b)) ADJ[a].push(b);
    if (!ADJ[b].includes(a)) ADJ[b].push(a);
}

// Horizontal
for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 4; c++) {
        addEdge(COLS[c] + ROWS[r], COLS[c + 1] + ROWS[r]);
    }
}
// Vertical
for (let c = 0; c < 5; c++) {
    for (let r = 0; r < 4; r++) {
        addEdge(COLS[c] + ROWS[r], COLS[c] + ROWS[r + 1]);
    }
}
// Diagonals
['a5', 'b4', 'c3', 'd2', 'e1'].reduce((prev, cur) => { addEdge(prev, cur); return cur; });
['e5', 'd4', 'c3', 'b2', 'a1'].reduce((prev, cur) => { addEdge(prev, cur); return cur; });
['c5', 'd4', 'e3', 'd2', 'c1', 'b2', 'a3', 'b4', 'c5'].reduce((prev, cur) => { addEdge(prev, cur); return cur; });

// ---- Game Rules ----
export const MAX_BAKHRA = 20;
export const CAPTURE_TO_WIN = 5;
