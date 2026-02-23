// ── Physics update ─────────────────────────────────────────────
// Runs SUBSTEPS mini-steps per animation frame.
// Each substep: integrate → funnel → walls → ball-ball → pockets.
// This eliminates tunnelling, gives accurate chain-collision cascades
// in dense racks, and allows smooth pocket-funnel attraction.

function updatePhysics() {
    for (let s = 0; s < SUBSTEPS; s++) {
        _substepIntegrate();
        _substepPocketFunnel();
        _substepWalls();
        _substepBallBall();
        _substepCheckPockets();
    }
}

// ── 1. Integrate position + rolling friction ───────────────────
function _substepIntegrate() {
    for (const b of balls) {
        if (b.pocketed) continue;

        // Advance position by 1/SUBSTEPS of the current velocity
        b.x += b.vx / SUBSTEPS;
        b.y += b.vy / SUBSTEPS;

        // Apply per-substep rolling friction
        b.vx *= SUBSTEP_FRICTION;
        b.vy *= SUBSTEP_FRICTION;

        // Stop ball when speed is negligible (magnitude check avoids
        // the axis-locking artefact of separate vx/vy thresholds)
        const spd2 = b.vx * b.vx + b.vy * b.vy;
        if (spd2 < MIN_SPEED * MIN_SPEED) {
            b.vx = 0;
            b.vy = 0;
        }
    }
}

// ── 2. Pocket funnel ───────────────────────────────────────────
// Balls within the funnel radius are gently pulled toward the pocket
// centre. This simulates the curved leather pocket-liner and the
// "jaw" guide rails that direct borderline shots in.
function _substepPocketFunnel() {
    for (const b of balls) {
        if (b.pocketed) continue;
        for (const p of POCKETS) {
            const dx   = p.x - b.x;
            const dy   = p.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < POCKET_FUNNEL_R && dist > POCKET_ABSORB_R) {
                // Quadratic falloff: stronger pull the closer the ball
                const t    = 1 - dist / POCKET_FUNNEL_R;
                const pull = (POCKET_PULL * t * t) / SUBSTEPS;
                b.vx += (dx / dist) * pull;
                b.vy += (dy / dist) * pull;
            }
        }
    }
}

// ── 3. Cushion (wall) bounce ───────────────────────────────────
// CUSHION_RESTITUTION: energy kept in the normal axis.
// CUSHION_SIDE_GRIP  : slight parallel velocity loss (cushion grips
//                      the ball on contact, giving realistic clip angles).
function _substepWalls() {
    for (const b of balls) {
        if (b.pocketed) continue;

        const e    = CUSHION_RESTITUTION;
        const grip = 1 - CUSHION_SIDE_GRIP;

        if (b.x - b.radius < TABLE.left) {
            b.x  = TABLE.left + b.radius;
            b.vx = Math.abs(b.vx) * e;
            b.vy *= grip;
        }
        if (b.x + b.radius > TABLE.right) {
            b.x  = TABLE.right - b.radius;
            b.vx = -Math.abs(b.vx) * e;
            b.vy *= grip;
        }
        if (b.y - b.radius < TABLE.top) {
            b.y  = TABLE.top + b.radius;
            b.vy = Math.abs(b.vy) * e;
            b.vx *= grip;
        }
        if (b.y + b.radius > TABLE.bottom) {
            b.y  = TABLE.bottom - b.radius;
            b.vy = -Math.abs(b.vy) * e;
            b.vx *= grip;
        }
    }
}

// ── 4. Ball–ball collisions ────────────────────────────────────
// Iterated 3× per substep for pile-up stability.
// Uses proper coefficient-of-restitution impulse for equal-mass balls:
//   impulse magnitude  j = (1 + e) / 2 × v_rel · n̂
// This perfectly conserves momentum and dissipates (1−e²) of the
// relative KE, matching real billiard ball behaviour.
function _substepBallBall() {
    for (let iter = 0; iter < 3; iter++) {
        for (let i = 0; i < balls.length - 1; i++) {
            if (balls[i].pocketed) continue;
            for (let j = i + 1; j < balls.length; j++) {
                if (balls[j].pocketed) continue;
                _resolveBallPair(balls[i], balls[j]);
            }
        }
    }
}

function _resolveBallPair(a, b) {
    const dx    = b.x - a.x;
    const dy    = b.y - a.y;
    const dist2 = dx * dx + dy * dy;
    const minD  = a.radius + b.radius;

    if (dist2 >= minD * minD || dist2 < 0.0001) return;

    const dist = Math.sqrt(dist2);
    const nx   = dx / dist;
    const ny   = dy / dist;

    // Positional correction – velocity-weighted split so the ball
    // moving into the other does proportionally more of the work
    const overlap = minD - dist;
    const aSpd    = Math.abs(a.vx * nx + a.vy * ny);
    const bSpd    = Math.abs(b.vx * nx + b.vy * ny);
    const total   = aSpd + bSpd + 1e-6;
    a.x -= nx * overlap * (bSpd / total);
    a.y -= ny * overlap * (bSpd / total);
    b.x += nx * overlap * (aSpd / total);
    b.y += ny * overlap * (aSpd / total);

    // Velocity impulse along collision normal
    const dvx   = a.vx - b.vx;
    const dvy   = a.vy - b.vy;
    const vDotN = dvx * nx + dvy * ny;
    if (vDotN <= 0) return; // already separating

    // j = (1 + e) / 2 × vDotN  (equal mass, coefficient-of-restitution)
    const j = vDotN * (1 + BALL_RESTITUTION) * 0.5;
    a.vx -= j * nx;
    a.vy -= j * ny;
    b.vx += j * nx;
    b.vy += j * ny;

    // Record first cue-ball contact for foul detection
    if (gameState.firstHitType === null) {
        const other = (a.id === 0) ? b : (b.id === 0) ? a : null;
        if (other) {
            gameState.firstHitType = other.id === 8 ? '8'
                : other.stripe ? 'stripe' : 'solid';
        }
    }
}

// ── 5. Pocket absorption ───────────────────────────────────────
// A ball is absorbed once its centre is within POCKET_ABSORB_R of
// the pocket centre. Instant stop and mark pocketed.
function _substepCheckPockets() {
    for (const b of balls) {
        if (b.pocketed) continue;
        for (const p of POCKETS) {
            const dx = b.x - p.x;
            const dy = b.y - p.y;
            if (dx * dx + dy * dy < POCKET_ABSORB_R * POCKET_ABSORB_R) {
                b.pocketed = true;
                b.vx = 0;
                b.vy = 0;
                if (!gameState.pocketedThisTurn.includes(b.id)) {
                    gameState.pocketedThisTurn.push(b.id);
                }
                if (b.id === 0) gameState.cuePocketed = true;
                break;
            }
        }
    }
}

// ── Helper: are all balls stopped? ────────────────────────────
function allStopped() {
    return balls.every(b => b.pocketed || (b.vx === 0 && b.vy === 0));
}
