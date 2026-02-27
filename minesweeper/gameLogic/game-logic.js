// ── Initialise / reset ────────────────────────────────────────────────────────
function initGame(difficulty) {
    difficulty = difficulty || currentDifficulty;
    currentDifficulty = difficulty;

    const preset = DIFFICULTIES[difficulty];
    rows        = preset.rows;
    cols        = preset.cols;
    totalMines  = preset.mines;

    board          = [];
    gameStatus     = 'idle';
    minesPlaced    = false;
    flagCount      = 0;
    revealedCount  = 0;

    stopTimer();
    elapsedSeconds = 0;
    updateTimerDisplay();

    // Build empty board
    for (let r = 0; r < rows; r++) {
        board[r] = [];
        for (let c = 0; c < cols; c++) {
            board[r][c] = {
                isMine:      false,
                isRevealed:  false,
                isFlagged:   false,
                neighbors:   0
            };
        }
    }

    updateMineCounter();
    renderBoard();
    updateFace('😊');
    hideOverlay();
}

// ── Place mines after first click (guarantees safe first reveal) ─────────────
function placeMines(safeRow, safeCol) {
    // Build list of eligible positions (exclude first-click cell & its neighbors)
    const safe = new Set();
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const nr = safeRow + dr;
            const nc = safeCol + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                safe.add(nr * cols + nc);
            }
        }
    }

    let placed = 0;
    while (placed < totalMines) {
        const idx = Math.floor(Math.random() * rows * cols);
        if (!safe.has(idx) && !board[Math.floor(idx / cols)][idx % cols].isMine) {
            board[Math.floor(idx / cols)][idx % cols].isMine = true;
            placed++;
        }
    }

    // Calculate neighbor counts
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!board[r][c].isMine) {
                board[r][c].neighbors = countNeighborMines(r, c);
            }
        }
    }

    minesPlaced = true;
}

function countNeighborMines(r, c) {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine) {
                count++;
            }
        }
    }
    return count;
}

// ── Reveal cell (BFS flood fill for empty cells) ─────────────────────────────
function revealCell(r, c) {
    if (gameStatus === 'won' || gameStatus === 'lost') return;
    if (board[r][c].isRevealed || board[r][c].isFlagged) return;

    // First click: place mines then start timer
    if (gameStatus === 'idle') {
        placeMines(r, c);
        gameStatus = 'playing';
        startTimer();
    }

    if (board[r][c].isMine) {
        board[r][c].isRevealed = true;
        triggerLoss(r, c);
        return;
    }

    // BFS
    const queue = [[r, c]];
    while (queue.length > 0) {
        const [cr, cc] = queue.shift();
        const cell = board[cr][cc];
        if (cell.isRevealed || cell.isFlagged || cell.isMine) continue;
        cell.isRevealed = true;
        revealedCount++;

        if (cell.neighbors === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = cr + dr, nc = cc + dc;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !board[nr][nc].isRevealed) {
                        queue.push([nr, nc]);
                    }
                }
            }
        }
    }

    checkWin();
    renderBoard();
}

// ── Chord reveal (click on a revealed numbered cell) ─────────────────────────
function chordReveal(r, c) {
    if (!board[r][c].isRevealed || board[r][c].neighbors === 0) return;

    let flagged = 0;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isFlagged) {
                flagged++;
            }
        }
    }

    if (flagged === board[r][c].neighbors) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !board[nr][nc].isFlagged && !board[nr][nc].isRevealed) {
                    revealCell(nr, nc);
                }
            }
        }
    }
}

// ── Toggle flag ───────────────────────────────────────────────────────────────
function toggleFlag(r, c) {
    if (gameStatus === 'won' || gameStatus === 'lost') return;
    if (gameStatus === 'idle') return; // can't flag before first click
    if (board[r][c].isRevealed) return;

    board[r][c].isFlagged = !board[r][c].isFlagged;
    flagCount += board[r][c].isFlagged ? 1 : -1;

    updateMineCounter();
    renderBoard();
}

// ── Win / Loss ────────────────────────────────────────────────────────────────
function checkWin() {
    const safeCells = rows * cols - totalMines;
    if (revealedCount === safeCells) {
        gameStatus = 'won';
        stopTimer();
        updateFace('😎');
        // Auto-flag remaining mines
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (board[r][c].isMine) board[r][c].isFlagged = true;
            }
        }
        flagCount = totalMines;
        updateMineCounter();
        renderBoard();
        showOverlay(true);
    }
}

function triggerLoss(clickedR, clickedC) {
    gameStatus = 'lost';
    stopTimer();
    updateFace('😵');

    // Reveal all mines
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = board[r][c];
            if (cell.isMine) cell.isRevealed = true;
            // Mark wrongly flagged cells
            if (cell.isFlagged && !cell.isMine) cell.wrongFlag = true;
        }
    }
    board[clickedR][clickedC].isDetonated = true;

    renderBoard();
    showOverlay(false);
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function startTimer() {
    timerInterval = setInterval(() => {
        elapsedSeconds = Math.min(elapsedSeconds + 1, 999);
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const el = document.getElementById('timer');
    if (el) el.textContent = String(elapsedSeconds).padStart(3, '0');
}

// ── Mine counter display ──────────────────────────────────────────────────────
function updateMineCounter() {
    const el = document.getElementById('mine-count');
    if (el) el.textContent = String(Math.max(-99, totalMines - flagCount)).padStart(3, '0');
}

// ── Face button ───────────────────────────────────────────────────────────────
function updateFace(emoji) {
    const btn = document.getElementById('face-btn');
    if (btn) btn.textContent = emoji;
}

// ── Overlay ───────────────────────────────────────────────────────────────────
function showOverlay(won) {
    const overlay = document.getElementById('overlay');
    const title   = document.getElementById('overlay-title');
    const msg     = document.getElementById('overlay-msg');
    if (!overlay) return;

    title.textContent = won ? '🎉 You Win!' : '💥 Game Over';
    msg.textContent   = won
        ? `Cleared in ${elapsedSeconds}s — nice work!`
        : 'Better luck next time!';
    overlay.classList.add('visible');
}

function hideOverlay() {
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.remove('visible');
}

// ── Render the board to the DOM ───────────────────────────────────────────────
const NUMBER_COLORS = ['', '#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#b45309', '#0891b2', '#374151', '#6b7280'];

function renderBoard() {
    const boardEl = document.getElementById('board');
    if (!boardEl) return;

    boardEl.style.setProperty('--cols', cols);
    boardEl.innerHTML = '';

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = board[r][c];
            const el   = document.createElement('div');
            el.className = 'cell';
            el.dataset.r = r;
            el.dataset.c = c;

            if (cell.isRevealed) {
                el.classList.add('revealed');
                if (cell.isMine) {
                    el.classList.add(cell.isDetonated ? 'detonated' : 'mine');
                    el.textContent = '💣';
                } else if (cell.neighbors > 0) {
                    el.textContent = cell.neighbors;
                    el.style.color = NUMBER_COLORS[cell.neighbors];
                }
            } else if (cell.wrongFlag) {
                el.classList.add('wrong-flag');
                el.textContent = '❌';
            } else if (cell.isFlagged) {
                el.classList.add('flagged');
                el.textContent = '🚩';
            }

            // Events
            el.addEventListener('click', () => {
                if (cell.isRevealed) {
                    chordReveal(r, c);
                } else {
                    revealCell(r, c);
                }
            });
            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                toggleFlag(r, c);
            });

            boardEl.appendChild(el);
        }
    }
}
