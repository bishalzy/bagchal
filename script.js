// =============================================
//  BAGHCHAL — Full Game Engine
//  Chess-style coordinate system (a1–e5)
// =============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ---- Board Constants ----
const BOARD_SIZE = 640;
const PADDING = 52;
const CANVAS_SIZE = BOARD_SIZE + PADDING * 2;
const GRID_SIZE = 4;
const CELL_SIZE = BOARD_SIZE / GRID_SIZE;
const CLICK_RADIUS = 26;  // Strict radius for precise clicks (e.g., initial placement)
const DRAG_RADIUS = 100;  // Forgiving radius for fast drag-and-drop snapping
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

// ---- Colors ----
const C = {
    boardBg:     '#f9fafb',
    boardBgEdge: '#f3f4f6',
    line:        '#221105',
    lineThin:    '#3e200c',
    labelText:   '#495057',
    bagh:        '#d32f2f',
    baghDark:    '#8b1a1a',
    baghGlow:    'rgba(211,47,47,0.35)',
    bakhra:      '#42a5f5',
    bakhraDark:  '#0d47a1',
    bakhraGlow:  'rgba(66,165,245,0.35)',
    selected:    '#ffd740',
    selectedGlow:'rgba(255,215,64,0.45)',
    legalDot:    'rgba(102,187,106,0.7)',
    captureDot:  'rgba(244,67,54,0.7)',
    dotBorder:   'rgba(0,0,0,0.2)',
};

// ---- Piece Images ----
const IMG_TIGER = new Image();
IMG_TIGER.src = 'Tiger.png';
const IMG_GOAT = new Image();
IMG_GOAT.src = 'goat.png';
let imagesLoaded = 0;
function onImageLoad() {
    imagesLoaded++;
    if (imagesLoaded >= 2) render();
}
IMG_TIGER.onload = onImageLoad;
IMG_GOAT.onload = onImageLoad;

// ---- Coordinate System (chess-style) ----
const COLS = ['a','b','c','d','e'];
const ROWS = ['1','2','3','4','5'];

// Position map: "a1" -> {px, py, col, row}
// col 0-4 = a-e, row 0-4 = 1-5
// On canvas: row 5 is at the TOP (y=PADDING), row 1 is at the BOTTOM (y=BOARD_SIZE+PADDING)
const POS = {};
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
const ALL_POS = Object.keys(POS); // 25 positions

// ---- Adjacency Graph ----
// Built from the lines actually drawn on the board
const ADJ = {};
ALL_POS.forEach(k => ADJ[k] = []);

function addEdge(a, b) {
    if (!ADJ[a].includes(b)) ADJ[a].push(b);
    if (!ADJ[b].includes(a)) ADJ[b].push(a);
}

// Horizontal edges (same row, adjacent columns)
for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 4; c++) {
        addEdge(COLS[c]+ROWS[r], COLS[c+1]+ROWS[r]);
    }
}
// Vertical edges (same column, adjacent rows)
for (let c = 0; c < 5; c++) {
    for (let r = 0; r < 4; r++) {
        addEdge(COLS[c]+ROWS[r], COLS[c]+ROWS[r+1]);
    }
}
// Main diagonal: a5-b4-c3-d2-e1
['a5','b4','c3','d2','e1'].reduce((prev,cur) => { addEdge(prev,cur); return cur; });
// Anti-diagonal: e5-d4-c3-b2-a1
['e5','d4','c3','b2','a1'].reduce((prev,cur) => { addEdge(prev,cur); return cur; });
// Diamond: c5-d4-e3-d2-c1-b2-a3-b4-c5
['c5','d4','e3','d2','c1','b2','a3','b4','c5'].reduce((prev,cur) => { addEdge(prev,cur); return cur; });

// ---- Game State ----
let state = createInitialState();

