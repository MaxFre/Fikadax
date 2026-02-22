// Game state variables
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

// Turn management
let currentPlayerIndex = 0;
let turnTimeRemaining = 0;
let canFlip = true;
let isFirstTurn = true;
let cardsInitiallyRendered = false;

// Multiplayer state
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
    medium: { pairs: 9, cols: 6, symbols: ['🎮', '🎨', '🎭', '🎪', '🎯', '🎲', '🎸', '🎹', '🎵'] },
    hard: { pairs: 12, cols: 8, symbols: ['🎮', '🎨', '🎭', '🎪', '🎯', '🎲', '🎸', '🎹', '🎺', '🎻', '🎬', '🎤'] }
};

// Card symbols (will be set based on difficulty)
let symbols = difficultySettings.medium.symbols;
