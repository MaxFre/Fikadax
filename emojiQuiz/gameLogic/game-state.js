// Game state
let currentQuestion = 0;
let score = 0;
let questionsAnswered = 0;
let correctStreak = 0;
let bestStreak = 0;
let usedQuestions = [];

// Timer state
let timeRemaining = 20;
let timerInterval = null;
const TOTAL_TIME = 20;
const HINT_START_TIME = 5; // Start showing hints at 5 seconds remaining

// Quiz data - Movies and TV Series with emoji clues
const quizData = [
    // Movies
    { emojis: '🐍🏫⚡🧙‍♂️', answer: 'HARRY POTTER', type: 'Film' },
    { emojis: '🦁👑🌅🐗', answer: 'THE LION KING', type: 'Film' },
    { emojis: '🕷️👨🕸️🏙️', answer: 'SPIDER-MAN', type: 'Film' },
    { emojis: '🦈🌊🏖️😱', answer: 'JAWS', type: 'Film' },
    { emojis: '👻🔫🏢👨‍🔬', answer: 'GHOSTBUSTERS', type: 'Film' },
    { emojis: '🚢❄️💑🌊', answer: 'TITANIC', type: 'Film' },
    { emojis: '🦖🏞️🔬👨‍🔬', answer: 'JURASSIC PARK', type: 'Film' },
    { emojis: '🤖🚗⚔️🔫', answer: 'TRANSFORMERS', type: 'Film' },
    { emojis: '🐭🍳🇫🇷👨‍🍳', answer: 'RATATOUILLE', type: 'Film' },
    { emojis: '🏰❄️👸⛄', answer: 'FROZEN', type: 'Film' },
    { emojis: '🦇🦸🌃🏙️', answer: 'BATMAN', type: 'Film' },
    { emojis: '🌟⚔️🚀👽', answer: 'STAR WARS', type: 'Film' },
    { emojis: '🧙‍♂️💍🗻🐉', answer: 'LORD OF THE RINGS', type: 'Film' },
    { emojis: '🚀👽🌙🚴', answer: 'E.T.', type: 'Film' },
    { emojis: '🦍🏙️👸🗼', answer: 'KING KONG', type: 'Film' },
    { emojis: '🐠🔍🌊🐟', answer: 'FINDING NEMO', type: 'Film' },
    { emojis: '🎭😱🔪☎️', answer: 'SCREAM', type: 'Film' },
    { emojis: '🍫🏭🎩👦', answer: 'CHARLIE AND THE CHOCOLATE FACTORY', type: 'Film' },
    { emojis: '🏃‍♂️💨🎖️🏈', answer: 'FORREST GUMP', type: 'Film' },
    { emojis: '🚗⚡⏰🕰️', answer: 'BACK TO THE FUTURE', type: 'Film' },
    { emojis: '👨‍🚀🌌🪐⏰', answer: 'INTERSTELLAR', type: 'Film' },
    { emojis: '🎪🐘👂🎈', answer: 'DUMBO', type: 'Film' },
    { emojis: '🦸‍♀️👸💪⚔️', answer: 'WONDER WOMAN', type: 'Film' },
    { emojis: '🐝🎬🌻🍯', answer: 'BEE MOVIE', type: 'Film' },
    { emojis: '🔨⚡🌩️💪', answer: 'THOR', type: 'Film' },
    { emojis: '🦹‍♂️💰🔴🤖', answer: 'IRON MAN', type: 'Film' },
    { emojis: '🌊🏄🔫👮', answer: 'POINT BREAK', type: 'Film' },
    { emojis: '🎩🍫🏭🎪', answer: 'WILLY WONKA', type: 'Film' },
    { emojis: '🏝️⚡🏐😔', answer: 'CASTAWAY', type: 'Film' },
    { emojis: '🎹🎶👩🌊', answer: 'THE PIANO', type: 'Film' },
    
    // TV Series
    { emojis: '👑🗡️🐉❄️', answer: 'GAME OF THRONES', type: 'Serie' },
    { emojis: '🧪💀🚐👨‍🏫', answer: 'BREAKING BAD', type: 'Serie' },
    { emojis: '☕👫🏙️🛋️', answer: 'FRIENDS', type: 'Serie' },
    { emojis: '📄📄📄🖨️', answer: 'THE OFFICE', type: 'Serie' },
    { emojis: '🧟‍♂️🔫🌲😱', answer: 'THE WALKING DEAD', type: 'Serie' },
    { emojis: '🔬🤓💥👨‍🔬', answer: 'THE BIG BANG THEORY', type: 'Serie' },
    { emojis: '👨‍👩‍👧‍👦🏡📺😄', answer: 'MODERN FAMILY', type: 'Serie' },
    { emojis: '🏥💉❤️👨‍⚕️', answer: 'GREY\'S ANATOMY', type: 'Serie' },
    { emojis: '👮‍♂️🔍🕵️🇬🇧', answer: 'SHERLOCK', type: 'Serie' },
    { emojis: '🎮👾🔦🚲', answer: 'STRANGER THINGS', type: 'Serie' },
    { emojis: '💰🏦🎭🔴', answer: 'MONEY HEIST', type: 'Serie' },
    { emojis: '🦸‍♂️💉💥🩸', answer: 'THE BOYS', type: 'Serie' },
    { emojis: '👑🏰🇬🇧👸', answer: 'THE CROWN', type: 'Serie' },
    { emojis: '🤠⭐🤖🔫', answer: 'WESTWORLD', type: 'Serie' },
    { emojis: '📺📰🎙️👨‍💼', answer: 'THE NEWSROOM', type: 'Serie' },
    { emojis: '🧛‍♂️🩸❤️😈', answer: 'THE VAMPIRE DIARIES', type: 'Serie' },
    { emojis: '🎯🏹🦸‍♂️🌃', answer: 'ARROW', type: 'Serie' },
    { emojis: '⚡👨🏃‍♂️💨', answer: 'THE FLASH', type: 'Serie' },
    { emojis: '🧝‍♂️⚔️🏰🐺', answer: 'THE WITCHER', type: 'Serie' },
    { emojis: '📖👸🐉🔥', answer: 'HOUSE OF THE DRAGON', type: 'Serie' },
    { emojis: '🎰💵🔴😱', answer: 'SQUID GAME', type: 'Serie' },
    { emojis: '🏈🏆🌟👨‍🎓', answer: 'FRIDAY NIGHT LIGHTS', type: 'Serie' },
    { emojis: '🔐🕵️🏃‍♂️⚡', answer: 'PRISON BREAK', type: 'Serie' },
    { emojis: '✈️🏝️😱🔢', answer: 'LOST', type: 'Serie' },
    { emojis: '🏫📚🎤🎭', answer: 'GLEE', type: 'Serie' },
    { emojis: '💊🏥🩺👨‍⚕️', answer: 'HOUSE', type: 'Serie' },
    { emojis: '🎵🎸🎤🤠', answer: 'NASHVILLE', type: 'Serie' },
    { emojis: '👨‍💼💼⚖️👔', answer: 'SUITS', type: 'Serie' },
    { emojis: '🏰👸🍎📖', answer: 'ONCE UPON A TIME', type: 'Serie' },
    { emojis: '🧬🦕🌍🌴', answer: 'PREHISTORIC PLANET', type: 'Serie' }
];

