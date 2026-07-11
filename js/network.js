import { state, syncStateFromServer, resetState } from './state.js';
import { updateUI, addLog, showErrorModal, showInfoModal, showSystemBanner, hideSystemBanner, renderMoveHistory } from './ui.js';
import { render } from './render.js';
import { countTrappedTigers } from './logic.js';
import { saveSnapshot, resetReplay } from './replay.js';
import { playSound } from './audio.js';
import { io } from 'socket.io-client';

let socket = null;
let playerId = null;

export function initNetwork(canvasCtx) {

    // Connect to local backend if developing locally, otherwise connect to production
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const BACKEND_URL = isLocal ? 'http://localhost:3000' : 'https://api.baghchal.xyz';

    socket = io(BACKEND_URL);

    socket.on('connected', (data) => {
        const session = JSON.parse(sessionStorage.getItem('baghchalSession') || 'null');
        if (session && session.roomId && session.playerId) {
            playerId = session.playerId;
            socket.emit('rejoin-room', { roomId: session.roomId, playerId: session.playerId }, (res) => {
                if (res && res.error) {
                    sessionStorage.removeItem('baghchalSession');
                    playerId = data.playerId;
                }
            });
        } else {
            playerId = data.playerId;
        }
        console.log('Connected to server with ID:', playerId);
    });

    socket.on('room-created', (data) => {
        state.isMultiplayer = true;
        state.roomId = data.roomId;
        sessionStorage.setItem('baghchalSession', JSON.stringify({ roomId: data.roomId, playerId: playerId }));
        // Role is set locally when creating based on preference
        document.getElementById('roomCodeDisplay').style.display = 'flex';
        const codeText = document.getElementById('roomCodeText');
        if (codeText) {
            codeText.textContent = `Room: ${data.roomId}`;
            const btnCopy = document.getElementById('btnCopyRoomCode');
            if (btnCopy) {
                const newBtn = btnCopy.cloneNode(true);
                btnCopy.parentNode.replaceChild(newBtn, btnCopy);
                newBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(data.roomId).then(() => {
                        const originalText = codeText.textContent;
                        codeText.textContent = "Copied!";
                        setTimeout(() => codeText.textContent = originalText, 2000);
                    });
                });
            }
        } else {
            document.getElementById('roomCodeDisplay').textContent = `Room: ${data.roomId}`;
        }

        const waitingOverlay = document.getElementById('waitingOverlay');
        if (waitingOverlay) waitingOverlay.classList.add('show');

        showSystemBanner(`Created room ${data.roomId}. Waiting for opponent...`);
        updateUI();
    });

    socket.on('room-joined', (data) => {
        state.isMultiplayer = true;
        state.roomId = data.roomId;
        sessionStorage.setItem('baghchalSession', JSON.stringify({ roomId: data.roomId, playerId: playerId }));
        state.players = data.players;
        const myPlayer = data.players.find(p => p.id === playerId);
        if (myPlayer) state.localRole = myPlayer.side;

        document.getElementById('roomCodeDisplay').style.display = 'flex';
        const codeText = document.getElementById('roomCodeText');
        if (codeText) {
            codeText.textContent = `Room: ${data.roomId}`;
            const btnCopy = document.getElementById('btnCopyRoomCode');
            if (btnCopy) {
                const newBtn = btnCopy.cloneNode(true);
                btnCopy.parentNode.replaceChild(newBtn, btnCopy);
                newBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(data.roomId).then(() => {
                        const originalText = codeText.textContent;
                        codeText.textContent = "Copied!";
                        setTimeout(() => codeText.textContent = originalText, 2000);
                    });
                });
            }
        } else {
            document.getElementById('roomCodeDisplay').textContent = `Room: ${data.roomId}`;
        }

        const waitingOverlay = document.getElementById('waitingOverlay');
        if (waitingOverlay) waitingOverlay.classList.remove('show');

        hideSystemBanner();

        showSystemBanner(`Joined room ${data.roomId}.`);

        syncStateFromServer(data.state);
        renderMoveHistory(state.moveHistory);
        updateUI();
        render(canvasCtx);
    });

    socket.on('game-start', (data) => {
        resetReplay();
        state.players = data.players;
        const myPlayer = data.players.find(p => p.id === playerId);
        if (myPlayer) state.localRole = myPlayer.side;

        syncStateFromServer(data.state);
        renderMoveHistory(state.moveHistory);

        const waitingOverlay = document.getElementById('waitingOverlay');
        if (waitingOverlay) waitingOverlay.classList.remove('show');

        hideSystemBanner();

        showSystemBanner('Opponent joined. Game started!');
        saveSnapshot(countTrappedTigers());
        updateUI();
        render(canvasCtx);
    });

    socket.on('state-update', (data) => {
        const move = data.move;
        const isEcho = state.lastMove && move &&
            (state.lastMove.from || null) === (move.from || null) &&
            state.lastMove.to === move.to &&
            state.turn === data.state.turn;

        if (isEcho) {
            // Silently sync state to ensure we are perfectly aligned
            syncStateFromServer(data.state);
            updateUI();
            render(canvasCtx);
            return;
        }

        const wasCaptured = data.state.bakhrasCaptured > state.bakhrasCaptured;
        const turnWhoMoved = state.turn;

        syncStateFromServer(data.state);

        if (move) {
            state.lastMove = move;
            const isTiger = turnWhoMoved === 'bagh';
            const label = isTiger ? 'Tiger' : 'Goat';

            if (!move.from) {
                addLog(`Goat placed at ${move.to.toUpperCase()}`, 'goat');
                playSound('bakhra');
            } else {
                if (wasCaptured) {
                    addLog(`Tiger ${move.from.toUpperCase()}→${move.to.toUpperCase()} captures a Goat!`, 'capture');
                    playSound('capture');
                } else {
                    addLog(`${label} ${move.from.toUpperCase()}→${move.to.toUpperCase()}`, isTiger ? 'tiger' : 'goat');
                    playSound(isTiger ? 'bagh' : 'bakhra');
                }
            }
        }

        saveSnapshot(countTrappedTigers());
        updateUI();
        render(canvasCtx);
    });

    socket.on('game-over', (data) => {
        syncStateFromServer(data.state);
        updateUI();
        render(canvasCtx);
    });

    socket.on('player-left', () => {
        showSystemBanner('Opponent disconnected.', true);
        showInfoModal('Opponent disconnected. The game has been converted to a local session.');
        state.isMultiplayer = false;
        state.roomId = null;
        sessionStorage.removeItem('baghchalSession');
        updateUI();
    });

    socket.on('player-disconnected', (data) => {
        showSystemBanner(`Opponent disconnected.<br>Game will close soon if they don't reconnect.`, true);
    });

    socket.on('room-destroyed-info', (data) => {
        sessionStorage.removeItem('baghchalSession');
        hideSystemBanner();
        showInfoModal(data.message + " You are now in local play mode.");
        state.isMultiplayer = false;
        state.roomId = null;
        updateUI();
    });

    socket.on('rematch-started', (data) => {
        resetState();
        resetReplay();
        state.players = data.players;
        const myPlayer = data.players.find(p => p.id === playerId);
        if (myPlayer) state.localRole = myPlayer.side;

        syncStateFromServer(data.state);
        renderMoveHistory(state.moveHistory);
        showSystemBanner('Rematch started. Roles swapped.');
        saveSnapshot(countTrappedTigers());
        document.getElementById("gameOverOverlay").classList.remove("show");

        const btnPlayAgain = document.getElementById("btnPlayAgain");
        if (btnPlayAgain) {
            btnPlayAgain.disabled = false;
            btnPlayAgain.textContent = "Play Again";
        }

        updateUI();
        render(canvasCtx);
    });

    socket.on('room-destroyed', () => {
        sessionStorage.removeItem('baghchalSession');
        hideSystemBanner();
        showInfoModal('Room destroyed. You are now in local play mode.');
        state.isMultiplayer = false;
        state.roomId = null;
        updateUI();
    });

    socket.on('invalid-move', (data) => {
        console.warn('Invalid move:', data.message);
        showErrorModal(`Invalid move: ${data.message}`);

        // Rollback state if server provided the valid state
        if (data.state) {
            syncStateFromServer(data.state);
            updateUI();
            render(canvasCtx);
        }
    });

    socket.on('error', (data) => {
        console.error('Server error:', data.message);
        showErrorModal(`Error: ${data.message}`);
    });
}

export function createRoom(name, preferredSide) {
    if (!socket) return;
    state.localRole = preferredSide;
    socket.emit('create-room', { name, preferredSide }, (res) => {
        if (res.error) showErrorModal(res.error);
    });
}

export function joinRoom(roomId, name) {
    if (!socket) return;
    socket.emit('join-room', { roomId, name }, (res) => {
        if (res.error) showErrorModal(res.error);
    });
}

export function makeNetworkMove(from, to) {
    if (!socket || !state.isMultiplayer) return false;
    socket.emit('make-move', { from, to });
    return true;
}

export function playAgain() {
    if (!socket || !state.isMultiplayer) return;
    socket.emit('play-again');
}

export function cancelGame() {
    if (!socket || !state.isMultiplayer) return;
    sessionStorage.removeItem('baghchalSession');
    socket.emit('cancel-game');
}
