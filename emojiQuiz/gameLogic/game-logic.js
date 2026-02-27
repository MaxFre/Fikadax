// Current question data
let currentQuestionData = null;

// Multiplayer flag (set by mp-game.js)
let isMultiplayer = false;

// Stop timer
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Start timer
function startTimer() {
    stopTimer();
    timeRemaining = TOTAL_TIME;
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        updateHintDisplay();
        
        if (timeRemaining <= 0) {
            stopTimer();
            handleTimeUp();
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timer-display');
    timerDisplay.textContent = `⏱️ ${timeRemaining}`;
    
    // Add warning class when time is running low
    if (timeRemaining <= 5) {
        timerDisplay.classList.add('warning');
    } else {
        timerDisplay.classList.remove('warning');
    }
}

// Update hint display - reveal letters progressively from start to 5 seconds
function updateHintDisplay() {
    const hintDisplay = document.getElementById('hint-display');
    
    // Calculate time elapsed (0 at start, 15 at 5 seconds remaining, 20 at 0 seconds)
    const timeElapsed = TOTAL_TIME - timeRemaining;
    
    // Reveal 0% at start, 50% at 5 seconds remaining (15 seconds elapsed)
    // Cap at 50% after that
    const percentageToReveal = Math.min(0.5, (timeElapsed / 15) * 0.5);
    
    const answer = currentQuestionData.answer;
    
    // Pre-calculate all indices that will eventually be revealed (50% max)
    const maxLettersToReveal = Math.floor(answer.length * 0.5);
    const allPotentialIndices = [];
    
    // Evenly distribute indices across the word (skip spaces)
    for (let i = 0; i < maxLettersToReveal; i++) {
        const index = Math.floor((i * answer.length) / maxLettersToReveal);
        if (answer[index] !== ' ') {
            allPotentialIndices.push(index);
        }
    }
    
    // Determine how many to actually reveal right now
    const lettersToReveal = Math.floor(answer.length * percentageToReveal);
    const revealedIndices = new Set(allPotentialIndices.slice(0, lettersToReveal));
    
    // Create hint string
    let hintString = '';
    for (let i = 0; i < answer.length; i++) {
        if (answer[i] === ' ') {
            hintString += '  '; // Two spaces for visibility
        } else if (revealedIndices.has(i)) {
            hintString += answer[i];
        } else {
            hintString += '_';
        }
    }
    
    hintDisplay.textContent = hintString;
}

// Handle time up
function handleTimeUp() {
    if (isMultiplayer) {
        mp_onTimeUp();
        return;
    }

    const feedback = document.getElementById('feedback');
    const answerInput = document.getElementById('answer-input');
    
    feedback.textContent = '⏰ Time\'s up! Answer: ' + currentQuestionData.answer;
    feedback.className = 'feedback wrong';
    
    questionsAnswered++;
    correctStreak = 0;
    
    saveStats();
    updateStatsDisplay();
    
    showMessage('Time ran out!', 'error');
    
    // Disable input temporarily
    answerInput.disabled = true;
    document.getElementById('submit-btn').disabled = true;
    document.getElementById('skip-btn').disabled = true;
    
    // Load next question after delay
    setTimeout(() => {
        loadNewQuestion();
    }, 2500);
}

// Initialize game
function initGame() {
    loadStats();
    updateStatsDisplay();
    loadNewQuestion();
    
    // Enter key submits answer
    const input = document.getElementById('answer-input');
    input.onkeypress = (e) => { if (e.key === 'Enter') submitAnswer(); };
    input.focus();
}

// Load new question
function loadNewQuestion() {
    currentQuestionData = getRandomQuestion();
    
    const emojiDisplay = document.getElementById('emoji-display');
    const typeLabel = document.getElementById('type-label');
    const answerInput = document.getElementById('answer-input');
    const feedback = document.getElementById('feedback');
    const hintDisplay = document.getElementById('hint-display');
    
    emojiDisplay.textContent = currentQuestionData.emojis;
    typeLabel.textContent = currentQuestionData.type;
    answerInput.value = '';
    feedback.textContent = '';
    feedback.className = 'feedback';
    hintDisplay.textContent = '';
    
    // Re-enable input and buttons
    answerInput.disabled = false;
    document.getElementById('submit-btn').disabled = false;
    document.getElementById('skip-btn').disabled = false;
    
    answerInput.focus();
    
    // Start the timer
    startTimer();
}

// Submit answer
function submitAnswer() {
    const answerInput = document.getElementById('answer-input');
    const userAnswer = answerInput.value.trim().toUpperCase();
    
    if (!userAnswer) {
        showMessage('Please enter an answer!', 'error');
        return;
    }
    
    const feedback = document.getElementById('feedback');
    const correctAnswer = currentQuestionData.answer.toUpperCase();
    
    // Check if answer is correct (allow some flexibility)
    const isCorrect = checkAnswer(userAnswer, correctAnswer);
    
    if (isCorrect) {
        // Disable input immediately so the player can't re-submit
        answerInput.disabled = true;
        document.getElementById('submit-btn').disabled = true;
        document.getElementById('skip-btn').disabled = true;

        if (isMultiplayer) {
            // Points based on remaining time (max 600, min 10)
            const points = Math.max(10, timeRemaining * 10);
            feedback.textContent = `✅ Correct! +${points} pts`;
            feedback.className = 'feedback correct';
            showMessage(`🎉 +${points} pts!`, 'success');
            mp_onCorrectAnswer(points);
            // Do NOT stop the timer here — host needs it to auto-advance
            // when not all players have answered yet.
            return;
        }

        // Singleplayer: stop the timer now
        stopTimer();
        
        questionsAnswered++;
        score++;
        correctStreak++;
        if (correctStreak > bestStreak) {
            bestStreak = correctStreak;
        }
        
        feedback.textContent = '✅ Correct! ' + currentQuestionData.answer;
        feedback.className = 'feedback correct';
        
        if (correctStreak > 1) {
            showMessage(`🔥 ${correctStreak} in a row!`, 'success');
        } else {
            showMessage('Great job!', 'success');
        }
        
        saveStats();
        updateStatsDisplay();
        
        // Load next question after delay
        setTimeout(() => {
            loadNewQuestion();
        }, 2500);
    } else {
        // Wrong answer - allow to keep guessing
        feedback.textContent = '❌ Try again!';
        feedback.className = 'feedback wrong';
        answerInput.value = '';
        // Shake + flash the input red
        answerInput.classList.remove('wrong-shake');
        void answerInput.offsetWidth; // force reflow so animation restarts
        answerInput.classList.add('wrong-shake');
        answerInput.addEventListener('animationend', () => answerInput.classList.remove('wrong-shake'), { once: true });
        answerInput.focus();
    }
}

// Check if answer is correct (with some flexibility)
function checkAnswer(userAnswer, correctAnswer) {
    // Direct match
    if (userAnswer === correctAnswer) {
        return true;
    }
    
    // Remove common words and punctuation for comparison
    const cleanUser = cleanAnswerForComparison(userAnswer);
    const cleanCorrect = cleanAnswerForComparison(correctAnswer);
    
    if (cleanUser === cleanCorrect) {
        return true;
    }
    
    // Check if user answer is contained in correct answer or vice versa
    // (for cases like "Harry Potter" vs "Harry Potter and the...")
    if (cleanCorrect.includes(cleanUser) || cleanUser.includes(cleanCorrect)) {
        // Make sure it's not too short (avoid false positives)
        if (cleanUser.length >= 4 && cleanCorrect.length >= 4) {
            return true;
        }
    }
    
    return false;
}

// Clean answer for comparison
function cleanAnswerForComparison(answer) {
    return answer
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '') // Remove non-alphanumeric
        .replace(/^(THE|A|AN)\s+/i, ''); // Remove "THE", "A", "AN" at start
}

// Skip question
function skipQuestion() {
    if (isMultiplayer) {
        mp_hostSkip();
        return;
    }

    stopTimer();
    
    const feedback = document.getElementById('feedback');
    feedback.textContent = '⏭️ Skipped! Answer: ' + currentQuestionData.answer;
    feedback.className = 'feedback skipped';
    
    questionsAnswered++;
    correctStreak = 0;
    
    saveStats();
    updateStatsDisplay();
    
    // Disable input temporarily
    document.getElementById('answer-input').disabled = true;
    document.getElementById('submit-btn').disabled = true;
    document.getElementById('skip-btn').disabled = true;
    
    // Load next question after delay
    setTimeout(() => {
        loadNewQuestion();
    }, 2500);
}

// Show message
function showMessage(message, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.classList.add('show');
    
    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 2000);
}

// Start game on load
window.addEventListener('load', initGame);
