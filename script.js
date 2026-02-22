// Game state
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let timerInterval = null;
let turnTimerInterval = null;
let isPaused = false;

// Game configuration
let gameConfig = {
    playerCount: 1,
    turnTimeLimit: 30,
    players: [],
    difficulty: 'medium'
};

// Multiplayer state
let currentPlayerIndex = 0;
let turnTimeRemaining = 0;
let canFlip = true;
let isFirstTurn = true;
let cardsInitiallyRendered = false;

// Online multiplayer state
let peer = null;
let connections = [];
let isHost = false;
let isOnlineGame = false;
let roomCode = null;
let localPlayerId = null;
let hostConnection = null;

// Difficulty settings
const difficultySettings = {
    easy: { pairs: 6, cols: 4, symbols: ['🎮', '🎨', '🎭', '🎪', '🎯', '🎲'] },
    medium: { pairs: 8, cols: 6, symbols: ['🎮', '🎨', '🎭', '🎪', '🎯', '🎲', '🎸', '🎹'] },
    hard: { pairs: 12, cols: 8, symbols: ['🎮', '🎨', '🎭', '🎪', '🎯', '🎲', '🎸', '🎹', '🎺', '🎻', '🎬', '🎤'] }
};

// Card symbols (will be set based on difficulty)
let symbols = difficultySettings.medium.symbols;

// Welcome screen functionality
function updatePlayerNameInputs() {
    const count = parseInt(document.getElementById('player-count').value);
    const namesSection = document.getElementById('player-names-section');
    const namesInputs = document.getElementById('player-names-inputs');
    
    if (count > 1) {
        namesSection.classList.remove('hidden');
        namesInputs.innerHTML = '';
        
        for (let i = 1; i <= count; i++) {
            const inputDiv = document.createElement('div');
            inputDiv.className = 'player-name-input';
            inputDiv.innerHTML = `
                <label>Player ${i} Name:</label>
                <input type="text" class="player-name" placeholder="Player ${i}" value="Player ${i}">
            `;
            namesInputs.appendChild(inputDiv);
        }
    } else {
        namesSection.classList.add('hidden');
    }
}

document.getElementById('player-count').addEventListener('input', updatePlayerNameInputs);

document.getElementById('start-game-btn').addEventListener('click', startNewGame);

function startNewGame() {
    // Get configuration
    gameConfig.playerCount = parseInt(document.getElementById('player-count').value);
    gameConfig.turnTimeLimit = parseInt(document.getElementById('turn-time').value);
    gameConfig.difficulty = document.getElementById('difficulty').value;
    
    // Update symbols based on difficulty
    symbols = difficultySettings[gameConfig.difficulty].symbols;
    
    // Get player names
    gameConfig.players = [];
    if (gameConfig.playerCount > 1) {
        const nameInputs = document.querySelectorAll('.player-name');
        
        // Validate that we have the correct number of inputs
        if (nameInputs.length === 0) {
            // Regenerate inputs if they don't exist
            updatePlayerNameInputs();
            // Try to get them again
            const newNameInputs = document.querySelectorAll('.player-name');
            newNameInputs.forEach((input, index) => {
                if (input && input.value !== undefined) {
                    gameConfig.players.push({
                        name: input.value.trim() || `Player ${index + 1}`,
                        score: 0
                    });
                }
            });
        } else {
            nameInputs.forEach((input, index) => {
                if (input && input.value !== undefined) {
                    gameConfig.players.push({
                        name: input.value.trim() || `Player ${index + 1}`,
                        score: 0
                    });
                }
            });
        }
        
        // If no players were added, create default players
        if (gameConfig.players.length === 0) {
            for (let i = 1; i <= gameConfig.playerCount; i++) {
                gameConfig.players.push({
                    name: `Player ${i}`,
                    score: 0
                });
            }
        }
    } else {
        gameConfig.players = [{ name: 'Player 1', score: 0 }];
    }
    
    // Switch to game screen
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    
    // Initialize game
    initGame();
}

