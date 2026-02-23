// ── Constants ──────────────────────────────────────────────────
const CANVAS_W  = 920;
const CANVAS_H  = 520;
const RAIL_W    = 44;
const BALL_R    = 13;
const MAX_POWER = 26;

// Physics tuning
const SUBSTEPS            = 5;      // integration substeps per frame
const ROLLING_FRICTION    = 0.9865; // target velocity decay per full frame
const BALL_RESTITUTION    = 0.92;   // energy retention on ball–ball hit
const CUSHION_RESTITUTION = 0.72;   // energy retention on cushion hit
const CUSHION_SIDE_GRIP   = 0.045;  // parallel-velocity loss on cushion
const MIN_SPEED           = 0.06;   // stop threshold (speed magnitude)
const POCKET_ABSORB_R     = 19;     // hard absorption radius from pocket centre
const POCKET_FUNNEL_R     = 36;     // funnel-attraction start radius
const POCKET_PULL         = 0.14;   // funnel pull strength

// Derived (do not edit)
const SUBSTEP_FRICTION = Math.pow(ROLLING_FRICTION, 1 / SUBSTEPS);
const POCKET_R = POCKET_ABSORB_R; // alias used by renderer

const TABLE = {
    left:   RAIL_W,
    top:    RAIL_W,
    right:  CANVAS_W - RAIL_W,
    bottom: CANVAS_H - RAIL_W,
    get width()  { return this.right  - this.left; },
    get height() { return this.bottom - this.top;  },
};

// 6 pocket positions
const POCKETS = [
    { x: TABLE.left  + 2,               y: TABLE.top    + 2  }, // TL
    { x: TABLE.left  + TABLE.width / 2, y: TABLE.top    - 3  }, // TM
    { x: TABLE.right - 2,               y: TABLE.top    + 2  }, // TR
    { x: TABLE.left  + 2,               y: TABLE.bottom - 2  }, // BL
    { x: TABLE.left  + TABLE.width / 2, y: TABLE.bottom + 3  }, // BM
    { x: TABLE.right - 2,               y: TABLE.bottom - 2  }, // BR
];

// Ball visual info
const BALL_INFO = {
    0:  { color: '#FFFFF0', stripe: false },
    1:  { color: '#F5C800', stripe: false },
    2:  { color: '#1A3FCC', stripe: false },
    3:  { color: '#CC2020', stripe: false },
    4:  { color: '#7B1FA2', stripe: false },
    5:  { color: '#E65100', stripe: false },
    6:  { color: '#1B7B2F', stripe: false },
    7:  { color: '#8B0000', stripe: false },
    8:  { color: '#111111', stripe: false },
    9:  { color: '#F5C800', stripe: true  },
    10: { color: '#1A3FCC', stripe: true  },
    11: { color: '#CC2020', stripe: true  },
    12: { color: '#7B1FA2', stripe: true  },
    13: { color: '#E65100', stripe: true  },
    14: { color: '#1B7B2F', stripe: true  },
    15: { color: '#8B0000', stripe: true  },
};

// ── State ──────────────────────────────────────────────────────
let balls   = [];
let cueBall = null;

let gameState = {
    phase: 'aiming',   // 'aiming' | 'moving' | 'placing_cue' | 'gameover'
    turn: 1,
    player1Type:   null,   // 'solids' | 'stripes' | null
    player2Type:   null,
    typeAssigned:  false,
    pocketedThisTurn: [],
    pocketedBalls: { 1: [], 2: [] },
    firstHitType:  null,   // 'solid' | 'stripe' | '8' | null
    cuePocketed:   false,
    winner:        null,
    message:       '',
    breakShot:     true,
};

let cueInput = {
    dragging:    false,
    dragStartX:  0,
    dragStartY:  0,
    aimX:        CANVAS_W / 2,
    aimY:        CANVAS_H / 2,
    power:       0,
};

// ── Ball factory ───────────────────────────────────────────────
function createBall(num, x, y) {
    return {
        id:      num,
        x, y,
        vx: 0,  vy: 0,
        radius:  BALL_R,
        pocketed: false,
        color:   BALL_INFO[num].color,
        stripe:  BALL_INFO[num].stripe,
    };
}

// ── Rack & init ────────────────────────────────────────────────
function initBalls() {
    balls = [];

    const cx  = TABLE.left + TABLE.width  * 0.65;
    const cy  = TABLE.top  + TABLE.height * 0.5;
    const sp  = BALL_R * 2.06;
    const c30 = Math.cos(Math.PI / 6);

    // Standard 8-ball rack: col 0 = apex
    const rack = [
        [1],
        [2,  9],
        [3,  8,  10],
        [4,  14, 11, 7],
        [6,  13, 15, 12, 5],
    ];

    for (let col = 0; col < rack.length; col++) {
        const row = rack[col];
        for (let r = 0; r < row.length; r++) {
            const num = row[r];
            const bx  = cx + col * sp * c30;
            const by  = cy + (r - (row.length - 1) / 2) * sp;
            balls.push(createBall(num, bx, by));
        }
    }

    // Cue ball – left quarter
    const cb = createBall(0, TABLE.left + TABLE.width * 0.25, cy);
    balls.push(cb);
    cueBall = cb;
}

function resetState() {
    gameState = {
        phase: 'aiming',
        turn: 1,
        player1Type:  null,
        player2Type:  null,
        typeAssigned: false,
        pocketedThisTurn: [],
        pocketedBalls: { 1: [], 2: [] },
        firstHitType: null,
        cuePocketed:  false,
        winner:       null,
        message:      'Break shot – Player 1',
        breakShot:    true,
    };
    cueInput = {
        dragging: false,
        dragStartX: 0, dragStartY: 0,
        aimX: CANVAS_W / 2, aimY: CANVAS_H / 2,
        power: 0,
    };
}
