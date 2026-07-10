import { state, syncStateFromServer, resetState } from './state.js';
import { updateUI, addLog, showErrorModal } from './ui.js';
import { render } from './render.js';
import { countTrappedTigers } from './logic.js';
import { saveSnapshot, resetReplay } from './replay.js';
import { io } from 'socket.io-client';

let socket = null;
let playerId = null;

export function initNetwork(canvasCtx) {

    // Connect to local backend if developing locally, otherwise connect to production
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const BACKEND_URL = isLocal ? 'http://localhost:3000' : 'https://api.baghchal.xyz';

    socket = io(BACKEND_URL);

    socket.on('connected', (data) => {
        playerId = data.playerId;
        console.log('Connected to server with ID:', playerId);
    });

    socket.on('room-created', (data) => {
        state.isMultiplayer = true;
        state.roomId = data.roomId;
        // Role is set locally when creating based on preference
        document.getElementById('roomCodeDisplay').style.display = 'flex';
        document.getElementById('roomCodeDisplay').textContent = `Room: ${data.roomId}`;
        addLog(`Created room ${data.roomId}. Waiting for opponent...`, 'system');
        updateUI();
    });

    socket.on('room-joined', (data) => {
        state.isMultiplayer = true;
        state.roomId = data.roomId;
        state.players = data.players;
        const myPlayer = data.players.find(p => p.id === playerId);
        if (myPlayer) state.localRole = myPlayer.side;

        document.getElementById('roomCodeDisplay').style.display = 'flex';
        document.getElementById('roomCodeDisplay').textContent = `Room: ${data.roomId}`;
        addLog(`Joined room ${data.roomId}.`, 'system');

        syncStateFromServer(data.state);
        updateUI();
        render(canvasCtx);
    });

    socket.on('game-start', (data) => {
        resetReplay();
        state.players = data.players;
        const myPlayer = data.players.find(p => p.id === playerId);
        if (myPlayer) state.localRole = myPlayer.side;

        syncStateFromServer(data.state);
        addLog('Opponent joined. Game started!', 'system');
        saveSnapshot(countTrappedTigers());
        updateUI();
        render(canvasCtx);
    });

    socket.on('state-update', (data) => {
        import('./audio.js').then(({ playSound }) => {
            const wasCaptured = data.state.bakhrasCaptured > state.bakhrasCaptured;
            const turnWhoMoved = state.turn;

            syncStateFromServer(data.state);

            const move = data.move;
            if (move) {
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
    });

    socket.on('game-over', (data) => {
        syncStateFromServer(data.state);
        updateUI();
        render(canvasCtx);
    });

    socket.on('player-left', () => {
        addLog('Opponent disconnected.', 'system');
        showErrorModal('Opponent disconnected.', () => {
            location.reload();
        });
        state.gameOver = true;
        updateUI();
    });

    socket.on('rematch-started', (data) => {
        resetState();
        resetReplay();
        state.players = data.players;
        const myPlayer = data.players.find(p => p.id === playerId);
        if (myPlayer) state.localRole = myPlayer.side;

        syncStateFromServer(data.state);
        document.getElementById("moveLog").innerHTML = "";
        addLog('Rematch started. Roles swapped.', 'system');
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
        showErrorModal('Room destroyed.', () => {
            location.reload();
        });
    });

    socket.on('invalid-move', (data) => {
        console.warn('Invalid move:', data.message);
        showErrorModal(`Invalid move: ${data.message}`);
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
    socket.emit('cancel-game');
}