// Initialize game
function initGame() {
    // Reset game state
    matchedPairs = 0;
    flippedCards = [];
    currentPlayerIndex = 0;
    canFlip = true;
    isFirstTurn = true;
    isPaused = false;
    cardsInitiallyRendered = false;
    
    // Reset player scores
    gameConfig.players.forEach(player => player.score = 0);
    
    // Clear timers
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (turnTimerInterval) {
        clearInterval(turnTimerInterval);
        turnTimerInterval = null;
    }
    
    // Create card pairs and shuffle
    cards = [...symbols, ...symbols]
        .sort(() => Math.random() - 0.5)
        .map((symbol, index) => ({
            id: index,
            symbol: symbol,
            matched: false
        }));
    
    // Render UI
    renderCards();
    renderPlayerScores();
    updateCurrentPlayer();
    
    // Hide modal
    document.getElementById('victory-modal').classList.add('hidden');
    document.getElementById('pause-modal').classList.add('hidden');
    document.getElementById('restart-modal').classList.add('hidden');
    
    // Show pause and restart buttons in local games
    document.getElementById('pause-btn').style.display = 'inline-block';
    document.getElementById('restart-btn').style.display = 'inline-block';
    
    // Start turn timer
    startTurnTimer();
}

// Render cards to the board
function renderCards() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    gameBoard.setAttribute('role', 'grid');
    gameBoard.setAttribute('aria-label', 'Memory card game board');
    
    // Set grid columns based on difficulty
    const cols = difficultySettings[gameConfig.difficulty].cols;
    gameBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    
    cards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.id = card.id;
        cardElement.setAttribute('role', 'button');
        cardElement.setAttribute('aria-label', `Memory card ${index + 1}`);
        cardElement.setAttribute('aria-pressed', 'false');
        cardElement.setAttribute('tabindex', '0');
        
        // Add matched class if card is matched
        if (card.matched) {
            cardElement.classList.add('matched');
            cardElement.setAttribute('aria-label', 'Matched card');
            // Prevent matched cards from animating back in
            cardElement.style.animation = 'none';
            cardElement.style.opacity = '0';
            cardElement.style.visibility = 'hidden';
        } else {
            // Add staggered animation delay only on initial render
            if (!cardsInitiallyRendered) {
                cardElement.style.animationDelay = `${index * 0.03}s`;
            } else {
                // Skip animation for subsequent renders
                cardElement.style.animation = 'none';
            }
        }
        
        cardElement.innerHTML = `
            <div class="card-front"><span class="card-front-text">Fikadax</span></div>
            <div class="card-back">${card.symbol}</div>
        `;
        
        cardElement.addEventListener('click', () => handleCardClick(card.id));
        cardElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardClick(card.id);
            }
        });
        gameBoard.appendChild(cardElement);
    });
    
    // Mark cards as initially rendered after first render
    cardsInitiallyRendered = true;
}

// Render player scores
function renderPlayerScores() {
    const scoresContainer = document.getElementById('players-scores');
    
    // In solo play, just update the score value without rebuilding DOM
    if (gameConfig.players.length === 1) {
        const existingCard = document.getElementById('player-card-0');
        if (existingCard) {
            const scoreElement = existingCard.querySelector('.player-score');
            if (scoreElement) {
                scoreElement.textContent = gameConfig.players[0].score;
                return;
            }
        }
    }
    
    // For multiplayer or initial render, rebuild the entire scores section
    scoresContainer.innerHTML = '';
    
    gameConfig.players.forEach((player, index) => {
        const scoreCard = document.createElement('div');
        scoreCard.className = 'player-score-card';
        scoreCard.id = `player-card-${index}`;
        scoreCard.innerHTML = `
            <div class="player-name">${player.name}</div>
            <div class="player-score">${player.score}</div>
        `;
        scoresContainer.appendChild(scoreCard);
    });
}

