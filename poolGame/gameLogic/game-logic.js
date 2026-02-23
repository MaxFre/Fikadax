// ── Bootstrap ─────────────────────────────────────────────────────
let canvas, ctx;
let mousePos = { x: CANVAS_W / 2, y: CANVAS_H / 2 };

function init() {
    canvas = document.getElementById('pool-canvas');
    ctx    = canvas.getContext('2d');

    initBalls();
    resetState();
    setupInput();
    requestAnimationFrame(gameLoop);

    document.getElementById('restart-btn').addEventListener('click', () => {
        initBalls();
        resetState();
    });
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = '../index.html';
    });
}

// ── Game loop ─────────────────────────────────────────────────────
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (gameState.phase === 'moving') {
        updatePhysics();
        if (allStopped()) {
            processEndOfTurn();
        }
    }
}

// ── Rules ─────────────────────────────────────────────────────────
function currentType() {
    return gameState.turn === 1 ? gameState.player1Type : gameState.player2Type;
}
function myBalls() {
    const t = currentType();
    if (!t) return [];
    return balls.filter(b => !b.pocketed && b.id !== 0 && b.id !== 8 &&
        (t === 'solids' ? !b.stripe : b.stripe));
}
function allMyBallsPocketed() {
    const t = currentType();
    if (!t) return false;
    return balls.every(b => b.id === 0 || b.id === 8 ||
        (t === 'solids' ? b.stripe : !b.stripe) || b.pocketed);
}

function processEndOfTurn() {
    const { pocketedThisTurn: pt, cuePocketed, turn } = gameState;

    // ── 8-ball pocketed ───────────────────────────────────────────
    if (pt.includes(8)) {
        if (!gameState.typeAssigned || !allMyBallsPocketed() || cuePocketed) {
            const loser  = turn;
            const winner = turn === 1 ? 2 : 1;
            gameState.winner  = winner;
            gameState.message = cuePocketed
                ? `P${loser} scratched on the 8-ball – P${winner} wins! 🎱`
                : `P${loser} pocketed the 8 too early – P${winner} wins! 🎱`;
        } else {
            gameState.winner  = turn;
            gameState.message = `Player ${turn} wins! 🎱`;
        }
        gameState.phase = 'gameover';
        return;
    }

    // ── Assign ball types on first legal pocket ───────────────────
    if (!gameState.typeAssigned) {
        const firstId = pt.find(id => id !== 0);
        if (firstId !== undefined) {
            const p1Stripe = firstId >= 9;
            gameState.player1Type = turn === 1 ? (p1Stripe ? 'stripes' : 'solids')
                                                : (p1Stripe ? 'solids'  : 'stripes');
            gameState.player2Type = gameState.player1Type === 'solids' ? 'stripes' : 'solids';
            gameState.typeAssigned = true;
        }
    }

    // ── Add pocketed balls to player tally ────────────────────────
    for (const id of pt) {
        if (id !== 0) gameState.pocketedBalls[turn].push(id);
    }

    // ── Decide turn keep / switch ─────────────────────────────────
    let switchTurn = true;

    if (cuePocketed) {
        gameState.message = `Scratch! P${turn === 1 ? 2 : 1} places the cue ball.`;
        cueBall.pocketed = true;
        gameState.phase  = 'placing_cue';
        gameState.turn   = turn === 1 ? 2 : 1;
        gameState.pocketedThisTurn = [];
        return;
    }

    const t = currentType();
    if (t && pt.length > 0) {
        const scoredOwn = pt.filter(id => {
            if (id === 0 || id === 8) return false;
            return t === 'stripes' ? id >= 9 : id <= 7;
        });
        if (scoredOwn.length > 0) {
            switchTurn = false;
            gameState.message = `Player ${turn} pocketed ${scoredOwn.length} ball${scoredOwn.length > 1 ? 's' : ''}! Another turn!`;
        }
    }

    // Foul: hit wrong ball first (not on break)
    if (!gameState.breakShot && gameState.typeAssigned && gameState.firstHitType) {
        const hitWrong = (t === 'solids'   && gameState.firstHitType === 'stripe') ||
                         (t === 'stripes'  && gameState.firstHitType === 'solid');
        if (hitWrong) {
            switchTurn = true;
            gameState.message = `Foul! P${turn} hit opponent's ball first.`;
        }
    }

    // No hit at all = foul
    if (!gameState.breakShot && gameState.firstHitType === null) {
        switchTurn = true;
        gameState.message = `Foul! P${turn} didn't hit anything.`;
    }

    gameState.breakShot = false;

    if (switchTurn) {
        gameState.turn = turn === 1 ? 2 : 1;
        if (!gameState.message) gameState.message = `Player ${gameState.turn}'s turn`;
    }

    gameState.pocketedThisTurn = [];
    gameState.firstHitType     = null;
    gameState.cuePocketed      = false;

    if (gameState.phase !== 'placing_cue') gameState.phase = 'aiming';
}

