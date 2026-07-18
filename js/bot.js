/**
 * ============================================================
 * bot.js — Baghchal AI Engine
 * ============================================================
 *
 * Algorithm: Minimax with Alpha-Beta Pruning
 * ─────────────────────────────────────────
 * Minimax is the standard algorithm for two-player zero-sum
 * games. It explores the game tree to a fixed depth, simulating
 * both players' optimal play. Alpha-Beta Pruning cuts off branches
 * that cannot affect the final decision, dramatically reducing the
 * number of nodes evaluated.
 *
 * Baghchal-specific heuristics are used to guide the search toward
 * strong moves without needing to explore the entire tree.
 *
 * Bot Roles:
 *  - If the bot plays as TIGER ('bagh'):  maximizes the score.
 *  - If the bot plays as GOAT ('bakhra'): minimizes the score.
 *
 * Public API:
 *  getBotMove(botRole, state) → { type: 'place'|'move', to, from? }
 * ============================================================
 */

import {
    ADJ, POS, ALL_POS, COLS, ROWS, MAX_BAKHRA, CAPTURE_TO_WIN
} from './constants.js';

// ---- Search Configuration ----
// Search depth per difficulty level.
// Higher depth = stronger AI but exponentially more computation time.
const DIFFICULTY_DEPTH = {
    easy: 2,
    medium: 3,
    hard: 4,
};

// Default depth used by the legacy getBotMoveWithOpening entry point.
const SEARCH_DEPTH = DIFFICULTY_DEPTH.hard;

// ---- Utility Functions ----

/**
 * Check if a position is occupied by any piece given the provided sets.
 * We pass sets explicitly (not from global state) so we can work on
 * clone states inside the minimax tree without side effects.
 */
function isOccupiedIn(pos, baghs, bakhras) {
    return baghs.has(pos) || bakhras.has(pos);
}

/**
 * Get all valid step-moves (one step along an edge) for a piece at `pos`.
 * Returns an array of destination position keys.
 */
function getStepMovesFor(pos, baghs, bakhras) {
    return ADJ[pos].filter(n => !isOccupiedIn(n, baghs, bakhras));
}

/**
 * Get all valid jump/capture moves for a TIGER at `pos`.
 * A tiger may jump over an adjacent goat to an empty cell beyond it,
 * as long as all three points are collinear (connected by an edge).
 * Returns [{ to, capture }] objects.
 */
function getJumpMovesFor(pos, baghs, bakhras) {
    const moves = [];
    const from = POS[pos];
    for (const mid of ADJ[pos]) {
        if (!bakhras.has(mid)) continue; // Must be a goat to jump over
        const midP = POS[mid];
        const dc = midP.col - from.col;
        const dr = midP.row - from.row;
        const landCol = midP.col + dc;
        const landRow = midP.row + dr;
        // Bounds check
        if (landCol < 0 || landCol > 4 || landRow < 0 || landRow > 4) continue;
        const landKey = COLS[landCol] + ROWS[landRow];
        // Landing cell must be empty AND connected by a board edge
        if (!isOccupiedIn(landKey, baghs, bakhras) && ADJ[mid].includes(landKey)) {
            moves.push({ to: landKey, capture: mid });
        }
    }
    return moves;
}

/**
 * Get all legal moves for a tiger at `pos`.
 * Tigers can step OR jump (capture).
 */
function getTigerMoves(pos, baghs, bakhras) {
    return [
        ...getStepMovesFor(pos, baghs, bakhras).map(to => ({ to, capture: null })),
        ...getJumpMovesFor(pos, baghs, bakhras)
    ];
}

/**
 * Count the number of tigers that have zero legal moves (trapped).
 * Goats win when ALL tigers are trapped.
 */
function countTrappedTigersIn(baghs, bakhras) {
    let count = 0;
    for (const t of baghs) {
        if (getTigerMoves(t, baghs, bakhras).length === 0) count++;
    }
    return count;
}

/**
 * Count the number of positions adjacent to pos that contain a goat,
 * AND where a tiger could jump FROM (i.e., a tiger is on the opposite side).
 * This helps detect goats that are "at risk" of being captured.
 */
function isGoatAtRisk(gPos, baghs, bakhras) {
    for (const tigerPos of baghs) {
        // Check if this tiger has a jump move that captures this goat
        const jumps = getJumpMovesFor(tigerPos, baghs, bakhras);
        if (jumps.some(j => j.capture === gPos)) return true;
    }
    return false;
}