// Update current player display
function updateCurrentPlayer() {
    const currentPlayer = gameConfig.players[currentPlayerIndex];
    document.getElementById('current-player-name').textContent = currentPlayer.name;
    
    // Update active player card
    document.querySelectorAll('.player-score-card').forEach((card, index) => {
        if (index === currentPlayerIndex) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
    
    // Show toast notification for turn change (except first turn) and only in multiplayer
    if (!isFirstTurn && gameConfig.players.length > 1) {
        showToast(`${currentPlayer.name}'s Turn!`);
    }
    isFirstTurn = false;
}

// Show toast notification
function showToast(message, lockBoard = true) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    toast.classList.remove('show');
    
    // Lock board while toast is showing (optional)
    if (lockBoard) {
        canFlip = false;
    }
    
    // Trigger reflow to restart animation
    void toast.offsetWidth;
    
    toast.classList.add('show');
    
    // Remove class after animation completes and unlock board
    setTimeout(() => {
        toast.classList.remove('show');
        
        // Restore canFlip based on game mode (only if we locked it)
        if (lockBoard) {
            if (isOnlineGame) {
                // In online games, only allow flipping if it's your turn
                const currentPlayer = gameConfig.players[currentPlayerIndex];
                canFlip = (currentPlayer.id === localPlayerId);
            } else {
                // In local games, always enable after toast
                canFlip = true;
            }
        }
    }, 2000);
}

// Start turn timer
function startTurnTimer() {
    turnTimeRemaining = gameConfig.turnTimeLimit;
    updateTurnTimer();
    
    if (turnTimerInterval) {
        clearInterval(turnTimerInterval);
    }
    
    // In online games, only the host runs the actual timer
    if (isOnlineGame && !isHost) {
        // Clients don't run their own timer - they rely on host broadcasts
        return;
    }
    
    turnTimerInterval = setInterval(() => {
        if (!isPaused) {
            turnTimeRemaining--;
            updateTurnTimer();
            
            // Broadcast timer update in online games (host only)
            if (isOnlineGame && isHost) {
                broadcastToAllPlayers({
                    type: 'timer-update',
                    timeRemaining: turnTimeRemaining
                });
            }
            
            if (turnTimeRemaining <= 0) {
                // Time's up, switch player (host only in online games)
                endTurn(false);
            }
        }
    }, 1000);
}

// Update turn timer display
function updateTurnTimer() {
    const timerElement = document.getElementById('turn-timer');
    const progressFill = document.getElementById('timer-progress-fill');
    
    timerElement.textContent = `${turnTimeRemaining}s`;
    
    // Update progress bar
    const percentage = (turnTimeRemaining / gameConfig.turnTimeLimit) * 100;
    progressFill.style.width = `${percentage}%`;
    
    if (turnTimeRemaining <= 5) {
        timerElement.classList.add('warning');
        progressFill.classList.add('warning');
    } else {
        timerElement.classList.remove('warning');
        progressFill.classList.remove('warning');
    }
}

// End current turn
function endTurn(foundMatch) {
    // In online games, only the host should manage turn changes
    if (isOnlineGame && !isHost) {
        // Client just notifies the host that their turn ended
        return;
    }
    
    canFlip = false;
    
    // Clear turn timer
    if (turnTimerInterval) {
        clearInterval(turnTimerInterval);
    }
    
    // If no match found, move to next player
    if (!foundMatch) {
        setTimeout(() => {
            currentPlayerIndex = (currentPlayerIndex + 1) % gameConfig.players.length;
            updateCurrentPlayer();
            canFlip = true;
            startTurnTimer();
            
            // Broadcast turn change in online game (host only)
            if (isOnlineGame && isHost) {
                broadcastGameState();
            }
        }, 500);
    } else {
        // Player gets another turn
        canFlip = true;
        startTurnTimer();
        
        // Broadcast state if online host
        if (isOnlineGame && isHost) {
            broadcastGameState();
        }
    }
}

// Handle card click
function handleCardClick(cardId) {
    // Check if player can flip cards
    if (!canFlip) {
        return;
    }
    
    // In online games, only allow flipping if it's your turn
    if (isOnlineGame) {
        const currentPlayer = gameConfig.players[currentPlayerIndex];
        if (currentPlayer.id !== localPlayerId) {
            return; // Not your turn
        }
    }
    
    const card = cards[cardId];
    const cardElement = document.querySelector(`[data-id="${cardId}"]`);
    
    // Ignore if card is already matched or flipped
    if (card.matched || flippedCards.includes(cardId) || flippedCards.length >= 2) {
        return;
    }
    
    // Flip card
    cardElement.classList.add('flipped');
    cardElement.setAttribute('aria-pressed', 'true');
    cardElement.setAttribute('aria-label', `Memory card ${parseInt(cardId) + 1}, revealed: ${card.symbol}`);
    flippedCards.push(cardId);
    
    // Broadcast card flip in online game
    if (isOnlineGame) {
        const message = {
            type: 'card-flip',
            cardId: cardId,
            playerId: localPlayerId
        };
        
        if (isHost) {
            broadcastToAllPlayers(message);
        } else {
            hostConnection.send(message);
        }
    }
    
    // Check for match when two cards are flipped
    if (flippedCards.length === 2) {
        checkMatch();
    }
}

// Check if flipped cards match
function checkMatch() {
    canFlip = false;
    
    const [firstId, secondId] = flippedCards;
    const firstCard = cards[firstId];
    const secondCard = cards[secondId];
    
    if (firstCard.symbol === secondCard.symbol) {
        // Match found
        firstCard.matched = true;
        secondCard.matched = true;
        matchedPairs++;
        
        // Award point to current player
        gameConfig.players[currentPlayerIndex].score++;
        
        // Update score display
        renderPlayerScores();
        updateCurrentPlayer();
        
        // Mark as matched visually
        setTimeout(() => {
            const firstCardEl = document.querySelector(`[data-id="${firstId}"]`);
            const secondCardEl = document.querySelector(`[data-id="${secondId}"]`);
            
            // Add matched class (keep flipped class for animation)
            firstCardEl.classList.add('matched');
            secondCardEl.classList.add('matched');
            firstCardEl.setAttribute('aria-label', 'Matched card');
            secondCardEl.setAttribute('aria-label', 'Matched card');
            
            flippedCards = [];
            
            // Sync game state in online game
            if (isOnlineGame) {
                if (isHost) {
                    broadcastGameState();
                } else {
                    // Non-host sends state to host, host will broadcast
                    hostConnection.send({
                        type: 'game-state-update',
                        cards: cards,
                        matchedPairs: matchedPairs,
                        currentPlayerIndex: currentPlayerIndex,
                        players: gameConfig.players.map(p => ({ id: p.id, name: p.name, score: p.score, isHost: p.isHost })),
                        shouldEndTurn: true,
                        foundMatch: true
                    });
                }
            }
            
            // Check if game is won
            if (matchedPairs === symbols.length) {
                setTimeout(showVictory, 800);
            } else {
                // Player found a match, gets another turn
                if (isOnlineGame && !isHost) {
                    // Client waits for host to broadcast updated state
                    // Don't set canFlip here - syncGameState will handle it
                } else {
                    endTurn(true);
                }
            }
        }, 500);
    } else {
        // No match - flip back and switch player
        setTimeout(() => {
            const firstCardEl = document.querySelector(`[data-id="${firstId}"]`);
            const secondCardEl = document.querySelector(`[data-id="${secondId}"]`);
            
            firstCardEl.classList.remove('flipped');
            secondCardEl.classList.remove('flipped');
            firstCardEl.setAttribute('aria-pressed', 'false');
            secondCardEl.setAttribute('aria-pressed', 'false');
            firstCardEl.setAttribute('aria-label', `Memory card ${parseInt(firstId) + 1}`);
            secondCardEl.setAttribute('aria-label', `Memory card ${parseInt(secondId) + 1}`);
            
            flippedCards = [];
            
            // Sync game state in online game
            if (isOnlineGame) {
                if (isHost) {
                    // Host handles turn change
                    endTurn(false);
                } else {
                    // Non-host sends state to host, host will manage turn change
                    hostConnection.send({
                        type: 'game-state-update',
                        cards: cards,
                        matchedPairs: matchedPairs,
                        currentPlayerIndex: currentPlayerIndex,
                        players: gameConfig.players.map(p => ({ id: p.id, name: p.name, score: p.score, isHost: p.isHost })),
                        shouldEndTurn: true,
                        foundMatch: false
                    });
                    canFlip = false;
                }
            } else {
                // Local game handles turn change
                endTurn(false);
            }
        }, 1000);
    }
}

// Broadcast game state (host only)
function broadcastGameState() {
    if (!isHost) return;
    
    broadcastToAllPlayers({
        type: 'game-state',
        cards: cards,
        matchedPairs: matchedPairs,
        currentPlayerIndex: currentPlayerIndex,
        players: gameConfig.players.map(p => ({ id: p.id, name: p.name, score: p.score, isHost: p.isHost })),
        turnTimeRemaining: turnTimeRemaining
    });
}

// Show victory modal
function showVictory() {
    // Stop turn timer
    if (turnTimerInterval) {
        clearInterval(turnTimerInterval);
    }
    
    // Find winner(s)
    const maxScore = Math.max(...gameConfig.players.map(p => p.score));
    const winners = gameConfig.players.filter(p => p.score === maxScore);
    
    // Display winner announcement
    const winnerAnnouncement = document.getElementById('winner-announcement');
    if (winners.length === 1) {
        winnerAnnouncement.innerHTML = `🏆 <strong>${winners[0].name}</strong> wins! 🏆`;
    } else {
        const winnerNames = winners.map(w => w.name).join(' and ');
        winnerAnnouncement.innerHTML = `🏆 It's a tie! <strong>${winnerNames}</strong> 🏆`;
    }
    
    // Display all player scores
    const finalStats = document.getElementById('final-stats');
    finalStats.innerHTML = '<h3>Final Scores:</h3>';
    
    gameConfig.players
        .sort((a, b) => b.score - a.score)
        .forEach(player => {
            const isWinner = player.score === maxScore;
            const className = isWinner ? 'winner-highlight' : '';
            finalStats.innerHTML += `
                <p class="${className}">
                    ${player.name}: <span>${player.score} ${player.score === 1 ? 'point' : 'points'}</span>
                </p>
            `;
        });
    
    // Only show play again button for host in online games
    const playAgainBtn = document.getElementById('play-again-btn');
    if (isOnlineGame && !isHost) {
        playAgainBtn.style.display = 'none';
    } else {
        playAgainBtn.style.display = 'inline-block';
    }
    
    document.getElementById('victory-modal').classList.remove('hidden');
}

// Back to menu
function backToMenu() {
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
    
    // Clear game board
    document.getElementById('game-board').innerHTML = '';
    
    // Regenerate player name inputs based on current player count
    updatePlayerNameInputs();
    
    // Switch screens
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('welcome-screen').classList.remove('hidden');
    document.getElementById('victory-modal').classList.add('hidden');
    document.getElementById('pause-modal').classList.add('hidden');
    document.getElementById('restart-modal').classList.add('hidden');
}

// Pause game
function pauseGame() {
    // Disable pause in online multiplayer
    if (isOnlineGame) {
        showToast('Pause not available in online games');
        return;
    }
    
    isPaused = true;
    canFlip = false;
    document.getElementById('pause-modal').classList.remove('hidden');
}

// Resume game
function resumeGame() {
    isPaused = false;
    canFlip = true;
    document.getElementById('pause-modal').classList.add('hidden');
}

// Show restart confirmation
function showRestartConfirmation() {
    // Disable restart in online multiplayer
    if (isOnlineGame) {
        showToast('Restart not available in online games');
        return;
    }
    
    isPaused = true;
    canFlip = false;
    document.getElementById('restart-modal').classList.remove('hidden');
}

// Cancel restart
function cancelRestart() {
    isPaused = false;
    canFlip = true;
    document.getElementById('restart-modal').classList.add('hidden');
}

// Confirm restart
function confirmRestart() {
    document.getElementById('restart-modal').classList.add('hidden');
    initGame();
}

// Event listeners
document.getElementById('pause-btn').addEventListener('click', pauseGame);
document.getElementById('resume-btn').addEventListener('click', resumeGame);
document.getElementById('quit-to-menu-btn').addEventListener('click', backToMenu);
document.getElementById('restart-btn').addEventListener('click', showRestartConfirmation);
document.getElementById('confirm-restart-btn').addEventListener('click', confirmRestart);
document.getElementById('cancel-restart-btn').addEventListener('click', cancelRestart);

// Main menu navigation
document.getElementById('host-game-btn').addEventListener('click', setupHostGame);

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
document.getElementById('back-to-menu-btn').addEventListener('click', backToMenu);
document.getElementById('back-to-menu-modal-btn').addEventListener('click', backToMenu);

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

// ============================
// MULTIPLAYER FUNCTIONALITY
// ============================

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

// Helper function to show screens
function showScreen(screenId) {
    const screens = ['main-menu-screen', 'welcome-screen', 'join-game-screen', 'lobby-screen', 'game-screen'];
    screens.forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

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

// Handle incoming messages
function handleIncomingMessage(data, conn) {
    console.log('Received message:', data.type);
    
    switch (data.type) {
        case 'join-request':
            if (isHost) {
                // Add player to lobby
                const newPlayer = {
                    id: data.playerId,
                    name: data.playerName,
                    score: 0,
                    isHost: false,
                    connection: conn
                };
                gameConfig.players.push(newPlayer);
                updateLobbyPlayersList();
                
                // Send lobby state to new player
                conn.send({
                    type: 'lobby-state',
                    players: gameConfig.players.map(p => ({ id: p.id, name: p.name, score: p.score, isHost: p.isHost })),
                    difficulty: document.getElementById('lobby-difficulty').value,
                    turnTime: parseInt(document.getElementById('lobby-turn-time').value),
                    roomCode: roomCode
                });
                
                // Notify all other players
                broadcastToAllPlayers({
                    type: 'player-joined',
                    player: { id: newPlayer.id, name: newPlayer.name, score: 0, isHost: false }
                }, conn);
            }
            break;
            
        case 'lobby-state':
            // Join lobby as client
            roomCode = data.roomCode;
            gameConfig.players = data.players;
            document.getElementById('lobby-difficulty').value = data.difficulty;
            document.getElementById('lobby-turn-time').value = data.turnTime;
            document.getElementById('lobby-difficulty').disabled = true;
            document.getElementById('lobby-turn-time').disabled = true;
            showLobby();
            break;
            
        case 'player-joined':
            gameConfig.players.push(data.player);
            updateLobbyPlayersList();
            break;
            
        case 'player-left':
            // Check if we're in an active game
            const isInGame = !document.getElementById('game-screen').classList.contains('hidden');
            
            if (isInGame) {
                // Find the player who left
                const leftPlayer = gameConfig.players.find(p => p.id === data.playerId);
                const playerName = leftPlayer ? leftPlayer.name : 'A player';
                
                // Show notification to remaining players (don't lock board)
                showToast(`${playerName} has disconnected`, false);
                
                // Remove player from game
                removePlayer(data.playerId);
                
                // Check if there are still players left
                if (gameConfig.players.length === 0) {
                    alert('All players have left. Returning to main menu.');
                    returnToMainMenu();
                    break;
                }
                
                // Check if their turn was active and adjust current player index
                if (currentPlayerIndex >= gameConfig.players.length) {
                    currentPlayerIndex = 0;
                }
                
                updateCurrentPlayer();
                
                if (isHost) {
                    // Host manages turn changes
                    if (turnTimerInterval) {
                        clearInterval(turnTimerInterval);
                    }
                    startTurnTimer();
                    broadcastGameState();
                }
                
                // Update player scores display
                renderPlayerScores();
            } else {
                // In lobby, just remove the player
                removePlayer(data.playerId);
            }
            break;
            
        case 'settings-update':
            document.getElementById('lobby-difficulty').value = data.difficulty;
            document.getElementById('lobby-turn-time').value = data.turnTime;
            break;
            
        case 'game-start':
            // Client receives game start
            gameConfig.difficulty = data.difficulty;
            gameConfig.turnTimeLimit = data.turnTime;
            gameConfig.players = data.players;
            symbols = difficultySettings[gameConfig.difficulty].symbols;
            cards = data.cards;
            startOnlineGameClient();
            break;
            
        case 'card-flip':
            // Handle card flip from other player
            if (isHost) {
                // Host relays to all other players
                broadcastToAllPlayers(data, conn);
            }
            handleRemoteCardFlip(data.cardId, data.playerId);
            break;
            
        case 'game-state':
            // Sync complete game state
            syncGameState(data);
            break;
            
        case 'game-state-update':
            // Host receives state update from player, processes turn logic, then broadcasts
            if (isHost) {
                // Update the game state
                cards = data.cards;
                matchedPairs = data.matchedPairs;
                gameConfig.players = data.players;
                flippedCards = [];
                
                // Update UI
                renderCards();
                renderPlayerScores();
                
                // Host manages turn changes
                if (data.shouldEndTurn) {
                    if (data.foundMatch) {
                        // Player gets another turn - reset timer for continued play
                        if (turnTimerInterval) {
                            clearInterval(turnTimerInterval);
                        }
                        startTurnTimer();
                        broadcastGameState();
                    } else {
                        // No match - advance to next player
                        setTimeout(() => {
                            currentPlayerIndex = (currentPlayerIndex + 1) % gameConfig.players.length;
                            updateCurrentPlayer();
                            canFlip = true;
                            
                            // Restart timer for new player
                            if (turnTimerInterval) {
                                clearInterval(turnTimerInterval);
                            }
                            startTurnTimer();
                            
                            broadcastGameState();
                        }, 500);
                    }
                } else {
                    // Just broadcast the updated state
                    broadcastGameState();
                }
                
                // Check if game is over
                if (matchedPairs === symbols.length) {
                    setTimeout(showVictory, 800);
                }
            }
            break;
            
        case 'timer-update':
            // Clients receive timer updates from host
            if (!isHost) {
                turnTimeRemaining = data.timeRemaining;
                updateTurnTimer();
            }
            break;
            
        case 'host-left':
            alert('Host has left the game. Returning to main menu.');
            returnToMainMenu();
            break;
            
        case 'restart-game':
            // Client receives restart command from host
            initOnlineGame();
            break;
    }
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

// Start online game (host)
function startOnlineGame() {
    if (gameConfig.players.length < 2) {
        showLobbyStatus('Need at least 2 players to start!', 'error');
        return;
    }
    
    // Get settings
    gameConfig.difficulty = document.getElementById('lobby-difficulty').value;
    gameConfig.turnTimeLimit = parseInt(document.getElementById('lobby-turn-time').value);
    symbols = difficultySettings[gameConfig.difficulty].symbols;
    
    // Generate card deck
    cards = [...symbols, ...symbols]
        .sort(() => Math.random() - 0.5)
        .map((symbol, index) => ({
            id: index,
            symbol: symbol,
            matched: false
        }));
    
    // Send game start to all players
    broadcastToAllPlayers({
        type: 'game-start',
        difficulty: gameConfig.difficulty,
        turnTime: gameConfig.turnTimeLimit,
        players: gameConfig.players.map(p => ({ id: p.id, name: p.name, score: 0, isHost: p.isHost })),
        cards: cards
    });
    
    // Start game locally
    showScreen('game-screen');
    initOnlineGame();
}

// Start online game (client)
function startOnlineGameClient() {
    showScreen('game-screen');
    initOnlineGame();
}

// Initialize online game
function initOnlineGame() {
    matchedPairs = 0;
    flippedCards = [];
    currentPlayerIndex = 0;
    isFirstTurn = true;
    isPaused = false;
    cardsInitiallyRendered = false;
    
    gameConfig.players.forEach(player => player.score = 0);
    
    if (timerInterval) clearInterval(timerInterval);
    if (turnTimerInterval) clearInterval(turnTimerInterval);
    
    renderCards();
    renderPlayerScores();
    updateCurrentPlayer();
    
    document.getElementById('victory-modal').classList.add('hidden');
    document.getElementById('pause-modal').classList.add('hidden');
    document.getElementById('restart-modal').classList.add('hidden');
    
    // Hide pause and restart buttons in online games
    document.getElementById('pause-btn').style.display = 'none';
    document.getElementById('restart-btn').style.display = 'none';
    
    // Set canFlip based on whether it's this player's turn
    const currentPlayer = gameConfig.players[currentPlayerIndex];
    canFlip = (currentPlayer.id === localPlayerId);
    
    // Only host starts the timer
    startTurnTimer();
}

// Handle remote card flip
function handleRemoteCardFlip(cardId, playerId) {
    // Check if card and element exist
    const card = cards[cardId];
    if (!card) return;
    
    const cardElement = document.querySelector(`[data-id="${cardId}"]`);
    if (!cardElement) return;
    
    // Only flip if not already flipped
    if (!cardElement.classList.contains('flipped') && !card.matched) {
        cardElement.classList.add('flipped');
        cardElement.setAttribute('aria-pressed', 'true');
        
        // Add to flipped cards if not already there
        if (!flippedCards.includes(cardId)) {
            flippedCards.push(cardId);
        }
    }
}

// Sync game state
function syncGameState(data) {
    cards = data.cards;
    matchedPairs = data.matchedPairs;
    currentPlayerIndex = data.currentPlayerIndex;
    gameConfig.players = data.players;
    flippedCards = []; // Clear flipped cards to avoid desync
    
    // Update timer if provided
    if (data.turnTimeRemaining !== undefined) {
        turnTimeRemaining = data.turnTimeRemaining;
    }
    
    // Update UI
    renderCards();
    renderPlayerScores();
    updateCurrentPlayer();
    
    // In online games, enable flipping only if it's your turn
    if (isOnlineGame) {
        const currentPlayer = gameConfig.players[currentPlayerIndex];
        canFlip = (currentPlayer.id === localPlayerId);
        
        // Only host manages the actual timer
        if (isHost) {
            if (turnTimerInterval) {
                clearInterval(turnTimerInterval);
            }
            startTurnTimer();
        } else {
            // Clients just display the time from the host's broadcast
            updateTurnTimer();
        }
    }
    
    // Check if game is over
    if (matchedPairs === symbols.length) {
        setTimeout(showVictory, 800);
    }
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

// Override back to menu to handle multiplayer
const originalBackToMenu = backToMenu;
backToMenu = function() {
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
        originalBackToMenu();
    }
};
