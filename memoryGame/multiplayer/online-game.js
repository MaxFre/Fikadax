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
