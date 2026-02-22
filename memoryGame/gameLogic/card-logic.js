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
        }, 1500);
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
