import { setupAssets } from "./assets.js";
import { render } from "./render.js";
import { setupInput } from "./input.js";
import { resetState } from "./state.js";
import { addLog, resetMoveNumber } from "./ui.js";
import { CANVAS_SIZE } from "./constants.js";
import {
  saveSnapshot,
  resetReplay,
  startReplay,
  stepBack,
  stepForward,
} from "./replay.js";
import { countTrappedTigers } from "./logic.js";
import { initNetwork, createRoom, joinRoom, playAgain, cancelGame } from "./network.js";
import { state } from "./state.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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

// Re-render on resize (window resize, zoom, orientation change)
new ResizeObserver(resizeCanvas).observe(canvas);

function resetGame() {
  if (state.isMultiplayer) return; // Do not reset locally if multiplayer
  resetState();
  resetReplay();
  resetMoveNumber();
  document.getElementById("moveLog").innerHTML = "";
  addLog("Game started. Goat places first.", "system");
  document.getElementById("gameOverOverlay").classList.remove("show");
  saveSnapshot(countTrappedTigers());
  resizeCanvas();
}

document.getElementById("btnPlayAgain").addEventListener("click", () => {
  if (state.isMultiplayer) {
    playAgain();
    document.getElementById("btnPlayAgain").disabled = true;
    document.getElementById("btnPlayAgain").textContent = "Waiting...";
  } else {
    resetGame();
  }
});

const btnCancelGame = document.getElementById("btnCancelGame");
if (btnCancelGame) {
  btnCancelGame.addEventListener("click", () => {
    cancelGame();
  });
}

const btnExitRoom = document.getElementById("btnExitRoom");
if (btnExitRoom) {
  btnExitRoom.addEventListener("click", () => {
    if (confirm("Are you sure you want to exit? This will destroy the room for both players.")) {
      cancelGame();
    }
  });
}

// Local Storage for Name
function getStoredName() {
  return localStorage.getItem('baghchal_display_name') || '';
}

function setStoredName(name) {
  if (name) localStorage.setItem('baghchal_display_name', name);
}

// Modal Elements
const createRoomModal = document.getElementById("createRoomModal");
const joinRoomModal = document.getElementById("joinRoomModal");
const aboutModal = document.getElementById("aboutModal");

// Close modals when clicking outside
[createRoomModal, joinRoomModal, aboutModal].forEach(modal => {
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("show");
    });
  }
});

// Create Room Flow
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

// About Modal Flow
const btnAbout = document.getElementById("btnAbout");
if (btnAbout) {
  btnAbout.addEventListener("click", () => {
    if (aboutModal) aboutModal.classList.add("show");
  });
}

const btnCloseAbout = document.getElementById("btnCloseAbout");
if (btnCloseAbout) {
  btnCloseAbout.addEventListener("click", () => {
    if (aboutModal) aboutModal.classList.remove("show");
  });
}

// Join Room Flow
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

setupInput(canvas, ctx);
setupAssets(() => resizeCanvas());

// Init networking
initNetwork(ctx);

// Save initial board state as first snapshot
saveSnapshot(0);
resizeCanvas();