/**
 * Count the number of goats that are adjacent to a given tiger position.
 * Used to evaluate "pressure" — tigers adjacent to many goats have more
 * attack potential.
 */
function goatsAdjacentToTiger(tigerPos, bakhras) {
    return ADJ[tigerPos].filter(n => bakhras.has(n)).length;
}

// ---- Board Connectivity / Center Control ----
// Positions with more connections (higher degree) are strategically
// more valuable. The center has 8 connections; corners have 3.
const POSITION_DEGREE = {};
for (const pos of ALL_POS) {
    POSITION_DEGREE[pos] = ADJ[pos].length;
}

// ============================================================
// Heuristic Evaluation Function
// ============================================================
/**
 * Evaluates a board state and returns a score from the TIGER's perspective.
 *
 * Positive score = Tiger advantage.
 * Negative score = Goat advantage.
 *
 * The evaluation considers:
 *  1. Terminal conditions (win/lose) — highest priority
 *  2. Captures made vs. goats remaining
 *  3. Tiger mobility (freedom of movement)
 *  4. Goat formation (cohesion, center control)
 *  5. Tiger attack pressure on goats
 */
function evaluate(baghs, bakhras, bakhrasCaptured, bakhrasPlaced) {
    // --- Terminal State Checks ---
    // Tiger win: 5 goats captured
    if (bakhrasCaptured >= CAPTURE_TO_WIN) return 100000;

    // Goat win: all tigers trapped
    const trapped = countTrappedTigersIn(baghs, bakhras);
    if (trapped === baghs.size && baghs.size > 0) return -100000;

    // ---- Heuristic Score Components ----
    let score = 0;

    // 1. Captures are the primary win condition for tigers. Each capture is
    //    strongly rewarded. We also penalize how close goats are to winning
    //    by trapping tigers.
    score += bakhrasCaptured * 1200;       // Each captured goat is very valuable
    score -= trapped * 800;                // Each trapped tiger hurts

    // 2. Tiger mobility: more legal moves = more flexibility and threat potential.
    //    Sum all tiger moves; captures (jumps) count extra since they're offensive.
    let tigerMobilityScore = 0;
    let captureOpportunities = 0;
    for (const t of baghs) {
        const moves = getTigerMoves(t, baghs, bakhras);
        tigerMobilityScore += moves.length * 30;
        captureOpportunities += moves.filter(m => m.capture).length;
    }
    score += tigerMobilityScore;
    score += captureOpportunities * 200; // Immediate capture threats are very valuable

    // 3. Goat formation quality: goats near high-degree nodes control more of
    //    the board, and safe goats (not at risk) indicate a strong defensive structure.
    let goatFormationScore = 0;
    for (const g of bakhras) {
        goatFormationScore += POSITION_DEGREE[g] * 10; // Reward center-positioned goats
        if (isGoatAtRisk(g, baghs, bakhras)) goatFormationScore -= 30; // Penalize exposed goats
    }
    score -= goatFormationScore; // Subtract because high goat formation hurts tigers

    // 4. Tiger position quality: tigers near many goats are more threatening.
    for (const t of baghs) {
        const adjacentGoats = goatsAdjacentToTiger(t, bakhras);
        score += adjacentGoats * 80; // Being adjacent to goats = attack opportunity
        score += POSITION_DEGREE[t] * 15; // Tigers on high-degree nodes have more escape routes
    }

    // 5. Phase bonus: during placement phase (goats still being placed),
    //    tigers should try to create pressure early.
    if (bakhrasPlaced < MAX_BAKHRA) {
        // Encourage tigers to be near the center during placement
        for (const t of baghs) {
            const distToCenter = Math.abs(POS[t].col - 2) + Math.abs(POS[t].row - 2);
            score -= distToCenter * 15; // Closer to center = smaller penalty
        }
    }

    return score;
}

// ============================================================
// Move Generation
// ============================================================
/**
 * Generate all possible moves for the given player in this board state.
 *
 * For TIGER (bagh):
 *   - Move any tiger to an adjacent empty cell (step)
 *   - Jump a tiger over a goat to capture it (jump)
 *
 * For GOAT (bakhra) during PLACEMENT phase (bakhrasPlaced < MAX_BAKHRA):
 *   - Place a goat on any empty board position
 *
 * For GOAT (bakhra) during MOVEMENT phase (bakhrasPlaced >= MAX_BAKHRA):
 *   - Move any goat to an adjacent empty cell
 */
