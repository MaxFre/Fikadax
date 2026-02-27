// ── Multiplayer state ─────────────────────────────────────────────────────────
let mp_peer        = null;
let mp_connections = [];      // host: all client conns; client: [hostConn]
let mp_isHost      = false;
let mp_roomCode    = '';
let mp_localId     = '';
let mp_localName   = '';
let mp_players     = [];      // { id, name, score, answered }
let mp_questionList = [];     // array of quizData indices (shared order)
let mp_questionIndex = 0;    // which question in mp_questionList we're on
const MP_QUESTION_COUNT = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Room code helpers
// ─────────────────────────────────────────────────────────────────────────────
function mp_generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

// ─────────────────────────────────────────────────────────────────────────────
// Host: create room
// ─────────────────────────────────────────────────────────────────────────────
function mp_hostGame() {
    mp_localName = document.getElementById('player-name-host').value.trim() || 'Host';
    mp_isHost    = true;
    mp_roomCode  = mp_generateCode();
    mp_localId   = 'host-' + Date.now();

    mp_peer = new Peer(mp_roomCode, {
        config: { iceServers: [
            { url: 'stun:stun.l.google.com:19302' },
            { url: 'stun:stun1.l.google.com:19302' }
        ]}
    });

    mp_setLobbyStatus('Creating room…', 'info');

    mp_peer.on('open', () => {
        mp_players = [{ id: mp_localId, name: mp_localName, score: 0, answered: false }];
        mp_showScreen('screen-lobby');
        document.getElementById('lobby-code-display').textContent = mp_roomCode;
        document.getElementById('start-game-btn').style.display = 'inline-block';
        mp_renderLobbyPlayers();
    });

    mp_peer.on('connection', (conn) => {
        mp_connections.push(conn);
        mp_setupConn(conn);
    });

    mp_peer.on('error', (err) => {
        mp_setLobbyStatus('Could not create room: ' + err.type, 'error');
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Client: join room
// ─────────────────────────────────────────────────────────────────────────────
function mp_joinGame() {
    mp_localName = document.getElementById('player-name-join').value.trim() || 'Player';
    const code   = document.getElementById('room-code-input').value.trim().toUpperCase();

    if (code.length !== 6) {
        mp_setSetupStatus('Enter a valid 6-character room code.', 'error');
        return;
    }

    mp_isHost   = false;
    mp_roomCode = code;
    mp_localId  = 'player-' + Date.now();

    mp_peer = new Peer(undefined, {
        config: { iceServers: [
            { url: 'stun:stun.l.google.com:19302' },
            { url: 'stun:stun1.l.google.com:19302' }
        ]}
    });

    mp_setSetupStatus('Connecting…', 'info');

    mp_peer.on('open', () => {
        const hostConn = mp_peer.connect(code);
        mp_connections = [hostConn];
        mp_setupConn(hostConn);

        hostConn.on('open', () => {
            mp_setSetupStatus('Connected! Joining lobby…', 'success');
            mp_send(hostConn, { type: 'join-request', playerId: mp_localId, playerName: mp_localName });
        });

        hostConn.on('error', () => {
            mp_setSetupStatus('Could not connect to host. Check the code.', 'error');
        });
    });

    mp_peer.on('error', () => {
        mp_setSetupStatus('Connection failed. Try again.', 'error');
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Connection setup (shared host/client)
// ─────────────────────────────────────────────────────────────────────────────
function mp_setupConn(conn) {
    conn.on('data', (data) => mp_handleMessage(data, conn));
    conn.on('close', () => {
        if (mp_isHost) {
            mp_connections = mp_connections.filter(c => c !== conn);
            mp_players = mp_players.filter(p => p.id !== conn.peer);
            mp_renderLobbyPlayers();
            mp_renderScoreboard();
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Send helpers
// ─────────────────────────────────────────────────────────────────────────────
function mp_send(conn, data) {
    try { conn.send(data); } catch (e) { console.warn('send failed', e); }
}

function mp_broadcast(data, exceptId) {
    mp_connections.forEach(c => {
        if (c.peer !== exceptId) mp_send(c, data);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Message handler
// ─────────────────────────────────────────────────────────────────────────────
function mp_handleMessage(data, conn) {
    switch (data.type) {

        // ── Host receives: a player wants to join ────────────────────────────
        case 'join-request':
            if (!mp_isHost) return;
            mp_players.push({ id: data.playerId, name: data.playerName, score: 0, answered: false });
            // Acknowledge the joining player (send them their player id confirmation + lobby state)
            mp_send(conn, { type: 'join-ack', players: mp_players });
            // Tell everyone else
            mp_broadcast({ type: 'player-joined', players: mp_players }, conn.peer);
            mp_renderLobbyPlayers();
            break;

        // ── Client receives: acknowledged + lobby state ──────────────────────
        case 'join-ack':
            mp_players = data.players;
            mp_showScreen('screen-lobby');
            document.getElementById('lobby-code-display').textContent = mp_roomCode;
            document.getElementById('start-game-btn').style.display = 'none';
            mp_renderLobbyPlayers();
            break;

        // ── All clients receive: player list updated ─────────────────────────
        case 'player-joined':
            mp_players = data.players;
            mp_renderLobbyPlayers();
            break;

        // ── Client receives: host started the game ───────────────────────────
        case 'game-start':
            mp_questionList  = data.questionList;
            mp_players       = data.players;
            mp_questionIndex = 0;
            mp_startMultiplayerGame();
            break;

        // ── All clients receive: someone guessed correctly ───────────────────
        case 'someone-guessed':
            mp_onSomeoneGuessed(data.playerName, data.points);
            // Update local player scores
            const gp = mp_players.find(p => p.id === data.playerId);
            if (gp) { gp.score += data.points; gp.answered = true; }
            mp_renderScoreboard();
            break;

        // ── Host receives: a player guessed correctly ────────────────────────
        case 'player-guessed':
            if (!mp_isHost) return;
            const pp = mp_players.find(p => p.id === data.playerId);
            if (pp) { pp.score += data.points; pp.answered = true; }
            // Broadcast to everyone (including the guesser, so they see their points reflected)
            mp_broadcast({ type: 'someone-guessed', playerId: data.playerId, playerName: data.playerName, points: data.points }, null);
            // Also update host's own UI
            mp_onSomeoneGuessed(data.playerName, data.points);
            mp_renderScoreboard();
            // Check if all players answered
            if (mp_players.every(p => p.answered)) mp_advanceQuestion();
            break;

        // ── All clients receive: move to next question ───────────────────────
        case 'next-question':
            mp_questionIndex = data.questionIndex;
            mp_players.forEach(p => p.answered = false);
            mp_loadMpQuestion();
            break;

        // ── Client receives: game over ────────────────────────────────────────
        case 'game-over':
            mp_players = data.players;
            mp_showResults();
            break;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Host: start game
// ─────────────────────────────────────────────────────────────────────────────
function mp_hostStartGame() {
    if (mp_players.length < 1) return; // even 1 player is fine

    // Shuffle question indices
    const indices = Array.from({ length: quizData.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    mp_questionList  = indices.slice(0, MP_QUESTION_COUNT);
    mp_questionIndex = 0;
    mp_players.forEach(p => { p.score = 0; p.answered = false; });

    mp_broadcast({ type: 'game-start', questionList: mp_questionList, players: mp_players }, null);
    mp_startMultiplayerGame();
}

// ─────────────────────────────────────────────────────────────────────────────
// Start multiplayer game locally
// ─────────────────────────────────────────────────────────────────────────────
function mp_startMultiplayerGame() {
    isMultiplayer = true;
    showSingleplayerStats(false);
    mp_showScreen('screen-game');
    // hide skip button for clients
    if (!mp_isHost) {
        document.getElementById('skip-btn').style.display = 'none';
    }
    mp_renderScoreboard();
    mp_loadMpQuestion();
}

// ─────────────────────────────────────────────────────────────────────────────
// Load the current multiplayer question
// ─────────────────────────────────────────────────────────────────────────────
function mp_loadMpQuestion() {
    if (mp_questionIndex >= mp_questionList.length) {
        mp_endGame();
        return;
    }
    const qIdx = mp_questionList[mp_questionIndex];
    currentQuestionData = quizData[qIdx];
    mp_myAnsweredThisRound = false;

    const emojiDisplay  = document.getElementById('emoji-display');
    const typeLabel     = document.getElementById('type-label');
    const answerInput   = document.getElementById('answer-input');
    const feedback      = document.getElementById('feedback');
    const hintDisplay   = document.getElementById('hint-display');

    emojiDisplay.textContent = currentQuestionData.emojis;
    typeLabel.textContent    = currentQuestionData.type;
    answerInput.value        = '';
    answerInput.disabled     = false;
    feedback.textContent     = '';
    feedback.className       = 'feedback';
    hintDisplay.textContent  = '';

    document.getElementById('submit-btn').disabled = false;
    if (mp_isHost) document.getElementById('skip-btn').disabled = false;

    // Progress badge
    document.getElementById('mp-progress').textContent =
        `Question ${mp_questionIndex + 1} / ${mp_questionList.length}`;

    answerInput.focus();
    startTimer(); // local timer still ticks for hints + visual
}

// ─────────────────────────────────────────────────────────────────────────────
// Called when the local timer hits 0 in multiplayer
// ─────────────────────────────────────────────────────────────────────────────
function mp_onTimeUp() {
    if (mp_isHost) {
        mp_advanceQuestion();
    } else {
        // Clients just wait for host to send next-question
        document.getElementById('answer-input').disabled = true;
        document.getElementById('submit-btn').disabled   = true;
        document.getElementById('feedback').textContent  = '⏰ Time\'s up! Waiting for host…';
        document.getElementById('feedback').className    = 'feedback wrong';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Host: advance to next question (triggered by timer or all answered)
// ─────────────────────────────────────────────────────────────────────────────
let mp_advanceTimeout = null;
function mp_advanceQuestion() {
    if (mp_advanceTimeout) return; // already scheduled
    stopTimer();
    mp_questionIndex++;
    if (mp_questionIndex >= mp_questionList.length) {
        // Short delay before showing results
        mp_advanceTimeout = setTimeout(() => {
            mp_advanceTimeout = null;
            mp_endGame();
        }, 1500);
        return;
    }
    mp_advanceTimeout = setTimeout(() => {
        mp_advanceTimeout = null;
        mp_players.forEach(p => p.answered = false);
        mp_broadcast({ type: 'next-question', questionIndex: mp_questionIndex }, null);
        mp_loadMpQuestion();
    }, 2000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Track whether local player already answered this round
// ─────────────────────────────────────────────────────────────────────────────
let mp_myAnsweredThisRound = false;

// ─────────────────────────────────────────────────────────────────────────────
// Called from game-logic.js when the local player answers correctly
// ─────────────────────────────────────────────────────────────────────────────
function mp_onCorrectAnswer(points) {
    if (mp_myAnsweredThisRound) return;
    mp_myAnsweredThisRound = true;

    // Update local player object
    const me = mp_players.find(p => p.id === mp_localId);
    if (me) { me.score += points; me.answered = true; }

    if (mp_isHost) {
        // Host tells everyone and checks for advance
        mp_broadcast({ type: 'someone-guessed', playerId: mp_localId, playerName: mp_localName, points }, null);
        mp_renderScoreboard();
        if (mp_players.every(p => p.answered)) mp_advanceQuestion();
    } else {
        // Client tells host
        mp_send(mp_connections[0], { type: 'player-guessed', playerId: mp_localId, playerName: mp_localName, points });
        mp_renderScoreboard();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Show a "Someone got it!" notification
// ─────────────────────────────────────────────────────────────────────────────
function mp_onSomeoneGuessed(name, points) {
    if (name === mp_localName) return; // don't double-show for yourself
    showMessage(`🎉 ${name} got it! (+${points} pts)`, 'success');
}

// ─────────────────────────────────────────────────────────────────────────────
// Host: skip (same as time-up)
// ─────────────────────────────────────────────────────────────────────────────
function mp_hostSkip() {
    if (!mp_isHost) return;
    stopTimer();
    mp_advanceQuestion();
}

// ─────────────────────────────────────────────────────────────────────────────
// End game
// ─────────────────────────────────────────────────────────────────────────────
function mp_endGame() {
    stopTimer();
    if (mp_isHost) {
        mp_broadcast({ type: 'game-over', players: mp_players }, null);
    }
    mp_showResults();
}

// ─────────────────────────────────────────────────────────────────────────────
// Results screen
// ─────────────────────────────────────────────────────────────────────────────
function mp_showResults() {
    mp_showScreen('screen-results');
    const sorted = [...mp_players].sort((a, b) => b.score - a.score);
    const list   = document.getElementById('results-list');
    const medals = ['🥇', '🥈', '🥉'];
    list.innerHTML = sorted.map((p, i) => `
        <div class="results-row ${p.id === mp_localId ? 'results-you' : ''}">
            <span class="results-rank">${medals[i] || `#${i+1}`}</span>
            <span class="results-name">${p.name}${p.id === mp_localId ? ' (you)' : ''}</span>
            <span class="results-score">${p.score} pts</span>
        </div>
    `).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoreboard (in-game sidebar)
// ─────────────────────────────────────────────────────────────────────────────
function mp_renderScoreboard() {
    const el = document.getElementById('mp-scoreboard');
    if (!el) return;
    const sorted = [...mp_players].sort((a, b) => b.score - a.score);
    el.innerHTML = sorted.map(p => `
        <div class="sb-row ${p.id === mp_localId ? 'sb-you' : ''} ${p.answered ? 'sb-answered' : ''}">
            <span class="sb-name">${p.name}${p.id === mp_localId ? ' ★' : ''}</span>
            <span class="sb-score">${p.score}</span>
            ${p.answered ? '<span class="sb-check">✔</span>' : ''}
        </div>
    `).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Lobby helpers
// ─────────────────────────────────────────────────────────────────────────────
function mp_renderLobbyPlayers() {
    const el = document.getElementById('lobby-players');
    if (!el) return;
    el.innerHTML = mp_players.map(p => `
        <div class="lobby-player">${p.isHost || p.id === mp_localId && mp_isHost ? '👑 ' : '👤 '}${p.name}</div>
    `).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen helpers
// ─────────────────────────────────────────────────────────────────────────────
function mp_showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function mp_setLobbyStatus(msg, type) {
    const el = document.getElementById('lobby-status');
    if (el) { el.textContent = msg; el.className = 'mp-status ' + type; }
}

function mp_setSetupStatus(msg, type) {
    const el = document.getElementById('mp-setup-status');
    if (el) { el.textContent = msg; el.className = 'mp-status ' + type; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers used by index.html buttons
// ─────────────────────────────────────────────────────────────────────────────
function mp_showSetup(mode) {
    // mode: 'host' or 'join'
    document.getElementById('host-section').classList.toggle('hidden', mode !== 'host');
    document.getElementById('join-section').classList.toggle('hidden', mode !== 'join');
    document.getElementById('host-tab').classList.toggle('active', mode === 'host');
    document.getElementById('join-tab').classList.toggle('active', mode === 'join');
}

function showSingleplayerStats(show) {
    const el = document.getElementById('stats-bar');
    if (el) el.style.display = show ? 'flex' : 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
// Clean up peers on page leave
// ─────────────────────────────────────────────────────────────────────────────
window.addEventListener('beforeunload', () => {
    if (mp_peer) mp_peer.destroy();
});