// Load stats from localStorage
function loadStats() {
    const saved = localStorage.getItem('emojiQuizStats');
    if (saved) {
        const data = JSON.parse(saved);
        score = data.score || 0;
        questionsAnswered = data.questionsAnswered || 0;
        correctStreak = data.correctStreak || 0;
        bestStreak = data.bestStreak || 0;
    }
}

// Save stats to localStorage
function saveStats() {
    localStorage.setItem('emojiQuizStats', JSON.stringify({
        score,
        questionsAnswered,
        correctStreak,
        bestStreak
    }));
}

// Update stats display
function updateStatsDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('total-answered').textContent = questionsAnswered;
    document.getElementById('current-streak').textContent = correctStreak;
    document.getElementById('best-streak').textContent = bestStreak;
    
    const accuracy = questionsAnswered > 0 ? Math.round((score / questionsAnswered) * 100) : 0;
    document.getElementById('accuracy').textContent = accuracy + '%';
}

// Get random question that hasn't been used recently
function getRandomQuestion() {
    // Reset used questions if we've used them all
    if (usedQuestions.length >= quizData.length) {
        usedQuestions = [];
    }
    
    // Filter out recently used questions
    const availableQuestions = quizData.filter((_, index) => !usedQuestions.includes(index));
    
    // Pick random question from available ones
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const question = availableQuestions[randomIndex];
    
    // Find original index and add to used list
    const originalIndex = quizData.indexOf(question);
    usedQuestions.push(originalIndex);
    
    return question;
}