function generateMoves(turn, baghs, bakhras, bakhrasPlaced) {
    const moves = [];

    if (turn === 'bagh') {
        // Tiger moves: step or jump
        for (const t of baghs) {
            for (const m of getTigerMoves(t, baghs, bakhras)) {
                moves.push({ type: 'move', from: t, to: m.to, capture: m.capture });
            }
        }
    } else {
        // Goat moves
        if (bakhrasPlaced < MAX_BAKHRA) {
            // Placement phase: place on any empty cell
            for (const pos of ALL_POS) {
                if (!isOccupiedIn(pos, baghs, bakhras)) {
                    moves.push({ type: 'place', from: null, to: pos, capture: null });
                }
            }
        } else {
            // Movement phase: move any goat one step
            for (const g of bakhras) {
                for (const to of getStepMovesFor(g, baghs, bakhras)) {
                    moves.push({ type: 'move', from: g, to, capture: null });
                }
            }
        }
    }

    return moves;
}

/**
 * Move ordering heuristic: sort moves so more promising ones are explored
 * first. This greatly improves alpha-beta pruning efficiency by causing more
 * cut-offs early in the search.
 *
 * For tigers: captures first, then moves toward goat clusters, then by position degree.
 * For goats: moves to high-degree center nodes first, avoid risky positions.
 */
function orderMoves(moves, turn, baghs, bakhras) {
    return moves.sort((a, b) => {
        if (turn === 'bagh') {
            // Captures first (highest priority for tiger)
            const aCapture = a.capture ? 1 : 0;
            const bCapture = b.capture ? 1 : 0;
            if (aCapture !== bCapture) return bCapture - aCapture;
            // Then prefer destinations with higher degree (more connections)
            return POSITION_DEGREE[b.to] - POSITION_DEGREE[a.to];
        } else {
            // For goats: prefer placing/moving to high-degree positions (center control)
            // Penalize positions at risk
            const aRisk = isGoatAtRisk(a.to, baghs, bakhras) ? 1 : 0;
            const bRisk = isGoatAtRisk(b.to, baghs, bakhras) ? 1 : 0;
            if (aRisk !== bRisk) return aRisk - bRisk;
            return POSITION_DEGREE[b.to] - POSITION_DEGREE[a.to];
        }
    });
}

// ============================================================
// Minimax with Alpha-Beta Pruning
// ============================================================
/**
 * Recursive Minimax search with alpha-beta pruning.
 *
 * @param {Set} baghs - Set of tiger position keys
 * @param {Set} bakhras - Set of goat position keys
 * @param {number} bakhrasCaptured - Number of goats captured so far
 * @param {number} bakhrasPlaced - Number of goats placed so far
 * @param {string} turn - 'bagh' or 'bakhra'
 * @param {number} depth - Remaining search depth
 * @param {number} alpha - Best score for the maximizer found so far (tiger)
 * @param {number} beta - Best score for the minimizer found so far (goat)
 * @param {boolean} isMaximizing - True if the current player is tiger (maximizer)
 * @returns {number} The best heuristic score for this subtree
 */