function createInitialState() {
    return {
        baghs: new Set(['a5','e5','a1','e1']),  // 4 tigers at corners
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

const MAX_BAKHRA = 20;
const CAPTURE_TO_WIN = 5;

// ---- Game Logic ----

function isOccupied(pos) {
    return state.baghs.has(pos) || state.bakhras.has(pos);
}

// Get simple (step) moves for a piece at `pos`
function getStepMoves(pos) {
    return ADJ[pos].filter(n => !isOccupied(n)).map(n => ({ to: n, capture: null }));
}

// Get jump (capture) moves for a tiger at `pos`
function getJumpMoves(pos) {
    const moves = [];
    const from = POS[pos];
    for (const mid of ADJ[pos]) {
        if (!state.bakhras.has(mid)) continue; // must jump over a goat
        const midP = POS[mid];
        // Direction vector from pos to mid
        const dc = midP.col - from.col;
        const dr = midP.row - from.row;
        // Landing position
        const landCol = midP.col + dc;
        const landRow = midP.row + dr;
        if (landCol < 0 || landCol > 4 || landRow < 0 || landRow > 4) continue;
        const landKey = COLS[landCol] + ROWS[landRow];
        // Landing must be empty AND connected to mid (same line continues)
        if (!isOccupied(landKey) && ADJ[mid].includes(landKey)) {
            moves.push({ to: landKey, capture: mid });
        }
    }
    return moves;
}

function getLegalMovesFor(pos) {
    if (state.baghs.has(pos)) {
        return [...getStepMoves(pos), ...getJumpMoves(pos)];
    }
    if (state.bakhras.has(pos)) {
        return getStepMoves(pos); // goats can only step, never jump
    }
    return [];
}

function countTrappedTigers() {
    let count = 0;
    for (const t of state.baghs) {
        if (getLegalMovesFor(t).length === 0) count++;
    }
    return count;
}

function checkWinConditions() {
    // Tiger wins: captured 5 goats
    if (state.bakhrasCaptured >= CAPTURE_TO_WIN) {
        state.gameOver = true;
        state.winner = 'bagh';
        return;
    }
    // Goat wins: all 4 tigers trapped (no legal moves)
    let allTrapped = true;
    for (const t of state.baghs) {
        if (getLegalMovesFor(t).length > 0) { allTrapped = false; break; }
    }
    if (allTrapped && state.baghs.size > 0) {
        state.gameOver = true;
        state.winner = 'bakhra';
    }
}

function switchTurn() {
    state.turn = state.turn === 'bakhra' ? 'bagh' : 'bakhra';
    state.selected = null;
    state.legalMoves = [];
}

// ---- Actions ----

function placeGoat(pos) {
    if (state.turn !== 'bakhra') return false;
    if (state.bakhrasPlaced >= MAX_BAKHRA) return false;
    if (isOccupied(pos)) return false;

    state.bakhras.add(pos);
    state.bakhrasPlaced++;
    addLog(`Goat placed at ${pos.toUpperCase()}`, 'goat');
    switchTurn();
    checkWinConditions();
    return true;
}

function selectPiece(pos) {
    // Select a piece belonging to the current player
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

function movePiece(to) {
    if (!state.selected) return false;
    const move = state.legalMoves.find(m => m.to === to);
    if (!move) return false;

    const from = state.selected;
    const isTiger = state.baghs.has(from);

    // Move the piece
    if (isTiger) {
        state.baghs.delete(from);
        state.baghs.add(to);
    } else {
        state.bakhras.delete(from);
        state.bakhras.add(to);
    }

    // Handle capture
    if (move.capture) {
        state.bakhras.delete(move.capture);
        state.bakhrasCaptured++;
        addLog(`Tiger ${from.toUpperCase()}→${to.toUpperCase()} captures ${move.capture.toUpperCase()}!`, 'capture');
    } else {
        const label = isTiger ? 'Tiger' : 'Goat';
        addLog(`${label} ${from.toUpperCase()}→${to.toUpperCase()}`, isTiger ? 'tiger' : 'goat');
    }

    switchTurn();
    checkWinConditions();
    return true;
}

// ---- Click Handler ----

function posFromPixel(px, py, radius = CLICK_RADIUS) {
    let nearest = null;
    let minDist = Infinity;
    for (const key of ALL_POS) {
        const p = POS[key];
        const d = Math.hypot(px - p.px, py - p.py);
        if (d < minDist && d <= radius) {
            minDist = d;
            nearest = key;
        }
    }
    return nearest;
}

// ---- Drag & Click Input System ----

let drag = {
    active: false,
    pieceKey: null,      // coordinate of piece being dragged (e.g. 'a5')
    pieceType: null,     // 'bagh' or 'bakhra'
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
    moved: false,        // true if mouse moved significantly (distinguishes click from drag)
};

function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
    };
}

function isOwnPiece(pos) {
    if (state.turn === 'bagh' && state.baghs.has(pos)) return 'bagh';
    if (state.turn === 'bakhra' && state.bakhrasPlaced >= MAX_BAKHRA && state.bakhras.has(pos)) return 'bakhra';
    return null;
}

canvas.addEventListener('mousedown', (e) => {
    if (state.gameOver) return;
    const { x, y } = getCanvasCoords(e);
    const pos = posFromPixel(x, y);

    // Placement phase: don't start drag, handle on mouseup as click
    if (state.turn === 'bakhra' && state.bakhrasPlaced < MAX_BAKHRA) {
        drag.startX = x; drag.startY = y;
        drag.moved = false;
        return;
    }

    // Movement phase: check if clicking own piece to start drag
    if (pos) {
        const type = isOwnPiece(pos);
        if (type) {
            const moves = getLegalMovesFor(pos);
            if (moves.length > 0) {
                drag.active = true;
                drag.pieceKey = pos;
                drag.pieceType = type;
                drag.mouseX = x;
                drag.mouseY = y;
                drag.startX = x;
                drag.startY = y;
                drag.moved = false;

                // Select the piece and show legal moves
                state.selected = pos;
                state.legalMoves = moves;
                render();
                canvas.style.cursor = 'grabbing';
            }
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    const { x, y } = getCanvasCoords(e);

    if (drag.active) {
        drag.mouseX = x;
        drag.mouseY = y;
        // Check if moved enough to count as drag vs click
        if (Math.hypot(x - drag.startX, y - drag.startY) > 5) {
            drag.moved = true;
        }
        // Redraw board without the dragged piece, then draw it at mouse
        renderDragging();
        canvas.style.cursor = 'grabbing';
        return;
    }

    // Cursor hints when not dragging
    if (state.gameOver) { canvas.style.cursor = 'default'; return; }
    const hovered = posFromPixel(x, y);
    if (!hovered) { canvas.style.cursor = 'default'; return; }

    if (state.turn === 'bakhra' && state.bakhrasPlaced < MAX_BAKHRA) {
        canvas.style.cursor = !isOccupied(hovered) ? 'pointer' : 'not-allowed';
    } else if (state.selected) {
        if (state.legalMoves.some(m => m.to === hovered)) canvas.style.cursor = 'pointer';
        else if (isOwnPiece(hovered)) canvas.style.cursor = 'grab';
        else canvas.style.cursor = 'default';
    } else {
        canvas.style.cursor = isOwnPiece(hovered) ? 'grab' : 'default';
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (state.gameOver) return;
    const { x, y } = getCanvasCoords(e);
    
    // --- Drag release ---
    if (drag.active) {
        const wasDragged = drag.moved;
        // Use forgiving DRAG_RADIUS if the piece was actually dragged, otherwise strict CLICK_RADIUS
        const dropPos = posFromPixel(x, y, wasDragged ? DRAG_RADIUS : CLICK_RADIUS);

        // Reset drag state
        drag.active = false;
        const dragKey = drag.pieceKey;
        drag.pieceKey = null;
        drag.pieceType = null;
        canvas.style.cursor = 'default';

        if (wasDragged && dropPos) {
            // Try to move to drop position
            if (state.legalMoves.some(m => m.to === dropPos)) {
                movePiece(dropPos);
                render();
                return;
            }
        }

        // Invalid drop or click — keep selection, snap back
        render();
        return;
    }

    // --- Click handling (non-drag) ---
    const pos = posFromPixel(x, y, CLICK_RADIUS);
    if (!pos) return;
    let acted = false;

    // Placement phase
    if (state.turn === 'bakhra' && state.bakhrasPlaced < MAX_BAKHRA) {
        acted = placeGoat(pos);
    }
    // Movement phase click (select or move)
    else {
        if (state.selected) {
            if (state.legalMoves.some(m => m.to === pos)) {
                acted = movePiece(pos);
            } else if (isOwnPiece(pos)) {
                acted = selectPiece(pos);
            } else {
                state.selected = null;
                state.legalMoves = [];
                acted = true;
            }
        } else {
            acted = selectPiece(pos);
        }
    }

    if (acted) render();
});

// Cancel drag if mouse leaves canvas
canvas.addEventListener('mouseleave', () => {
    if (drag.active) {
        drag.active = false;
        drag.pieceKey = null;
        drag.pieceType = null;
        canvas.style.cursor = 'default';
        render();
    }
});

function drawBoard() {
    // Background
    const grad = ctx.createRadialGradient(
        CANVAS_SIZE/2, CANVAS_SIZE/2, 50,
        CANVAS_SIZE/2, CANVAS_SIZE/2, CANVAS_SIZE
    );
    grad.addColorStop(0, C.boardBg);
    grad.addColorStop(1, C.boardBgEdge);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = C.line;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Grid lines
    for (let i = 0; i <= GRID_SIZE; i++) {
        // Horizontal
        ctx.beginPath();
        ctx.moveTo(PADDING, i * CELL_SIZE + PADDING);
        ctx.lineTo(BOARD_SIZE + PADDING, i * CELL_SIZE + PADDING);
        ctx.stroke();
        // Vertical
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE + PADDING, PADDING);
        ctx.lineTo(i * CELL_SIZE + PADDING, BOARD_SIZE + PADDING);
        ctx.stroke();
    }

    // Diagonals
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.lineThin;
    const diags = [
        ['a5','e1'], ['e5','a1'],
        ['c5','e3'], ['e3','c1'], ['c1','a3'], ['a3','c5'],
    ];
    for (const [a, b] of diags) {
        ctx.beginPath();
        ctx.moveTo(POS[a].px, POS[a].py);
        ctx.lineTo(POS[b].px, POS[b].py);
        ctx.stroke();
    }

    // Intersection dots
    ctx.fillStyle = C.line;
    for (const key of ALL_POS) {
        ctx.beginPath();
        ctx.arc(POS[key].px, POS[key].py, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Labels
    ctx.fillStyle = C.labelText;
    ctx.font = '600 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Row numbers (left side)
    for (let r = 0; r < 5; r++) {
        ctx.fillText(ROWS[r], PADDING / 2 - 2, POS[COLS[0]+ROWS[r]].py);
    }
    // Column letters (bottom)
    for (let c = 0; c < 5; c++) {
        ctx.fillText(COLS[c], POS[COLS[c]+ROWS[0]].px, BOARD_SIZE + PADDING + PADDING / 2 + 2);
    }
}

function drawPiece(key, type, isSelected) {
    const { px, py } = POS[key];
    const isTiger = type === 'bagh';
    const radius = isTiger ? 26 : 20;
    const img = isTiger ? IMG_TIGER : IMG_GOAT;

    // Glow for selected
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

    // Draw image directly on board (no background circle)
    if (img.complete && img.naturalWidth > 0) {
        const imgSize = radius * 2;
        ctx.drawImage(img, px - imgSize / 2, py - imgSize / 2, imgSize, imgSize);
    } else {
        // Fallback text if image not loaded
        ctx.fillStyle = isTiger ? '#5d3a1a' : '#5d3a1a';
        ctx.font = `bold ${isTiger ? 16 : 13}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isTiger ? 'T' : 'G', px, py + 1);
    }
}

function drawLegalMoves() {
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

function drawAll() {
    drawBoard();
    drawLegalMoves();
    for (const b of state.baghs) {
        drawPiece(b, 'bagh', state.selected === b);
    }
    for (const g of state.bakhras) {
        drawPiece(g, 'bakhra', state.selected === g);
    }
}

// ---- UI Updates ----

function updateUI() {
    const toPlace = MAX_BAKHRA - state.bakhrasPlaced;
    document.getElementById('goatsToPlace').textContent = toPlace;
    document.getElementById('goatsOnBoard').textContent = state.bakhras.size;
    document.getElementById('goatsCaptured').textContent = state.bakhrasCaptured;
    document.getElementById('tigersOnBoard').textContent = state.baghs.size;
    document.getElementById('tigersTrapped').textContent = countTrappedTigers();
    document.getElementById('tigerKills').textContent = state.bakhrasCaptured;

    // Turn banner
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

    // Game over overlay
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

function addLog(msg, type) {
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

function render() {
    drawAll();
    updateUI();
}

// ---- Reset ----

function resetGame() {
    state = createInitialState();
    document.getElementById('moveLogGoat').innerHTML = '';
    document.getElementById('moveLogTiger').innerHTML = '';
    addLog('Game started. Goat places first.', 'system');
    document.getElementById('gameOverOverlay').classList.remove('show');
    render();
}

document.getElementById('btnRestart').addEventListener('click', resetGame);
document.getElementById('btnPlayAgain').addEventListener('click', resetGame);

// ---- Drag Rendering ----

function renderDragging() {
    drawBoard();
    drawLegalMoves();

    // Draw all pieces EXCEPT the one being dragged
    for (const b of state.baghs) {
        if (b === drag.pieceKey) continue;
        drawPiece(b, 'bagh', false);
    }
    for (const g of state.bakhras) {
        if (g === drag.pieceKey) continue;
        drawPiece(g, 'bakhra', false);
    }

    // Draw the dragged piece at mouse position
    const isTiger = drag.pieceType === 'bagh';
    const img = isTiger ? IMG_TIGER : IMG_GOAT;
    const radius = isTiger ? 26 : 20;

    // Slight transparency for the floating piece
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

// ---- Boot ----
// Initial render (will re-render when images load via onImageLoad)
render();