// ── Input ─────────────────────────────────────────────────────────
function getCanvasPos(e) {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top ) * scaleY,
    };
}

function setupInput() {
    canvas.addEventListener('mousemove', e => {
        const pos = getCanvasPos(e);
        mousePos  = pos;
        cueInput.aimX = pos.x;
        cueInput.aimY = pos.y;
        if (cueInput.dragging) {
            const dx = pos.x - cueInput.dragStartX;
            const dy = pos.y - cueInput.dragStartY;
            cueInput.power = Math.min(Math.sqrt(dx * dx + dy * dy) / 5, MAX_POWER);
        }
    });

    canvas.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        const pos = getCanvasPos(e);

        if (gameState.phase === 'placing_cue') {
            if (isValidCuePlacement(pos.x, pos.y)) {
                cueBall.x = pos.x;
                cueBall.y = pos.y;
                cueBall.pocketed = false;
                cueBall.vx = 0;
                cueBall.vy = 0;
                gameState.phase   = 'aiming';
                gameState.message = `Player ${gameState.turn}'s turn`;
            }
            return;
        }

        if (gameState.phase !== 'aiming') return;
        cueInput.dragging   = true;
        cueInput.dragStartX = pos.x;
        cueInput.dragStartY = pos.y;
        cueInput.aimX       = pos.x;
        cueInput.aimY       = pos.y;
        cueInput.power      = 0;
    });

    canvas.addEventListener('mouseup', e => {
        if (e.button !== 0 || !cueInput.dragging) return;
        cueInput.dragging = false;
        if (gameState.phase === 'aiming' && cueInput.power > 0.4) shoot();
        cueInput.power = 0;
    });

    // Touch
    const touchPos = t => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (t.clientX - rect.left) * (canvas.width  / rect.width),
            y: (t.clientY - rect.top ) * (canvas.height / rect.height),
        };
    };
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const pos = touchPos(e.touches[0]);
        mousePos = pos;
        if (gameState.phase === 'placing_cue') {
            if (isValidCuePlacement(pos.x, pos.y)) {
                cueBall.x = pos.x; cueBall.y = pos.y;
                cueBall.pocketed = false;
                cueBall.vx = 0; cueBall.vy = 0;
                gameState.phase = 'aiming';
                gameState.message = `Player ${gameState.turn}'s turn`;
            }
            return;
        }
        cueInput.dragging   = true;
        cueInput.dragStartX = pos.x;
        cueInput.dragStartY = pos.y;
        cueInput.aimX = pos.x; cueInput.aimY = pos.y;
        cueInput.power = 0;
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        const pos = touchPos(e.touches[0]);
        mousePos = pos;
        cueInput.aimX = pos.x; cueInput.aimY = pos.y;
        if (cueInput.dragging) {
            const dx = pos.x - cueInput.dragStartX;
            const dy = pos.y - cueInput.dragStartY;
            cueInput.power = Math.min(Math.sqrt(dx * dx + dy * dy) / 5, MAX_POWER);
        }
    }, { passive: false });
    canvas.addEventListener('touchend', e => {
        e.preventDefault();
        if (!cueInput.dragging) return;
        cueInput.dragging = false;
        if (gameState.phase === 'aiming' && cueInput.power > 0.4) shoot();
        cueInput.power = 0;
    }, { passive: false });
}

function isValidCuePlacement(x, y) {
    if (x - BALL_R < TABLE.left  || x + BALL_R > TABLE.right)  return false;
    if (y - BALL_R < TABLE.top   || y + BALL_R > TABLE.bottom) return false;
    for (const b of balls) {
        if (b.pocketed || b.id === 0) continue;
        const dx = b.x - x, dy = b.y - y;
        if (Math.sqrt(dx * dx + dy * dy) < BALL_R * 2.2) return false;
    }
    return true;
}

