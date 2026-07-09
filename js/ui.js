import { state } from "./state.js";
import { MAX_BAKHRA } from "./constants.js";
import { countTrappedTigers } from "./logic.js";
import { getViewState, isReplaying, getReplayInfo } from "./replay.js";

let moveNumber = 0;

export function updateUI() {
  const vs = getViewState();
  const replaying = isReplaying();
  const info = getReplayInfo();

  const toPlace = MAX_BAKHRA - vs.bakhrasPlaced;
  document.getElementById("goatsToPlace").textContent = toPlace;
  document.getElementById("goatsOnBoard").textContent = vs.bakhras.size;
  document.getElementById("goatsCaptured").textContent = vs.bakhrasCaptured;
  document.getElementById("tigersOnBoard").textContent = vs.baghs.size;
  document.getElementById("tigersTrapped").textContent = replaying
    ? vs.trappedTigers
    : countTrappedTigers();
  document.getElementById("tigerKills").textContent = vs.bakhrasCaptured;

  const turnText = document.getElementById("turnText");
  const panelBakhra = document.getElementById("panelBakhra");
  const panelBagh = document.getElementById("panelBagh");

  if (vs.gameOver) {
    turnText.textContent = vs.winner === "bagh" ? "TIGERS WIN!" : "GOATS WIN!";
  } else if (vs.turn === "bakhra") {
    turnText.textContent = "GOAT's Turn";
    panelBakhra.classList.add("active");
    panelBagh.classList.remove("active");
  } else {
    turnText.textContent = "TIGER's Turn";
    panelBagh.classList.add("active");
    panelBakhra.classList.remove("active");
  }

  // Game Over overlay — only show when viewing the final (live) position
  const overlay = document.getElementById("gameOverOverlay");
  if (vs.gameOver && !replaying) {
    overlay.classList.add("show");
    document.getElementById("gameOverTitle").textContent =
      vs.winner === "bagh" ? "TIGERS WIN" : "GOATS WIN";
    document.getElementById("gameOverMsg").textContent =
      vs.winner === "bagh"
        ? `Tigers captured ${vs.bakhrasCaptured} goats!`
        : "All tigers are trapped! Goats win!";
  } else {
    overlay.classList.remove("show");
  }

  // Replay bar
  const replayBar = document.getElementById("replayBar");
  if (replayBar) {
    if (replaying) {
      replayBar.classList.add("show");
      document.getElementById("replayPosition").textContent =
        `Move ${info.current} / ${info.total - 1}`;
      const replayPrevBtn = document.getElementById("replayPrevBtn");
      const replayNextBtn = document.getElementById("replayNextBtn");
      if (replayPrevBtn) replayPrevBtn.disabled = info.current <= 0;
      if (replayNextBtn)
        replayNextBtn.disabled = info.current >= info.total - 1;
      const replayHint = document.getElementById("replayHint");
      if (replayHint) replayHint.textContent = "Space or board click to resume";
    } else {
      replayBar.classList.remove("show");
    }
  }

  const replayLaunch = document.getElementById("replayLaunch");
  if (replayLaunch) {
    replayLaunch.classList.toggle("show", info.total > 1);
    replayLaunch.disabled = info.total <= 1;
  }

  // Highlight the active move in the log during replay
  highlightLogEntry();
}

/**
 * Highlights the log entry corresponding to the current replay position.
 * viewIndex 0 = initial state (no move), viewIndex 1 = move #1, etc.
 */
function highlightLogEntry() {
  const logContainer = document.getElementById("moveLog");
  if (!logContainer) return;

  const entries = logContainer.querySelectorAll(".log-entry");
  const info = getReplayInfo();
  const replaying = isReplaying();

  entries.forEach((entry, i) => {
    entry.classList.remove("log-active");
  });

  if (replaying) {
    // viewIndex maps to move number: index 0 = before any move, index 1 = after move 1
    // Log entries: index 0 = system message, index 1 = move 1, index 2 = move 2, ...
    // So the active log entry index = viewIndex (since system msg is at 0, move 1 at 1, etc.)
    const activeIndex = info.current; // viewIndex (0-based)
    if (activeIndex >= 0 && activeIndex < entries.length) {
      entries[activeIndex].classList.add("log-active");
      // Auto-scroll the active entry into view
      entries[activeIndex].scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }
}

export function addLog(msg, type) {
  const logContainer = document.getElementById("moveLog");

  const span = document.createElement("span");
  span.className = `log-entry log-${type}`;

  // Add move number for non-system messages
  if (type === "system") {
    span.textContent = msg;
  } else {
    moveNumber++;
    span.textContent = `${moveNumber}. ${msg}`;
  }

  // Store the move index for replay highlighting
  span.dataset.moveIndex = type === "system" ? "0" : String(moveNumber);

  logContainer.appendChild(span);
  logContainer.scrollTop = logContainer.scrollHeight;

  state.moveHistory.push(msg);
}

export function resetMoveNumber() {
  moveNumber = 0;
}
