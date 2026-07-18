/**
 * main.js — Baghchal Application Entry Point
 *
 * Responsibilities:
 *  - Canvas setup and HiDPI-aware resizing
 *  - Game reset and "Play Again" logic
 *  - Bot mode orchestration (scheduling AI moves after human turns)
 *  - Modal wiring (Play vs Bot, Create Room, Join Room, About)
 *  - Network initialization
 */

import { setupAssets } from "./assets.js";
import { render } from "./render.js";
import { setupInput } from "./input.js";
import { resetState, state } from "./state.js";
import { addLog, resetMoveNumber, updateUI } from "./ui.js";
import { CANVAS_SIZE } from "./constants.js";
import {
  saveSnapshot,
  resetReplay,
  startReplay,
  stepBack,
  stepForward,
} from "./replay.js";
import { countTrappedTigers, getLegalMovesFor, placeGoat, movePiece } from "./logic.js";
import { initNetwork, createRoom, joinRoom, playAgain, cancelGame } from "./network.js";
import { getBotMoveWithDifficulty } from "./bot.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ============================================================
// Canvas Sizing
// ============================================================

/**
 * Sizes the canvas buffer to match its CSS display size × devicePixelRatio,
 * then scales the 2D context so logical coordinates (0–CANVAS_SIZE) map
 * to the full high-resolution buffer. This eliminates blur on all displays.
 */
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  // Scale so our CANVAS_SIZE coordinate system fills the buffer
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(canvas.width / CANVAS_SIZE, canvas.height / CANVAS_SIZE);

  render(ctx);
}

// Debounce resize events to avoid thrashing on rapid window changes
let resizeTimeout;
function debouncedResize() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => resizeCanvas(), 100);
}
new ResizeObserver(debouncedResize).observe(canvas);

// ============================================================
// Bot Move Scheduling
// ============================================================

/**
 * Prevent double-scheduling: if a bot move is already pending in
 * the setTimeout queue, we skip registering another one.
 */
let botMoveScheduled = false;

/**
 * Schedule the bot to make its move after a short human-friendly delay.
 *
 * Why a delay?
 *  - Allows the canvas to render the human's move before the bot responds.
 *  - Gives the experience a more natural, "thinking" feel.
 *  - Prevents the bot from executing synchronously in the same call stack
 *    as the human's action, which could cause rendering artifacts.
 *
 * Safe to call multiple times — idempotent due to the botMoveScheduled flag.
 */
export function scheduleBotMove() {
  if (!state.isBotMode) return;
  if (state.gameOver) return;
  if (state.turn !== state.botRole) return;
  if (botMoveScheduled) return;

  botMoveScheduled = true;

  setTimeout(() => {
    botMoveScheduled = false;

    // Re-validate conditions after the delay (game state may have changed)
    if (!state.isBotMode || state.gameOver || state.turn !== state.botRole) return;

    // ---- Get the bot's best move from the AI engine ----
    const botMove = getBotMoveWithDifficulty(state.botRole, state, state.botDifficulty || 'hard');
    if (!botMove) {
      console.warn("[Bot] No legal moves found — this should not happen in normal play.");
      return;
    }

    // ---- Execute the bot's move using the same core logic as human moves ----
    let acted = false;

    if (botMove.type === 'place') {
      // Goat bot: place a goat on the board during the placement phase
      acted = placeGoat(botMove.to);

    } else if (botMove.type === 'move') {
      // Either tiger or goat bot: move a piece from one position to another.
      // We must set state.selected and state.legalMoves so movePiece can
      // validate the move against its internal legal-moves check.
      state.selected = botMove.from;
      state.legalMoves = getLegalMovesFor(botMove.from);
      acted = movePiece(botMove.to);
    }

    if (acted) {
      // Record this move in the bot's history for repetition detection
      if (botMove.from !== undefined) {
        state.botMoveHistory.push({ from: botMove.from, to: botMove.to });
      }
      render(ctx);
      // After the bot's move, check if somehow it's still the bot's turn
      // (this shouldn't happen but is a safety net for edge cases).
      if (!state.gameOver && state.turn === state.botRole) {
        scheduleBotMove();
      }
    }
  }, 650); // 650ms — natural "thinking" delay
}

