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


  const panelBakhra = document.getElementById("panelBakhra");
  const panelBagh = document.getElementById("panelBagh");

  const goatNameEl = document.getElementById("goatPlayerName");
  const tigerNameEl = document.getElementById("tigerPlayerName");

  if (state.isMultiplayer && state.players) {
    const goatPlayer = state.players.find(p => p.side === 'bakhra');
    const tigerPlayer = state.players.find(p => p.side === 'bagh');
    if (goatPlayer && goatNameEl) goatNameEl.textContent = goatPlayer.name.toUpperCase();
    if (tigerPlayer && tigerNameEl) tigerNameEl.textContent = tigerPlayer.name.toUpperCase();

    if (state.localRole === 'bakhra') {
      panelBakhra.style.order = "4";
      panelBagh.style.order = "1";
    } else if (state.localRole === 'bagh') {
      panelBakhra.style.order = "1";
      panelBagh.style.order = "4";
    }

    const exitBtn = document.getElementById("btnExitRoom");
    if (exitBtn) exitBtn.style.display = "flex";

    const createBtn = document.getElementById("btnCreateRoom");
    if (createBtn) createBtn.style.display = "none";
    const joinBtn = document.getElementById("btnJoinRoom");
    if (joinBtn) joinBtn.style.display = "none";

    const roomCodeDisplay = document.getElementById("roomCodeDisplay");
    if (state.players.length === 2 && roomCodeDisplay) {
        roomCodeDisplay.style.display = "none";
    }
  } else {
    if (goatNameEl) goatNameEl.textContent = "GOATS";
    if (tigerNameEl) tigerNameEl.textContent = "TIGERS";

    panelBakhra.style.order = "";
    panelBagh.style.order = "";

    const exitBtn = document.getElementById("btnExitRoom");
    if (exitBtn) exitBtn.style.display = "none";

    const roomCodeDisplay = document.getElementById("roomCodeDisplay");
    if (roomCodeDisplay) roomCodeDisplay.style.display = "none";

    const createBtn = document.getElementById("btnCreateRoom");
    if (createBtn) createBtn.style.display = "inline-flex";
    const joinBtn = document.getElementById("btnJoinRoom");
    if (joinBtn) joinBtn.style.display = "inline-flex";
  }

  if (vs.gameOver) {
    // game over logic is handled below
  } else if (vs.turn === "bakhra") {
    panelBakhra.classList.add("active");
    panelBagh.classList.remove("active");
  } else {
    panelBagh.classList.add("active");
    panelBakhra.classList.remove("active");
  }

  // Game Over overlay — only show when viewing the final (live) position
  const overlay = document.getElementById("gameOverOverlay");
  const cancelBtn = document.getElementById("btnCancelGame");
  if (vs.gameOver && !replaying) {
    overlay.classList.add("show");
    document.getElementById("gameOverTitle").textContent =
      vs.winner === "bagh" ? "TIGERS WIN" : "GOATS WIN";
    document.getElementById("gameOverMsg").textContent =
      vs.winner === "bagh"
        ? `Tigers captured ${vs.bakhrasCaptured} goats!`
        : "All tigers are trapped! Goats win!";

    // In multiplayer, show "Cancel" to destroy room.
    if (cancelBtn) {
      cancelBtn.style.display = state.isMultiplayer ? "inline-flex" : "none";
    }
  } else {
    overlay.classList.remove("show");
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
    // viewIndex maps exactly to the moveNumber (info.current)
    // Find the last entry with the matching moveIndex
    let activeEntry = null;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].dataset.moveIndex === String(info.current)) {
        activeEntry = entries[i];
        break;
      }
    }

    if (activeEntry) {
      activeEntry.classList.add("log-active");
      // Auto-scroll the active entry into view
      activeEntry.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }
}

