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
