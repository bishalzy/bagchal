import { state } from './state.js';
import { CLICK_RADIUS, DRAG_RADIUS, MAX_BAKHRA, POS, ALL_POS } from './constants.js';
import { isOccupied, placeGoat, selectPiece, movePiece, getLegalMovesFor } from './logic.js';
import { render, renderDragging } from './render.js';

export const drag = {
    active: false,
    pieceKey: null,
    pieceType: null,
    mouseX: 0, mouseY: 0,
    startX: 0, startY: 0,
    moved: false,
};

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

function getCanvasCoords(canvas, e) {
    let clientX = e.clientX;
    let clientY = e.clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
    };
}

function isOwnPiece(pos) {
    if (state.turn === 'bagh' && state.baghs.has(pos)) return 'bagh';
    if (state.turn === 'bakhra' && state.bakhrasPlaced >= MAX_BAKHRA && state.bakhras.has(pos)) return 'bakhra';
    return null;
}

export function setupInput(canvas, ctx) {
    function handleStart(e) {
        if (state.gameOver) return;
        const { x, y } = getCanvasCoords(canvas, e);
        const pos = posFromPixel(x, y);

        if (state.turn === 'bakhra' && state.bakhrasPlaced < MAX_BAKHRA) {
            drag.startX = x; drag.startY = y;
            drag.moved = false;
            return;
        }

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

                    state.selected = pos;
                    state.legalMoves = moves;
                    render(ctx);
                    canvas.style.cursor = 'grabbing';
                }
            }
        }
    }

    function handleMove(e) {
        const { x, y } = getCanvasCoords(canvas, e);

        if (drag.active) {
            drag.mouseX = x;
            drag.mouseY = y;
            if (Math.hypot(x - drag.startX, y - drag.startY) > 5) {
                drag.moved = true;
            }
            renderDragging(ctx, drag);
            canvas.style.cursor = 'grabbing';
            return;
        }

        if (state.gameOver || (e.type && e.type.startsWith('touch'))) {
            canvas.style.cursor = 'default';
            return;
        }

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
    }

    function handleEnd(e) {
        if (state.gameOver) return;
        const { x, y } = getCanvasCoords(canvas, e);

        if (drag.active) {
            const wasDragged = drag.moved;
            const dropPos = posFromPixel(x, y, wasDragged ? DRAG_RADIUS : CLICK_RADIUS);

            drag.active = false;
            const dragKey = drag.pieceKey;
            drag.pieceKey = null;
            drag.pieceType = null;
            canvas.style.cursor = 'default';

            if (wasDragged && dropPos) {
                if (state.legalMoves.some(m => m.to === dropPos)) {
                    movePiece(dropPos);
                    render(ctx);
                    return;
                }
            }

            render(ctx);
            return;
        }

        const pos = posFromPixel(x, y, CLICK_RADIUS);
        if (!pos) return;
        let acted = false;

        if (state.turn === 'bakhra' && state.bakhrasPlaced < MAX_BAKHRA) {
            acted = placeGoat(pos);
        } else {
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

        if (acted) render(ctx);
    }

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', () => {
        if (drag.active) {
            drag.active = false;
            drag.pieceKey = null;
            drag.pieceType = null;
            canvas.style.cursor = 'default';
            render(ctx);
        }
    });

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleStart(e); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleMove(e); }, { passive: false });
    canvas.addEventListener('touchend', (e) => { e.preventDefault(); handleEnd(e); }, { passive: false });
}
