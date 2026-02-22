// Event listeners - Setup after DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Welcome screen
    document.getElementById('player-count').addEventListener('input', updatePlayerNameInputs);
    document.getElementById('start-game-btn').addEventListener('click', startNewGame);
    
    // Game controls
    document.getElementById('pause-btn').addEventListener('click', pauseGame);
    document.getElementById('resume-btn').addEventListener('click', resumeGame);
    document.getElementById('quit-to-menu-btn').addEventListener('click', backToMenu);
    document.getElementById('restart-btn').addEventListener('click', showRestartConfirmation);
    document.getElementById('confirm-restart-btn').addEventListener('click', confirmRestart);
    document.getElementById('cancel-restart-btn').addEventListener('click', cancelRestart);
    
    // Main menu navigation
    document.getElementById('local-game-btn').addEventListener('click', () => {
        isOnlineGame = false;
        showScreen('welcome-screen');
        document.getElementById('local-player-count-group').classList.remove('hidden');
    });
    
    document.getElementById('host-game-btn').addEventListener('click', setupHostGame);
    document.getElementById('join-game-btn').addEventListener('click', () => {
        showScreen('join-game-screen');
    });
    
    document.getElementById('main-menu-home-btn').addEventListener('click', () => {
        window.location.href = '../index.html';
    });
    
    document.getElementById('back-to-main-menu-btn').addEventListener('click', () => {
        showScreen('main-menu-screen');
    });
    
    document.getElementById('back-to-main-from-join-btn').addEventListener('click', () => {
        showScreen('main-menu-screen');
    });
    
    // Join game functionality
    document.getElementById('join-room-btn').addEventListener('click', joinGame);
    document.getElementById('room-code-input').addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
    
    // Lobby functionality
    document.getElementById('leave-lobby-btn').addEventListener('click', leaveLobby);
    document.getElementById('start-online-game-btn').addEventListener('click', startOnlineGame);
    document.getElementById('copy-code-btn').addEventListener('click', copyRoomCode);
    
    // Lobby settings sync
    document.getElementById('lobby-difficulty').addEventListener('change', (e) => {
        if (isHost) {
            broadcastToAllPlayers({
                type: 'settings-update',
                difficulty: e.target.value,
                turnTime: parseInt(document.getElementById('lobby-turn-time').value)
            });
        }
    });
    
    document.getElementById('lobby-turn-time').addEventListener('change', (e) => {
        if (isHost) {
            broadcastToAllPlayers({
                type: 'settings-update',
                difficulty: document.getElementById('lobby-difficulty').value,
                turnTime: parseInt(e.target.value)
            });
        }
    });
    
    // Play again and back to menu
    document.getElementById('play-again-btn').addEventListener('click', () => {
        if (isOnlineGame) {
            if (isHost) {
                // Host restarts the game and broadcasts to all clients
                broadcastToAllPlayers({ type: 'restart-game' });
                initOnlineGame();
            }
        } else {
            // Local game - just restart
            initGame();
        }
    });
    
    document.getElementById('back-to-menu-btn').addEventListener('click', () => {
        if (isOnlineGame) {
            if (isHost) {
                broadcastToAllPlayers({ type: 'host-left' });
                connections.forEach(conn => conn.close());
            } else {
                if (hostConnection) {
                    hostConnection.send({ type: 'player-left', playerId: localPlayerId });
                    hostConnection.close();
                }
            }
            returnToMainMenu();
        } else {
            backToMenu();
        }
    });
    
    document.getElementById('back-to-menu-modal-btn').addEventListener('click', () => {
        if (isOnlineGame) {
            if (isHost) {
                broadcastToAllPlayers({ type: 'host-left' });
                connections.forEach(conn => conn.close());
            } else {
                if (hostConnection) {
                    hostConnection.send({ type: 'player-left', playerId: localPlayerId });
                    hostConnection.close();
                }
            }
            returnToMainMenu();
        } else {
            backToMenu();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !document.getElementById('game-screen').classList.contains('hidden')) {
            if (!isPaused && document.getElementById('pause-modal').classList.contains('hidden') && 
                document.getElementById('restart-modal').classList.contains('hidden') &&
                document.getElementById('victory-modal').classList.contains('hidden')) {
                pauseGame();
            } else if (isPaused && !document.getElementById('pause-modal').classList.contains('hidden')) {
                resumeGame();
            }
        }
    });
});
