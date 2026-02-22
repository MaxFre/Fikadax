// Initialize game
function initGame() {
    targetWord = wordList[Math.floor(Math.random() * wordList.length)];
    currentRow = 0;
    currentTile = 0;
    gameOver = false;
    guesses = [];
    
    console.log('Target word:', targetWord); // For testing
    
    // Load streaks on first load
    if (typeof currentStreak === 'undefined' || currentStreak === null) {
        loadStreaks();
    }
    updateStreakDisplay();
    
    createBoard();
    createKeyboard();
    
    document.getElementById('game-over-modal').classList.add('hidden');
}

// Create game board
function createBoard() {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    
    for (let i = 0; i < maxGuesses; i++) {
        const row = document.createElement('div');
        row.className = 'tile-row';
        row.id = `row-${i}`;
        
        for (let j = 0; j < wordLength; j++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${i}-${j}`;
            row.appendChild(tile);
        }
        
        board.appendChild(row);
    }
}

// Create keyboard
function createKeyboard() {
    const keyboard = document.getElementById('keyboard');
    keyboard.innerHTML = '';
    
    const rows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
    ];
    
    rows.forEach(rowKeys => {
        const row = document.createElement('div');
        row.className = 'keyboard-row';
        
        rowKeys.forEach(key => {
            const button = document.createElement('button');
            button.className = 'key';
            button.textContent = key;
            button.id = `key-${key}`;
            
            if (key === 'ENTER' || key === '⌫') {
                button.classList.add('key-large');
            }
            
            button.addEventListener('click', () => handleKeyPress(key));
            row.appendChild(button);
        });
        
        keyboard.appendChild(row);
    });
}

// Handle key press
function handleKeyPress(key) {
    if (gameOver) return;
    
    if (key === 'ENTER') {
        submitGuess();
    } else if (key === '⌫') {
        deleteLetter();
    } else {
        addLetter(key);
    }
}

// Add letter to current tile
function addLetter(letter) {
    if (currentTile < wordLength) {
        const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
        tile.textContent = letter;
        tile.classList.add('filled');
        currentTile++;
    }
}

// Delete last letter
function deleteLetter() {
    if (currentTile > 0) {
        currentTile--;
        const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
        tile.textContent = '';
        tile.classList.remove('filled');
    }
}

// Submit guess
function submitGuess() {
    if (currentTile !== wordLength) {
        showMessage('Not enough letters');
        return;
    }
    
    // Get current guess
    let guess = '';
    for (let i = 0; i < wordLength; i++) {
        const tile = document.getElementById(`tile-${currentRow}-${i}`);
        guess += tile.textContent;
    }
    
    // Check if word is valid
    if (!validWords.includes(guess)) {
        showMessage('Not a valid word');
        shakeTiles(currentRow);
        return;
    }
    
    // Check guess against target
    checkGuess(guess);
    guesses.push(guess);
    
    // Check if won
    if (guess === targetWord) {
        gameOver = true;
        currentStreak++;
        if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
        }
        saveStreaks();
        updateStreakDisplay();
        setTimeout(() => {
            showGameOver(true);
        }, 2000);
        return;
    }
    
    // Move to next row
    currentRow++;
    currentTile = 0;
    
    // Check if lost
    if (currentRow >= maxGuesses) {
        gameOver = true;
        currentStreak = 0;
        saveStreaks();
        updateStreakDisplay();
        setTimeout(() => {
            showGameOver(false);
        }, 2000);
    }
}

// Check guess and update tiles
function checkGuess(guess) {
    const targetLetters = targetWord.split('');
    const guessLetters = guess.split('');
    const letterStatus = new Array(wordLength).fill('absent');
    
    // First pass: mark correct positions
    for (let i = 0; i < wordLength; i++) {
        if (guessLetters[i] === targetLetters[i]) {
            letterStatus[i] = 'correct';
            targetLetters[i] = null; // Mark as used
        }
    }
    
    // Second pass: mark present letters
    for (let i = 0; i < wordLength; i++) {
        if (letterStatus[i] === 'correct') continue;
        
        const index = targetLetters.indexOf(guessLetters[i]);
        if (index !== -1) {
            letterStatus[i] = 'present';
            targetLetters[index] = null; // Mark as used
        }
    }
    
    // Animate tiles
    for (let i = 0; i < wordLength; i++) {
        const tile = document.getElementById(`tile-${currentRow}-${i}`);
        const key = document.getElementById(`key-${guessLetters[i]}`);
        
        setTimeout(() => {
            tile.classList.add('flip');
            setTimeout(() => {
                tile.classList.add(letterStatus[i]);
                
                // Update keyboard
                if (!key.classList.contains('correct')) {
                    if (letterStatus[i] === 'correct' || 
                        (letterStatus[i] === 'present' && !key.classList.contains('correct'))) {
                        key.classList.remove('absent', 'present');
                        key.classList.add(letterStatus[i]);
                    } else if (letterStatus[i] === 'absent' && !key.classList.contains('present')) {
                        key.classList.add('absent');
                    }
                }
            }, 250);
        }, i * 300);
    }
}

// Show message
function showMessage(message) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.classList.add('show');
    
    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 2000);
}

// Shake tiles
function shakeTiles(row) {
    const rowEl = document.getElementById(`row-${row}`);
    rowEl.classList.add('shake');
    
    setTimeout(() => {
        rowEl.classList.remove('shake');
    }, 500);
}

// Show game over modal
function showGameOver(won) {
    const modal = document.getElementById('game-over-modal');
    const title = document.getElementById('game-over-title');
    const message = document.getElementById('game-over-message');
    
    if (won) {
        title.textContent = '🎉 Congratulations! 🎉';
        let messageText = `You guessed the word in ${currentRow + 1} ${currentRow + 1 === 1 ? 'try' : 'tries'}!`;
        if (currentStreak > 1) {
            messageText += `\n🔥 ${currentStreak} in a row!`;
        }
        if (currentStreak === bestStreak && bestStreak > 1) {
            messageText += ' (New Record!)';
        }
        message.textContent = messageText;
    } else {
        title.textContent = '😞 Game Over';
        message.textContent = `The word was: ${targetWord}\n💔 Streak reset to 0`;
    }
    
    modal.classList.remove('hidden');
}

// Keyboard event listener
document.addEventListener('keydown', (e) => {
    if (gameOver) return;
    
    const key = e.key.toUpperCase();
    
    if (key === 'ENTER') {
        submitGuess();
    } else if (key === 'BACKSPACE') {
        deleteLetter();
    } else if (key.length === 1 && key >= 'A' && key <= 'Z') {
        addLetter(key);
    }
});

// Event listeners
document.getElementById('new-game-btn').addEventListener('click', initGame);
document.getElementById('modal-new-game-btn').addEventListener('click', initGame);
document.getElementById('back-to-home-btn').addEventListener('click', () => {
    window.location.href = '../index.html';
});

// Initialize game on load
window.addEventListener('load', initGame);
