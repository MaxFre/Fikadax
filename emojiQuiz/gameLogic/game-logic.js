// Current question data
let currentQuestionData = null;

// Initialize game
function initGame() {
    loadStats();
    updateStatsDisplay();
    loadNewQuestion();
    
    // Setup event listeners
    document.getElementById('submit-btn').addEventListener('click', submitAnswer);
    document.getElementById('skip-btn').addEventListener('click', skipQuestion);
    document.getElementById('answer-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitAnswer();
        }
    });
    
    document.getElementById('back-to-home-btn').addEventListener('click', () => {
        window.location.href = '../index.html';
    });
    
    // Focus on input
    document.getElementById('answer-input').focus();
}

// Load new question
function loadNewQuestion() {
    currentQuestionData = getRandomQuestion();
    
    const emojiDisplay = document.getElementById('emoji-display');
    const typeLabel = document.getElementById('type-label');
    const answerInput = document.getElementById('answer-input');
    const feedback = document.getElementById('feedback');
    
    emojiDisplay.textContent = currentQuestionData.emojis;
    typeLabel.textContent = currentQuestionData.type;
    answerInput.value = '';
    feedback.textContent = '';
    feedback.className = 'feedback';
    
    // Re-enable input and buttons
    answerInput.disabled = false;
    document.getElementById('submit-btn').disabled = false;
    document.getElementById('skip-btn').disabled = false;
    
    answerInput.focus();
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
    
    questionsAnswered++;
    
    if (isCorrect) {
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
    } else {
        correctStreak = 0;
        feedback.textContent = '❌ Wrong! Correct answer: ' + currentQuestionData.answer;
        feedback.className = 'feedback wrong';
        showMessage('Keep trying!', 'error');
    }
    
    saveStats();
    updateStatsDisplay();
    
    // Disable input temporarily
    answerInput.disabled = true;
    document.getElementById('submit-btn').disabled = true;
    document.getElementById('skip-btn').disabled = true;
    
    // Load next question after delay
    setTimeout(() => {
        loadNewQuestion();
    }, 2500);
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
