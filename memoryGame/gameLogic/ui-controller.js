// Helper function to show screens
function showScreen(screenId) {
    const screens = ['main-menu-screen', 'welcome-screen', 'join-game-screen', 'lobby-screen', 'game-screen'];
    screens.forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

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

// Start new game
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