// ============================================================
// Game Reset
// ============================================================

/**
 * Reset the game to a fresh initial state.
 * Preserves bot mode configuration so "Play Again" works in bot mode.
 * In multiplayer, the server handles resets — we do nothing locally.
 */
function resetGame() {
  if (state.isMultiplayer) return;

  resetState();     // Clears board; preserves isBotMode + botRole
  resetReplay();
  resetMoveNumber();
  document.getElementById("moveLog").innerHTML = "";
  addLog("Game started. Goat places first.", "system");
  document.getElementById("gameOverOverlay").classList.remove("show");
  saveSnapshot(countTrappedTigers());
  resizeCanvas();

  // If the bot plays Goat (bakhra), it moves FIRST since goat always opens.
  if (state.isBotMode && state.botRole === 'bakhra') {
    scheduleBotMove();
  }
}

// ============================================================
// Game Over Controls
// ============================================================

document.getElementById("btnPlayAgain").addEventListener("click", () => {
  if (state.isMultiplayer) {
    // Signal the server we want a rematch; wait for 'rematch-started' event
    playAgain();
    document.getElementById("btnPlayAgain").disabled = true;
    document.getElementById("btnPlayAgain").textContent = "Waiting...";
  } else {
    // Local or bot mode: reset immediately
    resetGame();
  }
});

const btnCancelGame = document.getElementById("btnCancelGame");
if (btnCancelGame) {
  btnCancelGame.addEventListener("click", () => cancelGame());
}

const btnCancelWaiting = document.getElementById("btnCancelWaiting");
if (btnCancelWaiting) {
  btnCancelWaiting.addEventListener("click", () => cancelGame());
}

const btnExitRoom = document.getElementById("btnExitRoom");
if (btnExitRoom) {
  btnExitRoom.addEventListener("click", () => {
    if (confirm("Are you sure you want to exit? This will destroy the room for both players.")) {
      cancelGame();
    }
  });
}

// ============================================================
// "Exit Bot" Button — return to normal local play
// ============================================================

const btnExitBot = document.getElementById("btnExitBot");
if (btnExitBot) {
  btnExitBot.addEventListener("click", () => {
    // Turn off bot mode BEFORE resetState so botRole is not preserved
    state.isBotMode = false;
    state.botRole = null;

    resetState();
    resetReplay();
    resetMoveNumber();
    document.getElementById("moveLog").innerHTML = "";
    addLog("Game started. Goat places first.", "system");
    document.getElementById("gameOverOverlay").classList.remove("show");
    saveSnapshot(countTrappedTigers());
    resizeCanvas();
    updateUI();
  });
}

// ============================================================
// Local Storage for Display Name
// ============================================================

function getStoredName() {
  return localStorage.getItem('baghchal_display_name') || '';
}
function setStoredName(name) {
  if (name) localStorage.setItem('baghchal_display_name', name);
}

// ============================================================
// Modal References
// ============================================================

const createRoomModal = document.getElementById("createRoomModal");
const joinRoomModal = document.getElementById("joinRoomModal");

const botModal = document.getElementById("botModal");

// Dismiss any overlay modal when the user clicks its dark backdrop
[createRoomModal, joinRoomModal, botModal].forEach(modal => {
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("show");
    });
  }
});

// ============================================================
// Play vs Bot Modal Flow
// ============================================================

/**
 * "Play vs Bot" opens a centered modal on the board where the player
 * chooses which side they want to play (Goat or Tiger). The bot gets
 * the opposite side, then a fresh bot-mode game begins.
 */
const btnPlayBot = document.getElementById("btnPlayBot");
if (btnPlayBot) {
  btnPlayBot.addEventListener("click", () => {
    if (botModal) botModal.classList.add("show");
  });
}

const btnCancelBot = document.getElementById("btnCancelBot");
if (btnCancelBot) {
  btnCancelBot.addEventListener("click", () => {
    if (botModal) botModal.classList.remove("show");
  });
}