function minimax(baghs, bakhras, bakhrasCaptured, bakhrasPlaced, turn, depth, alpha, beta, isMaximizing) {
    // --- Terminal / Base Cases ---

    // Win/loss check before depth check so we don't miss game-ending moves
    if (bakhrasCaptured >= CAPTURE_TO_WIN) return 100000 + depth; // Tiger wins; prefer faster wins
    const trapped = countTrappedTigersIn(baghs, bakhras);
    if (trapped === baghs.size && baghs.size > 0) return -100000 - depth; // Goat wins; prefer faster wins

    if (depth === 0) {
        // Leaf node: return heuristic evaluation
        return evaluate(baghs, bakhras, bakhrasCaptured, bakhrasPlaced);
    }

    const moves = generateMoves(turn, baghs, bakhras, bakhrasPlaced);

    if (moves.length === 0) {
        // No moves available — shouldn't happen in normal Baghchal
        // but handle gracefully by returning evaluation
        return evaluate(baghs, bakhras, bakhrasCaptured, bakhrasPlaced);
    }

    // Order moves for better pruning efficiency
    orderMoves(moves, turn, baghs, bakhras);

    if (isMaximizing) {
        // Tiger's turn: maximize the score
        let maxScore = -Infinity;
        for (const move of moves) {
            // --- Apply Move (clone state to avoid mutation) ---
            const newBaghs = new Set(baghs);
            const newBakhras = new Set(bakhras);
            let newCaptured = bakhrasCaptured;
            let newPlaced = bakhrasPlaced;

            if (move.type === 'move') {
                newBaghs.delete(move.from);
                newBaghs.add(move.to);
                if (move.capture) {
                    newBakhras.delete(move.capture);
                    newCaptured++;
                }
            }
            // (Tigers never place, so no placement case here)

            const score = minimax(
                newBaghs, newBakhras, newCaptured, newPlaced,
                'bakhra', depth - 1, alpha, beta, false
            );
            maxScore = Math.max(maxScore, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break; // Beta cut-off: goat's best is already worse
        }
        return maxScore;
    } else {
        // Goat's turn: minimize the score
        let minScore = Infinity;
        for (const move of moves) {
            // --- Apply Move ---
            const newBaghs = new Set(baghs);
            const newBakhras = new Set(bakhras);
            let newCaptured = bakhrasCaptured;
            let newPlaced = bakhrasPlaced;

            if (move.type === 'place') {
                newBakhras.add(move.to);
                newPlaced++;
            } else if (move.type === 'move') {
                newBakhras.delete(move.from);
                newBakhras.add(move.to);
            }

            const score = minimax(
                newBaghs, newBakhras, newCaptured, newPlaced,
                'bagh', depth - 1, alpha, beta, true
            );
            minScore = Math.min(minScore, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) break; // Alpha cut-off: tiger's best is already better
        }
        return minScore;
    }
}

// ============================================================
// Public API
// ============================================================

/**
 * Get the best bot move for the given game state.
 *
 * This is the single entry point for the bot. It runs the full
 * minimax search and returns the best move it found.
 *
 * @param {string} botRole - 'bagh' (tiger) or 'bakhra' (goat)
 * @param {Object} gameState - The current game state object (from state.js)
 * @param {number} [depthOverride] - Optional depth override (uses SEARCH_DEPTH if omitted)
 * @param {Set<string>} [forbiddenMoveKeys] - Optional set of "from→to" keys to avoid
 * @returns {{ type: 'place'|'move', from: string|null, to: string, capture: string|null } | null}
 *   Returns null if no legal moves exist (should not happen in a valid game).
 */
export function getBotMove(botRole, gameState, depthOverride, forbiddenMoveKeys) {
    const { baghs, bakhras, bakhrasCaptured, bakhrasPlaced } = gameState;
    const searchDepth = depthOverride ?? SEARCH_DEPTH;

    // It's only legal to call this when it IS the bot's turn
    if (gameState.turn !== botRole) {
        console.warn('[Bot] getBotMove called when it is not the bot\'s turn.');
        return null;
    }

    // Generate all legal moves for the bot
    const moves = generateMoves(botRole, baghs, bakhras, bakhrasPlaced);
    if (moves.length === 0) return null;

    // Order moves for consistency with the search
    orderMoves(moves, botRole, baghs, bakhras);

    // Tiger maximizes, goat minimizes
    const isBotTiger = botRole === 'bagh';
    let bestMove = null;
    let bestScore = isBotTiger ? -Infinity : Infinity;
    // Fallback: best move ignoring the forbidden filter (used only if ALL moves are forbidden)
    let fallbackMove = null;
    let fallbackScore = isBotTiger ? -Infinity : Infinity;

    for (const move of moves) {
        // Apply move to a cloned state
        const newBaghs = new Set(baghs);
        const newBakhras = new Set(bakhras);
        let newCaptured = bakhrasCaptured;
        let newPlaced = bakhrasPlaced;

        if (move.type === 'place') {
            newBakhras.add(move.to);
            newPlaced++;
        } else if (move.type === 'move') {
            if (isBotTiger) {
                newBaghs.delete(move.from);
                newBaghs.add(move.to);
                if (move.capture) {
                    newBakhras.delete(move.capture);
                    newCaptured++;
                }
            } else {
                newBakhras.delete(move.from);
                newBakhras.add(move.to);
            }
        }

        // Evaluate from the opponent's perspective for the next depth
        const score = minimax(
            newBaghs, newBakhras, newCaptured, newPlaced,
            isBotTiger ? 'bakhra' : 'bagh',
            searchDepth - 1,
            -Infinity, Infinity,
            !isBotTiger // Next turn is opponent: flip maximizing flag
        );

        // Track the unconstrained best (fallback if all moves are forbidden)
        if (isBotTiger ? score > fallbackScore : score < fallbackScore) {
            fallbackScore = score;
            fallbackMove = move;
        }

        // Skip moves the bot has already repeated too many times
        const moveKey = `${move.from}→${move.to}`;
        if (forbiddenMoveKeys && forbiddenMoveKeys.has(moveKey)) continue;

        if (isBotTiger ? score > bestScore : score < bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    // If all non-forbidden moves scored worse than the initial sentinel (no best was set),
    // fall back to the unconstrained best to avoid returning null.
    const chosen = bestMove ?? fallbackMove;
    if (bestMove === null && fallbackMove !== null) {
        console.warn('[Bot] All non-repeated moves were filtered; using fallback move to avoid stall.');
    }

    console.log(`[Bot] ${botRole} chose move:`, chosen, `score: ${bestMove ? bestScore : fallbackScore}`);
    return chosen;
}

/**
 * Strategic opening moves for the bot, keyed by botRole.
 *
 * For Goat bot: The strongest opening is to control center positions.
 *   Placing at c3 (center) gives 8 connections — the most of any node.
 *   The first few moves follow an established strong strategy.
 *
 * For Tiger bot: No special openings needed (tigers start pre-placed).
 *   The minimax search handles all tiger decisions from turn 1.
 *
 * We only use opening book for the very first few placements where
 * the branching factor (25 possible placements) makes search expensive
 * but the "right" moves are well-known strategically.
 */
const GOAT_OPENING_BOOK = [
    'c1',
];

/**
 * Get the bot's move, using the opening book for the first few goat placements.
 * Falls back to minimax for all other decisions.
 *
 * @param {string} botRole - 'bagh' or 'bakhra'
 * @param {Object} gameState - Current game state
 * @param {number} [depthOverride] - Optional search depth override
 * @param {Set<string>} [forbiddenMoveKeys] - Move keys to exclude (repetition guard)
 * @returns Move object or null
 */
export function getBotMoveWithOpening(botRole, gameState, depthOverride, forbiddenMoveKeys) {
    // For goat bot in early placement phase, use opening book
    // (only on Medium/Hard — on Easy, skip the book so the bot feels less scripted)
    if (botRole === 'bakhra' && gameState.bakhrasPlaced < GOAT_OPENING_BOOK.length) {
        const effectiveDepth = depthOverride ?? SEARCH_DEPTH;
        if (effectiveDepth > DIFFICULTY_DEPTH.easy) {
            const bookPos = GOAT_OPENING_BOOK[gameState.bakhrasPlaced];
            // Validate the book position is still available
            if (!gameState.baghs.has(bookPos) && !gameState.bakhras.has(bookPos)) {
                return { type: 'place', from: null, to: bookPos, capture: null };
            }
            // If opening book move is occupied, fall through to minimax
        }
    }

    return getBotMove(botRole, gameState, depthOverride, forbiddenMoveKeys);
}

/**
 * Main difficulty-aware entry point for the bot.
 *
 * Detects consecutive oscillation in the bot's last 3 moves:
 *   If the pattern is  A→B, B→A, A→B  (the last move repeats the one before last),
 *   the move A→B is forbidden this turn, forcing the bot to choose something else.
 *
 * @param {string} botRole - 'bagh' or 'bakhra'
 * @param {Object} gameState - Current game state (must include botMoveHistory)
 * @param {'easy'|'medium'|'hard'} [difficulty='hard'] - Difficulty level
 * @returns Move object or null
 */
export function getBotMoveWithDifficulty(botRole, gameState, difficulty = 'hard') {
    const depth = DIFFICULTY_DEPTH[difficulty] ?? DIFFICULTY_DEPTH.hard;

    // ---- Consecutive oscillation guard ----
    // Detect the pattern: move[-3]=A→B, move[-2]=B→A, move[-1]=A→B
    // i.e. the last move is identical to the one two moves ago AND
    // the middle move is the exact reverse.
    // If that pattern is found, forbid repeating A→B again.
    const forbiddenMoveKeys = new Set();
    const history = gameState.botMoveHistory || [];
    const len = history.length;

    if (len >= 3) {
        const m1 = history[len - 3]; // A→B
        const m2 = history[len - 2]; // B→A
        const m3 = history[len - 1]; // A→B  (same as m1)

        const isOscillating =
            m1.from !== null &&                  // skip placement moves
            m1.from === m3.from &&               // m1 and m3 have same from
            m1.to   === m3.to   &&               // m1 and m3 have same to
            m2.from === m1.to   &&               // m2 is the reverse
            m2.to   === m1.from;

        if (isOscillating) {
            const forbidden = `${m3.from}→${m3.to}`;
            forbiddenMoveKeys.add(forbidden);
            console.log(`[Bot] Oscillation detected — forbidding ${forbidden} this turn.`);
        }
    }

    return getBotMoveWithOpening(botRole, gameState, depth, forbiddenMoveKeys);
}
