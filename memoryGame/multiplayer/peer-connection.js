// Generate room code
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Setup host game
function setupHostGame() {
    isOnlineGame = true;
    isHost = true;
    roomCode = generateRoomCode();
    localPlayerId = 'host-' + Date.now();
    
    // Initialize PeerJS
    peer = new Peer(roomCode, {
        config: {
            'iceServers': [
                { url: 'stun:stun.l.google.com:19302' },
                { url: 'stun:stun1.l.google.com:19302' }
            ]
        }
    });
    
    peer.on('open', (id) => {
        console.log('Peer connection opened with ID:', id);
        showLobby();
        
        // Initialize host player with placeholder name
        gameConfig.players = [{
            id: localPlayerId,
            name: 'Host',
            score: 0,
            isHost: true
        }];
        updateLobbyPlayersList();
    });
    
    peer.on('connection', (conn) => {
        console.log('New player connecting:', conn.peer);
        setupConnection(conn);
    });
    
    peer.on('error', (err) => {
        console.error('Peer error:', err);
        showJoinStatus('Failed to create room. Please try again.', 'error');
    });
}

// Setup connection handlers
function setupConnection(conn) {
    connections.push(conn);
    
    conn.on('open', () => {
        console.log('Connection opened with:', conn.peer);
    });
    
    conn.on('data', (data) => {
        handleIncomingMessage(data, conn);
    });
    
    conn.on('close', () => {
        console.log('Connection closed:', conn.peer);
        removePlayer(conn.peer);
    });
    
    conn.on('error', (err) => {
        console.error('Connection error:', err);
    });
}

// Join game
function joinGame() {
    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    const playerName = document.getElementById('player-name-join').value.trim() || 'Player';
    
    if (code.length !== 6) {
        showJoinStatus('Please enter a valid 6-digit room code', 'error');
        return;
    }
    
    isOnlineGame = true;
    isHost = false;
    localPlayerId = 'player-' + Date.now();
    
    showJoinStatus('Connecting...', 'info');
    
    // Initialize PeerJS with random ID
    peer = new Peer();
    
    peer.on('open', (id) => {
        console.log('Peer initialized with ID:', id);
        
        // Connect to host
        hostConnection = peer.connect(code);
        
        hostConnection.on('open', () => {
            console.log('Connected to host');
            showJoinStatus('Connected! Joining lobby...', 'success');
            
            // Send join request
            hostConnection.send({
                type: 'join-request',
                playerId: localPlayerId,
                playerName: playerName
            });
        });
        
        hostConnection.on('data', (data) => {
            handleIncomingMessage(data, hostConnection);
        });
        
        hostConnection.on('close', () => {
            console.log('Disconnected from host');
            if (!document.getElementById('game-screen').classList.contains('hidden')) {
                alert('Connection to host lost. Returning to main menu.');
                returnToMainMenu();
            }
        });
        
        hostConnection.on('error', (err) => {
            console.error('Connection error:', err);
            showJoinStatus('Failed to connect. Please check the room code.', 'error');
        });
    });
    
    peer.on('error', (err) => {
        console.error('Peer error:', err);
        showJoinStatus('Failed to join room. Please try again.', 'error');
    });
}

// Show lobby
function showLobby() {
    showScreen('lobby-screen');
    document.getElementById('room-code-display').textContent = roomCode;
    updateLobbyPlayersList();
    
    const startBtn = document.getElementById('start-online-game-btn');
    const difficultySelect = document.getElementById('lobby-difficulty');
    const turnTimeInput = document.getElementById('lobby-turn-time');
    const hostNameSection = document.getElementById('host-name-section');
    const hostNameInput = document.getElementById('player-name-host');
    
    if (isHost) {
        startBtn.style.display = 'block';
        startBtn.disabled = false;
        difficultySelect.disabled = false;
        turnTimeInput.disabled = false;
        hostNameSection.style.display = 'block';
        
        // Add event listener for host name changes
        hostNameInput.addEventListener('input', (e) => {
            const newName = e.target.value.trim() || 'Host';
            const hostPlayer = gameConfig.players.find(p => p.isHost);
            if (hostPlayer) {
                hostPlayer.name = newName;
                updateLobbyPlayersList();
                
                // Broadcast updated lobby state to all players
                broadcastToAllPlayers({
                    type: 'lobby-state',
                    players: gameConfig.players.map(p => ({ id: p.id, name: p.name, score: p.score, isHost: p.isHost })),
                    difficulty: document.getElementById('lobby-difficulty').value,
                    turnTime: parseInt(document.getElementById('lobby-turn-time').value),
                    roomCode: roomCode
                });
            }
        });
    } else {
        startBtn.style.display = 'none';
        difficultySelect.disabled = true;
        turnTimeInput.disabled = true;
        hostNameSection.style.display = 'none';
    }
}

// Update lobby players list
function updateLobbyPlayersList() {
    const list = document.getElementById('lobby-players-list');
    const count = document.getElementById('player-count-display');
    
    list.innerHTML = '';
    count.textContent = gameConfig.players.length;
    
    gameConfig.players.forEach(player => {
        const item = document.createElement('div');
        item.className = 'lobby-player-item';
        item.innerHTML = `
            <span class="lobby-player-name">${player.name}</span>
            ${player.isHost ? '<span class="lobby-player-badge">HOST</span>' : ''}
        `;
        list.appendChild(item);
    });
}

// Copy room code
function copyRoomCode() {
    const code = document.getElementById('room-code-display').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('copy-code-btn');
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

// Leave lobby
function leaveLobby() {
    if (isHost) {
        // Host is leaving, notify all players
        broadcastToAllPlayers({ type: 'host-left' });
        connections.forEach(conn => conn.close());
    } else {
        // Player is leaving
        if (hostConnection) {
            hostConnection.send({
                type: 'player-left',
                playerId: localPlayerId
            });
            hostConnection.close();
        }
    }
    
    cleanupMultiplayer();
    returnToMainMenu();
}

// Remove player
function removePlayer(playerId) {
    gameConfig.players = gameConfig.players.filter(p => p.id !== playerId);
    connections = connections.filter(c => c.peer !== playerId);
    updateLobbyPlayersList();
}

// Broadcast to all players
function broadcastToAllPlayers(data, excludeConn = null) {
    connections.forEach(conn => {
        if (conn !== excludeConn && conn.open) {
            conn.send(data);
        }
    });
}

// Show join status
function showJoinStatus(message, type) {
    const statusEl = document.getElementById('join-status');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.classList.remove('hidden');
}

// Show lobby status
function showLobbyStatus(message, type) {
    const statusEl = document.getElementById('lobby-status');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
}

// Cleanup multiplayer
function cleanupMultiplayer() {
    if (peer) {
        peer.destroy();
        peer = null;
    }
    connections = [];
    hostConnection = null;
    isHost = false;
    isOnlineGame = false;
    roomCode = null;
    localPlayerId = null;
}

// Return to main menu
function returnToMainMenu() {
    cleanupMultiplayer();
    
    // Clear timers
    if (turnTimerInterval) {
        clearInterval(turnTimerInterval);
        turnTimerInterval = null;
    }
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // Reset game state
    matchedPairs = 0;
    flippedCards = [];
    currentPlayerIndex = 0;
    canFlip = true;
    isFirstTurn = true;
    isPaused = false;
    gameConfig.players = [];
    
    document.getElementById('game-board').innerHTML = '';
    showScreen('main-menu-screen');
}