// Each side-picker button in the bot modal carries data-side="bakhra"|"bagh"
document.querySelectorAll(".bot-side-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const humanSide = btn.dataset.side;          // 'bakhra' or 'bagh'
    const botSide = humanSide === 'bakhra' ? 'bagh' : 'bakhra';
    const difficultySelect = document.getElementById("botDifficultySelect");
    const difficulty = difficultySelect ? difficultySelect.value : 'hard';

    if (botModal) botModal.classList.remove("show");

    // Activate bot mode — set flags BEFORE resetState so they are preserved
    state.isBotMode = true;
    state.botRole = botSide;
    state.botDifficulty = difficulty;

    // Fresh game start
    resetState();
    resetReplay();
    resetMoveNumber();
    document.getElementById("moveLog").innerHTML = "";
    addLog("Game started. Goat places first.", "system");
    document.getElementById("gameOverOverlay").classList.remove("show");
    saveSnapshot(countTrappedTigers());
    resizeCanvas();
    updateUI();

    // Bot plays goat → bot goes first (goat always opens)
    if (botSide === 'bakhra') {
      scheduleBotMove();
    }
  });
});

// ============================================================
// Create Room Flow
// ============================================================

const btnCreateRoom = document.getElementById("btnCreateRoom");
if (btnCreateRoom) {
  btnCreateRoom.addEventListener("click", () => {
    createRoomModal.classList.add("show");
    const nameInput = document.getElementById("createNameInput");
    if (nameInput) nameInput.value = getStoredName();
  });
}

document.getElementById("btnCancelCreate").addEventListener("click", () => {
  createRoomModal.classList.remove("show");
});

document.getElementById("btnConfirmCreate").addEventListener("click", () => {
  const name = document.getElementById("createNameInput").value.trim();
  if (!name) return alert("Please enter a display name");
  const side = document.getElementById("createSideSelect").value;
  setStoredName(name);
  createRoomModal.classList.remove("show");
  createRoom(name, side);
});

// ============================================================
// About Modal Flow
// ============================================================

// ============================================================
// Join Room Flow
// ============================================================

const btnJoinRoom = document.getElementById("btnJoinRoom");
if (btnJoinRoom) {
  btnJoinRoom.addEventListener("click", () => {
    joinRoomModal.classList.add("show");
    const nameInput = document.getElementById("joinNameInput");
    if (nameInput) nameInput.value = getStoredName();
  });
}

document.getElementById("btnCancelJoin").addEventListener("click", () => {
  joinRoomModal.classList.remove("show");
});

document.getElementById("btnConfirmJoin").addEventListener("click", () => {
  const name = document.getElementById("joinNameInput").value.trim();
  const roomId = document.getElementById("joinCodeInput").value.trim().toUpperCase();
  if (!name) return alert("Please enter a display name");
  if (!roomId) return alert("Please enter a room code");
  setStoredName(name);
  joinRoomModal.classList.remove("show");
  joinRoom(roomId, name);
});

// ============================================================
// Bot Move Trigger via MutationObserver
// ============================================================

/**
 * Every successful move (by either player) appends a new entry to the
 * move log DOM element. We watch for these DOM mutations as a clean,
 * non-invasive hook to detect when the human's turn has ended and it's
 * time to schedule the bot's response.
 *
 * This approach avoids modifying the core logic.js functions and keeps
 * the bot fully decoupled from the game engine.
 */
const moveLog = document.getElementById("moveLog");
if (moveLog) {
  const botTriggerObserver = new MutationObserver(() => {
    if (state.isBotMode && !state.gameOver && state.turn === state.botRole) {
      scheduleBotMove();
    }
  });
  botTriggerObserver.observe(moveLog, { childList: true });
}

// ============================================================
// Initialization
// ============================================================

setupInput(canvas, ctx);
setupAssets(() => resizeCanvas());

// Initialize Socket.io multiplayer networking
initNetwork(ctx);

// Capture initial board state (all tigers at corners, no goats yet) as snapshot 0
saveSnapshot(0);
resizeCanvas();