export function showErrorModal(msg, onClose = null) {
  const modal = document.getElementById("errorModal");
  const msgEl = document.getElementById("errorModalMsg");
  const titleEl = modal?.querySelector("h2");
  if (modal && msgEl) {
    if (titleEl) {
      titleEl.textContent = "Error";
      titleEl.style.color = "var(--danger)";
    }
    msgEl.textContent = msg;
    modal.classList.add("show");

    const btnDismiss = document.getElementById("btnDismissError");
    if (btnDismiss) {
      // Clear old listeners by cloning the button
      const newBtn = btnDismiss.cloneNode(true);
      btnDismiss.parentNode.replaceChild(newBtn, btnDismiss);

      newBtn.addEventListener("click", () => {
        modal.classList.remove("show");
        if (onClose) onClose();
      });
    }
  } else {
    alert(msg);
    if (onClose) onClose();
  }
}

export function showInfoModal(msg, onClose = null) {
  const modal = document.getElementById("errorModal");
  const msgEl = document.getElementById("errorModalMsg");
  const titleEl = modal?.querySelector("h2");
  if (modal && msgEl) {
    if (titleEl) {
      titleEl.textContent = "Info";
      titleEl.style.color = "var(--text-primary)";
    }
    msgEl.textContent = msg;
    modal.classList.add("show");

    const btnDismiss = document.getElementById("btnDismissError");
    if (btnDismiss) {
      const newBtn = btnDismiss.cloneNode(true);
      btnDismiss.parentNode.replaceChild(newBtn, btnDismiss);

      newBtn.addEventListener("click", () => {
        modal.classList.remove("show");
        if (onClose) onClose();
      });
    }
  } else {
    alert(msg);
    if (onClose) onClose();
  }
}

let systemBannerTimeout = null;

export function showSystemBanner(msg, isError = false) {
  const banner = document.getElementById("systemBanner");
  if (banner) {
    banner.innerHTML = msg;
    banner.style.display = "block";

    if (isError) {
      banner.style.background = "#ffebee";
      banner.style.color = "#c62828";
      banner.style.borderBottom = "1px solid #c62828";
    } else {
      banner.style.background = "var(--bg-secondary)";
      banner.style.color = "var(--text-primary)";
      banner.style.borderBottom = "1px solid var(--border-color)";
    }

    if (systemBannerTimeout) {
      clearTimeout(systemBannerTimeout);
    }

    // Auto hide after 5 seconds unless it's an error
    if (!isError) {
      systemBannerTimeout = setTimeout(() => {
        banner.style.display = "none";
      }, 5000);
    }
  }
}

export function hideSystemBanner() {
  const banner = document.getElementById("systemBanner");
  if (banner) {
    banner.style.display = "none";
  }
}

export function addLog(msg, type) {
  const logContainer = document.getElementById("moveLog");
  if (!logContainer) return;

  const span = document.createElement("span");
  span.className = `log-entry log-${type}`;

  if (type === "system") {
    span.textContent = msg;
  } else {
    moveNumber++;
    span.textContent = `${moveNumber}. ${msg}`;
  }

  span.dataset.moveIndex = type === "system" ? "0" : String(moveNumber);
  logContainer.appendChild(span);
  logContainer.scrollTop = logContainer.scrollHeight;

  if (type !== "system") {
    state.moveHistory.push(msg);
  }
}

export function renderMoveHistory(history) {
  const logContainer = document.getElementById("moveLog");
  if (!logContainer) return;

  logContainer.innerHTML = '<span class="log-entry log-system" data-move-index="0">Game started. Goat places first.</span>';
  moveNumber = 0;

  if (history && history.length > 0) {
    history.forEach((msg, index) => {
      moveNumber++;
      const span = document.createElement("span");
      span.className = `log-entry log-move`;
      span.textContent = `${moveNumber}. ${msg}`;
      span.dataset.moveIndex = String(moveNumber);
      logContainer.appendChild(span);
    });
  }
  logContainer.scrollTop = logContainer.scrollHeight;
}

export function resetMoveNumber() {
  moveNumber = 0;
}
