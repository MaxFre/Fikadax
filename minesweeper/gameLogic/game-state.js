// ── Difficulty presets ──────────────────────────────────────────────────────
const DIFFICULTIES = {
    easy:   { rows: 9,  cols: 9,  mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    hard:   { rows: 16, cols: 30, mines: 99 }
};

// ── Board state ─────────────────────────────────────────────────────────────
let board = [];          // 2-D array of cell objects
let rows = 9;
let cols = 9;
let totalMines = 10;

// ── Game status ─────────────────────────────────────────────────────────────
// 'idle' → first click not yet made
// 'playing' → in progress
// 'won' / 'lost'
let gameStatus = 'idle';
let minesPlaced = false;

// ── Counters ─────────────────────────────────────────────────────────────────
let flagCount = 0;       // flags placed by the player
let revealedCount = 0;   // non-mine cells revealed

// ── Timer ────────────────────────────────────────────────────────────────────
let timerInterval = null;
let elapsedSeconds = 0;

// ── Current difficulty ────────────────────────────────────────────────────────
let currentDifficulty = 'easy';