function shoot() {
    const dx   = cueInput.aimX - cueBall.x;
    const dy   = cueInput.aimY - cueBall.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    cueBall.vx = (dx / dist) * cueInput.power;
    cueBall.vy = (dy / dist) * cueInput.power;
    cueInput.power   = 0;
    cueInput.dragging = false;
    gameState.phase   = 'moving';
    gameState.pocketedThisTurn = [];
    gameState.firstHitType     = null;
    gameState.cuePocketed      = false;
    gameState.message          = '';
}

// ── Rendering ─────────────────────────────────────────────────────
function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawTable();
    drawPockets();
    drawBalls();

    if (gameState.phase === 'aiming' && cueBall && !cueBall.pocketed) {
        drawAimLine();
        drawCue();
    }

    if (gameState.phase === 'placing_cue') {
        drawGhostCueBall();
    }

    drawHUD();
}

// ── Table ─────────────────────────────────────────────────────────
function drawTable() {
    // Outer rail wood
    const rg = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    rg.addColorStop(0, '#4a2e1a');
    rg.addColorStop(0.5, '#6b3d22');
    rg.addColorStop(1, '#3a2010');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.roundRect(0, 0, CANVAS_W, CANVAS_H, 18);
    ctx.fill();

    // Wood grain highlight
    ctx.strokeStyle = 'rgba(255,200,120,0.08)';
    ctx.lineWidth = 1;
    for (let y = 5; y < CANVAS_H; y += 18) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }

    // Rail inner border (dark)
    ctx.strokeStyle = '#1a0e07';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(2, 2, CANVAS_W - 4, CANVAS_H - 4, 17);
    ctx.stroke();

    // Felt surface
    const fg = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, 30, CANVAS_W / 2, CANVAS_H / 2, 500);
    fg.addColorStop(0, '#207040');
    fg.addColorStop(1, '#0e4a28');
    ctx.fillStyle = fg;
    ctx.fillRect(TABLE.left, TABLE.top, TABLE.width, TABLE.height);

    // Head string line (baulk line) – 1/4 mark
    const headX = TABLE.left + TABLE.width * 0.25;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(headX, TABLE.top);
    ctx.lineTo(headX, TABLE.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Foot spot & head spot
    const dotStyle = 'rgba(255,255,255,0.2)';
    [[TABLE.left + TABLE.width * 0.65, TABLE.top + TABLE.height * 0.5],
     [headX, TABLE.top + TABLE.height * 0.5]].forEach(([sx, sy]) => {
        ctx.fillStyle = dotStyle;
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    // Rail cushion inset shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 6;
    ctx.strokeRect(TABLE.left, TABLE.top, TABLE.width, TABLE.height);
}

// ── Pockets ───────────────────────────────────────────────────────
function drawPockets() {
    for (const p of POCKETS) {
        // Dark hole
        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_R + 2, 0, Math.PI * 2);
        ctx.fillStyle = '#080808';
        ctx.fill();
        // Depth gradient
        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, POCKET_R + 2);
        pg.addColorStop(0, 'rgba(0,0,0,0.95)');
        pg.addColorStop(0.7, 'rgba(10,10,10,0.7)');
        pg.addColorStop(1, 'rgba(30,20,10,0.4)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_R + 2, 0, Math.PI * 2);
        ctx.fillStyle = pg;
        ctx.fill();
    }
}

// ── Balls ─────────────────────────────────────────────────────────
function drawBalls() {
    for (const b of balls) {
        if (b.pocketed) continue;
        drawBall(b);
    }
}

function drawBall(b) {
    const { x, y, radius: r, id, color, stripe } = b;

    // Drop shadow
    ctx.beginPath();
    ctx.arc(x + 2.5, y + 3, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fill();

    if (stripe && id !== 0) {
        // White base
        const wg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
        wg.addColorStop(0, '#ffffff');
        wg.addColorStop(1, '#ddd');
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = wg;
        ctx.fill();
        // Stripe band clipped
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = color;
        ctx.fillRect(x - r, y - r * 0.42, r * 2, r * 0.84);
        ctx.restore();
    } else {
        // Solid ball with shading
        const sg = ctx.createRadialGradient(x - r * 0.35, y - r * 0.38, r * 0.05, x, y, r);
        sg.addColorStop(0, lighten(color, 70));
        sg.addColorStop(0.5, color);
        sg.addColorStop(1, darken(color, 50));
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = sg;
        ctx.fill();
    }

    // Number circle
    if (id !== 0) {
        ctx.beginPath();
        ctx.arc(x, y, r * 0.44, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.93)';
        ctx.fill();
        ctx.fillStyle = '#222';
        const fs = id >= 10 ? r * 0.48 : r * 0.58;
        ctx.font = `bold ${fs}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(id, x, y + 0.5);
    }

    // Specular shine
    ctx.beginPath();
    ctx.ellipse(x - r * 0.28, y - r * 0.33, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();

    // Outline
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
}

function lighten(hex, v) {
    const r = Math.min(255, parseInt(hex.slice(1,3),16)+v);
    const g = Math.min(255, parseInt(hex.slice(3,5),16)+v);
    const b = Math.min(255, parseInt(hex.slice(5,7),16)+v);
    return `rgb(${r},${g},${b})`;
}
function darken(hex, v) {
    const r = Math.max(0, parseInt(hex.slice(1,3),16)-v);
    const g = Math.max(0, parseInt(hex.slice(3,5),16)-v);
    const b = Math.max(0, parseInt(hex.slice(5,7),16)-v);
    return `rgb(${r},${g},${b})`;
}

// ── Cue stick & aim ───────────────────────────────────────────────
function drawAimLine() {
    const dx = cueInput.aimX - cueBall.x;
    const dy = cueInput.aimY - cueBall.y;
    const d  = Math.sqrt(dx * dx + dy * dy);
    if (d < 2) return;
    const nx = dx / d, ny = dy / d;

    ctx.save();
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = 'rgba(255,255,200,0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cueBall.x + nx * (BALL_R + 2), cueBall.y + ny * (BALL_R + 2));
    ctx.lineTo(cueBall.x + nx * 420, cueBall.y + ny * 420);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

function drawCue() {
    const dx = cueInput.aimX - cueBall.x;
    const dy = cueInput.aimY - cueBall.y;
    const d  = Math.sqrt(dx * dx + dy * dy);
    if (d < 2) return;
    const nx = -dx / d, ny = -dy / d;  // pointing AWAY from aim

    const pullback = cueInput.dragging ? BALL_R + 8 + cueInput.power * 3.5 : BALL_R + 6;

    // Tip of cue (closest to ball)
    const tipX = cueBall.x + nx * pullback;
    const tipY = cueBall.y + ny * pullback;
    // Butt of cue
    const endX = tipX + nx * 210;
    const endY = tipY + ny * 210;

    ctx.save();
    // Cue shaft gradient (tip thin → butt thick)
    const cg = ctx.createLinearGradient(tipX, tipY, endX, endY);
    cg.addColorStop(0, '#E8D090');
    cg.addColorStop(0.25, '#C8900C');
    cg.addColorStop(0.7, '#7B4010');
    cg.addColorStop(1, '#3a1a08');

    // Draw as tapered path
    const perp = { x: -ny, y: nx };  // perpendicular
    const tipW = 2, buttW = 7;
    ctx.beginPath();
    ctx.moveTo(tipX + perp.x * tipW,  tipY + perp.y * tipW);
    ctx.lineTo(endX + perp.x * buttW, endY + perp.y * buttW);
    ctx.lineTo(endX - perp.x * buttW, endY - perp.y * buttW);
    ctx.lineTo(tipX - perp.x * tipW,  tipY - perp.y * tipW);
    ctx.closePath();
    ctx.fillStyle = cg;
    ctx.fill();

    // Chalk tip
    ctx.beginPath();
    ctx.moveTo(tipX + perp.x * tipW,  tipY + perp.y * tipW);
    ctx.lineTo(tipX + nx * 10 + perp.x * 1, tipY + ny * 10 + perp.y * 1);
    ctx.lineTo(tipX + nx * 10 - perp.x * 1, tipY + ny * 10 - perp.y * 1);
    ctx.lineTo(tipX - perp.x * tipW,  tipY - perp.y * tipW);
    ctx.closePath();
    ctx.fillStyle = '#3a88cc';
    ctx.fill();

    ctx.restore();
}

// ── Power bar ─────────────────────────────────────────────────────
function drawHUD() {
    // Power bar (only while dragging)
    if (cueInput.dragging) {
        const bx = 16, by = TABLE.top, bw = 16, bh = TABLE.height;
        const pct = cueInput.power / MAX_POWER;

        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.fill();

        const fillH = bh * pct;
        const pg = ctx.createLinearGradient(0, by + bh, 0, by);
        pg.addColorStop(0, '#22cc44');
        pg.addColorStop(0.55, '#cccc22');
        pg.addColorStop(1, '#cc2222');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.roundRect(bx, by + bh - fillH, bw, fillH, 4);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PWR', bx + bw / 2, by + bh + 14);
    }

    // Player panels
    drawPlayerPanel(1, 8,              4, 210, 34);
    drawPlayerPanel(2, CANVAS_W - 218, 4, 210, 34);

    // Message bar
    if (gameState.message) {
        const mw = 340, mh = 30;
        const mx = (CANVAS_W - mw) / 2, my = 4;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, 8); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(gameState.message, CANVAS_W / 2, my + mh / 2 + 4.5);
    }

    // Place cue ball hint
    if (gameState.phase === 'placing_cue') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        const hw = 390, hh = 28;
        const hx = (CANVAS_W - hw) / 2, hy = CANVAS_H - hh - 6;
        ctx.beginPath(); ctx.roundRect(hx, hy, hw, hh, 8); ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎱 Click anywhere on the table to place the cue ball', CANVAS_W / 2, hy + hh / 2 + 4.5);
    }

    // Game over overlay
    if (gameState.phase === 'gameover') {
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 52px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Player ${gameState.winner} Wins! 🎱`, CANVAS_W / 2, CANVAS_H / 2 - 18);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '20px Arial';
        ctx.fillText('Press Restart to play again', CANVAS_W / 2, CANVAS_H / 2 + 28);
    }
}

function drawPlayerPanel(player, px, py, pw, ph) {
    const active = gameState.turn === player &&
        (gameState.phase === 'aiming' || gameState.phase === 'placing_cue');
    const type   = player === 1 ? gameState.player1Type : gameState.player2Type;
    const count  = gameState.pocketedBalls[player].filter(id => id !== 8).length;

    ctx.fillStyle = active ? 'rgba(255,215,0,0.2)' : 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 7); ctx.fill();

    ctx.strokeStyle = active ? '#FFD700' : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = active ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 7); ctx.stroke();

    // Mini ball dots showing player type
    const dotX = px + 10;
    const dotY = py + ph / 2;
    if (type) {
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(dotX + i * 13, dotY, 5, 0, Math.PI * 2);
            ctx.fillStyle = type === 'solids' ? '#F5C800' : '#1A3FCC';
            ctx.fill();
            if (type === 'stripes') {
                ctx.save();
                ctx.beginPath();
                ctx.arc(dotX + i * 13, dotY, 5, 0, Math.PI * 2);
                ctx.clip();
                ctx.fillStyle = '#FAFAFA';
                ctx.fillRect(dotX + i * 13 - 5, dotY - 2, 10, 4);
                ctx.restore();
            }
        }
    }

    const labelX = type ? dotX + 48 : px + 10;
    ctx.fillStyle = active ? '#FFD700' : 'rgba(255,255,255,0.85)';
    ctx.font = `bold 13px Arial`;
    ctx.textAlign = 'left';
    const typeLabel = type ? type.charAt(0).toUpperCase() + type.slice(1) : '?';
    ctx.fillText(`P${player}: ${typeLabel}  ✓ ${count}`, labelX, py + ph / 2 + 5);
}

// ── Ghost cue ball (when placing) ────────────────────────────────
function drawGhostCueBall() {
    const valid = isValidCuePlacement(mousePos.x, mousePos.y);
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(mousePos.x, mousePos.y, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = valid ? '#FFFFF0' : '#ff4444';
    ctx.fill();
    ctx.strokeStyle = valid ? '#aaa' : '#cc0000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
}

window.addEventListener('load', init);
