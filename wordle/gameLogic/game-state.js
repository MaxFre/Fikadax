// Game state
let targetWord = '';
let currentRow = 0;
let currentTile = 0;
let gameOver = false;
let guesses = [];

// Streak tracking
let currentStreak = 0;
let bestStreak = 0;

// Load streaks from localStorage
function loadStreaks() {
    const saved = localStorage.getItem('wordleStreaks');
    if (saved) {
        const data = JSON.parse(saved);
        currentStreak = data.currentStreak || 0;
        bestStreak = data.bestStreak || 0;
    }
}

// Save streaks to localStorage
function saveStreaks() {
    localStorage.setItem('wordleStreaks', JSON.stringify({
        currentStreak,
        bestStreak
    }));
}

// Update streak display
function updateStreakDisplay() {
    document.getElementById('current-streak').textContent = currentStreak;
    document.getElementById('best-streak').textContent = bestStreak;
}

// Word list - common 5-letter words
const wordList = [
    'BREAD', 'CRANE', 'CRISP', 'DANCE', 'DREAM', 'EARTH', 'FLAME', 'GRACE', 'HEART', 'HORSE',
    'HOUSE', 'LIGHT', 'MAGIC', 'MONEY', 'MOUSE', 'MUSIC', 'NIGHT', 'OCEAN', 'PEACE', 'PLANT',
    'POWER', 'QUEEN', 'RIVER', 'ROYAL', 'SHINE', 'SMILE', 'SPACE', 'SPORT', 'STONE', 'STORM',
    'SWEET', 'TABLE', 'TIGER', 'TRAIN', 'TRUST', 'WATER', 'WHALE', 'WORLD', 'YOUTH', 'ANGEL',
    'BRAVE', 'CHAIR', 'CLOUD', 'CROWN', 'FIELD', 'FRUIT', 'GIANT', 'GLOBE', 'GRAND', 'GREEN',
    'HAPPY', 'IMAGE', 'JUICE', 'LAUGH', 'LEARN', 'LUCKY', 'MARCH', 'METAL', 'NOBLE', 'OLIVE',
    'PARTY', 'PIANO', 'PRIDE', 'PROVE', 'QUICK', 'QUIET', 'RADIO', 'RANGE', 'REACH', 'READY',
    'RELAX', 'ROUND', 'SCALE', 'SCENE', 'SCOPE', 'SENSE', 'SHARE', 'SHARP', 'SHELF', 'SHELL',
    'SHIFT', 'SHOCK', 'SHORE', 'SHORT', 'SIGHT', 'SKILL', 'SLEEP', 'SMALL', 'SMART', 'SOLID',
    'SOUND', 'SOUTH', 'SPARE', 'SPEAK', 'SPEED', 'SPEND', 'SPLIT', 'STAFF', 'STAGE', 'STAND',
    'START', 'STATE', 'STEAM', 'STEEL', 'STICK', 'STILL', 'STOCK', 'STORE', 'STORY', 'STUDY',
    'STYLE', 'SUGAR', 'SUPER', 'TASTE', 'TEACH', 'THANK', 'THEME', 'THINK', 'THIRD', 'THROW',
    'TITLE', 'TODAY', 'TOTAL', 'TOUCH', 'TOWER', 'TRACK', 'TRADE', 'TRAIL', 'TREAT', 'TREND',
    'TRIAL', 'TRICK', 'TRUCK', 'TRULY', 'TRUNK', 'TRUTH', 'UNCLE', 'UNDER', 'UNION', 'UNITY',
    'UPPER', 'URBAN', 'VALUE', 'VIDEO', 'VINYL', 'VISIT', 'VITAL', 'VOICE', 'WASTE', 'WATCH',
    'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WOMAN', 'WORTH', 'WRITE', 'WRONG',
    'ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN',
    'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIGN', 'ALIKE', 'ALIVE', 'ALLOW',
    'ALONE', 'ALONG', 'ALTER', 'ANGLE', 'ANGRY', 'APART', 'APPLE', 'APPLY', 'ARENA', 'ARGUE',
    'ARISE', 'ARRAY', 'ARROW', 'ASIDE', 'ASSET', 'AVOID', 'AWAKE', 'AWARE', 'BADLY', 'BAKER',
    'BASIC', 'BASIN', 'BASIS', 'BATCH', 'BEACH', 'BEAST', 'BEGAN', 'BEING', 'BENCH', 'BIKES',
    'BIRTH', 'BLACK', 'BLADE', 'BLAME', 'BLANK', 'BLAST', 'BLAZE', 'BLEED', 'BLEND', 'BLESS',
    'BLIND', 'BLINK', 'BLOCK', 'BLOOD', 'BLOOM', 'BLOWN', 'BLUES', 'BLUNT', 'BLUSH', 'BOARD',
    'BOAST', 'BOATS', 'BONUS', 'BOOST', 'BOOTH', 'BOOTS', 'BOUND', 'BOWLS', 'BOXES', 'BRAIN',
    'BRAKE', 'BRAND', 'BRASS', 'BREAK', 'BREED', 'BRICK', 'BRIDE', 'BRIEF', 'BRING', 'BRINK',
    'BRISK', 'BROAD', 'BROKE', 'BROOK', 'BROOM', 'BROWN', 'BRUSH', 'BUILD', 'BUILT', 'BULKY',
    'BUNCH', 'BUNNY', 'BURNS', 'BURNT', 'BURST', 'BUSES', 'BUYER', 'CABIN', 'CABLE', 'CACHE',
    'CAMEL', 'CAMPS', 'CANAL', 'CANDY', 'CANOE', 'CARGO', 'CAROL', 'CARRY', 'CARVE', 'CASES',
    'CATCH', 'CATER', 'CAUSE', 'CEDAR', 'CHAIN', 'CHAOS', 'CHARM', 'CHART', 'CHASE', 'CHEAP',
    'CHEAT', 'CHECK', 'CHEEK', 'CHEER', 'CHESS', 'CHEST', 'CHIEF', 'CHILD', 'CHILL', 'CHINA',
    'CHIPS', 'CHOKE', 'CHORD', 'CHOSE', 'CHUCK', 'CHUNK', 'CIDER', 'CIGAR', 'CIVIC', 'CIVIL',
    'CLAIM', 'CLAMP', 'CLASH', 'CLASS', 'CLEAN', 'CLEAR', 'CLERK', 'CLICK', 'CLIFF', 'CLIMB',
    'CLING', 'CLOAK', 'CLOCK', 'CLONE', 'CLOSE', 'CLOTH', 'CLOWN', 'CLUBS', 'CLUES', 'COACH',
    'COALS', 'COAST', 'COATS', 'COCOA', 'CODES', 'COINS', 'COLON', 'COLOR', 'COMET', 'COMIC',
    'COMMA', 'COUCH', 'COUGH', 'COULD', 'COUNT', 'COUPE', 'COURT', 'COVEN', 'COVER', 'CRAFT',
    'CRANK', 'CRASH', 'CRATE', 'CRAVE', 'CRAWL', 'CRAZE', 'CRAZY', 'CREAK', 'CREAM', 'CREED',
    'CREEK', 'CREEP', 'CREST', 'CRIME', 'CROAK', 'CROOK', 'CROPS', 'CROSS', 'CROWD', 'CRUDE',
    'CRUEL', 'CRUMB', 'CRUSH', 'CRUST', 'CUBIC', 'CUPID', 'CURLY', 'CURRY', 'CURSE', 'CURVE',
    'CYCLE', 'DADDY', 'DAILY', 'DAIRY', 'DAISY', 'DATED', 'DEALT', 'DEATH', 'DEBIT', 'DEBUT',
    'DECAY', 'DECOR', 'DECOY', 'DELAY', 'DELTA', 'DEMON', 'DENSE', 'DEPOT', 'DEPTH', 'DERBY',
    'DESKS', 'DEVIL', 'DIARY', 'DINER', 'DIRTY', 'DISCO', 'DITCH', 'DIVER', 'DIZZY', 'DODGE',
    'DOING', 'DOLLS', 'DONOR', 'DONUT', 'DOORS', 'DOUBT', 'DOUGH', 'DOVES', 'DOZEN', 'DRAFT',
    'DRAIN', 'DRAKE', 'DRAMA', 'DRANK', 'DRAPE', 'DRAWL', 'DRAWN', 'DREAD', 'DRESS', 'DRIED',
    'DRIFT', 'DRILL', 'DRINK', 'DRIVE', 'DRONE', 'DROOL', 'DROPS', 'DROVE', 'DROWN', 'DRUGS',
    'DRUMS', 'DRUNK', 'DRYER', 'DUCKS', 'DUNES', 'DUSTY', 'DUTCH', 'DUVET', 'DWARF', 'DWELL',
    'DYING', 'EAGER', 'EAGLE', 'EARLY', 'EASED', 'EASEL', 'EATEN', 'EATER', 'EBONY', 'EDGES',
    'EERIE', 'EIGHT', 'EJECT', 'ELBOW', 'ELDER', 'ELECT', 'ELITE', 'EMBED', 'EMBER', 'EMPTY',
    'ENACT', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'ENVOY', 'EPOCH', 'EQUAL', 'EQUIP', 'ERASE',
    'ERROR', 'ERUPT', 'ESSAY', 'ETHER', 'ETHIC', 'EVENT', 'EVERY', 'EVICT', 'EXACT', 'EXAMS',
    'EXCEL', 'EXIST', 'EXITS', 'EXILE', 'EXPEL', 'EXTRA', 'FABLE', 'FACED', 'FACES', 'FACTS',
    'FADED', 'FAILS', 'FAINT', 'FAIRY', 'FAITH', 'FAKER', 'FALLS', 'FALSE', 'FAMED', 'FANCY',
    'FANGS', 'FARMS', 'FATAL', 'FAULT', 'FAUNA', 'FAVOR', 'FEAST', 'FEEDS', 'FEELS', 'FENCE',
    'FERRY', 'FETCH', 'FEUDS', 'FEVER', 'FIBER', 'FIEND', 'FIERY', 'FIFTH', 'FIFTY', 'FIGHT',
    'FILED', 'FILLS', 'FILMS', 'FILTH', 'FINAL', 'FINDS', 'FINED', 'FINER', 'FINES', 'FIRED',
    'FIRES', 'FIRMS', 'FIRST', 'FISHY', 'FISTS', 'FIXED', 'FIXES', 'FIZZY', 'FLAGS', 'FLAIR',
    'FLAKE', 'FLANK', 'FLARE', 'FLASH', 'FLASK', 'FLATS', 'FLAWS', 'FLEET', 'FLESH', 'FLICK',
    'FLIER', 'FLIES', 'FLING', 'FLINT', 'FLIPS', 'FLIRT', 'FLOAT', 'FLOCK', 'FLOOD', 'FLOOR',
    'FLOPS', 'FLORA', 'FLOUR', 'FLOWN', 'FLOWS', 'FLUID', 'FLUKE', 'FLUNG', 'FLUNK', 'FLUSH',
    'FLUTE', 'FOAMS', 'FOCAL', 'FOCUS', 'FOGGY', 'FOILS', 'FOLDS', 'FOLKS', 'FONTS', 'FOODS',
    'FOOLS', 'FORAY', 'FORCE', 'FORGE', 'FORGO', 'FORKS', 'FORMS', 'FORTH', 'FORTY', 'FORUM',
    'FOUND', 'FOYER', 'FRAIL', 'FRAME', 'FRANK', 'FRAUD', 'FREAK', 'FREED', 'FRESH', 'FRIAR',
    'FRIED', 'FRIES', 'FRILL', 'FRISK', 'FROGS', 'FRONT', 'FROST', 'FROWN', 'FROZE', 'FRYER',
    'FUDGE', 'FUELS', 'FULLY', 'FUMES', 'FUNDS', 'FUNGI', 'FUNKY', 'FUNNY', 'FURRY', 'FUSED',
    'FUSSY', 'FUZZY', 'GAINS', 'GAMER', 'GAMES', 'GAMMA', 'GANGS', 'GAUGE', 'GAVEL', 'GAZED',
    'GAZES', 'GEARS', 'GEESE', 'GENES', 'GENIE', 'GENRE', 'GHOST', 'GIFTS', 'GIRLS', 'GIVEN',
    'GIVER', 'GIVES', 'GLADE', 'GLAND', 'GLARE', 'GLASS', 'GLAZE', 'GLEAM', 'GLEAN', 'GLIDE',
    'GLINT', 'GLOOM', 'GLORY', 'GLOSS', 'GLOVE', 'GLUED', 'GOALS', 'GOATS', 'GODLY', 'GOING',
    'GOLDS', 'GOLFS', 'GOODS', 'GOOSE', 'GORGE', 'GOUGE', 'GOWNS', 'GRADE', 'GRAIN', 'GRANT',
    'GRAPE', 'GRAPH', 'GRASP', 'GRASS', 'GRATE', 'GRAVE', 'GRAVY', 'GRAZE', 'GREAT', 'GREED',
    'GREEK', 'GREET', 'GRIEF', 'GRILL', 'GRIME', 'GRIND', 'GRINS', 'GRIPS', 'GROAN', 'GROIN',
    'GROOM', 'GROPE', 'GROSS', 'GROUP', 'GROVE', 'GROWN', 'GROWL', 'GROWS', 'GRUBS', 'GRUEL',
    'GRUFF', 'GRUNT', 'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'GUILD', 'GUILT', 'GUISE', 'GULCH',
    'GULFS', 'GULLS', 'GUMMY', 'GUSTS', 'GUSTY', 'GYPSY', 'HABIT', 'HAIRS', 'HAIRY', 'HALLS',
    'HANDS', 'HANDY', 'HANGS', 'HAPPY', 'HARSH', 'HASTE', 'HASTY', 'HATCH', 'HATED', 'HAULS',
    'HAUNT', 'HAVEN', 'HAVEN', 'HAWKS', 'HAZEL', 'HEADS', 'HEALS', 'HEAPS', 'HEARD', 'HEARS',
    'HEATS', 'HEAVY', 'HEDGE', 'HEELS', 'HEIRS', 'HELIX', 'HELLO', 'HELPS', 'HENCE', 'HERBS',
    'HERDS', 'HERON', 'HIDES', 'HIGHS', 'HIKES', 'HILLS', 'HILLY', 'HILTS', 'HINDS', 'HINGE',
    'HINTS', 'HIPPO', 'HITCH', 'HOARD', 'HOBBY', 'HOIST', 'HOLDS', 'HOLES', 'HOLLY', 'HOMES',
    'HONED', 'HONOR', 'HOODS', 'HOOFS', 'HOOKS', 'HOOPS', 'HOPED', 'HOPES', 'HORNS', 'HOSED',
    'HOSES', 'HOSTS', 'HOTEL', 'HOUND', 'HOURS', 'HOVER', 'HOWLS', 'HUFFY', 'HULKS', 'HUMAN',
    'HUMID', 'HUMOR', 'HUMPS', 'HUNTS', 'HURLS', 'HURRY', 'HURTS', 'HUSKY', 'INNER', 'INPUT',
    'IRIS', 'IRONS', 'IRONY', 'ISSUE', 'ITEMS', 'IVORY', 'JAILS', 'JEANS', 'JELLY', 'JERKS',
    'JEWEL', 'JIFFY', 'JOINS', 'JOINT', 'JOKER', 'JOKES', 'JOLLY', 'JOLTS', 'JUDGE', 'JUMBO',
    'JUMPS', 'JUNKS', 'JUROR', 'KAPOK', 'KAYAK', 'KEEPS', 'KICKS', 'KILLS', 'KINDS', 'KINGS',
    'KITES', 'KITTY', 'KNACK', 'KNEAD', 'KNEEL', 'KNEES', 'KNELT', 'KNIFE', 'KNOCK', 'KNOTS',
    'KNOWN', 'KNOWS', 'LABEL', 'LABOR', 'LACED', 'LACES', 'LACKS', 'LAKES', 'LAMPS', 'LANDS',
    'LANES', 'LAPEL', 'LAPSE', 'LARGE', 'LASER', 'LATCH', 'LATER', 'LATIN', 'LATHE', 'LAUDS',
    'LAWNS', 'LAYER', 'LEADS', 'LEAFS', 'LEAKS', 'LEAKY', 'LEANS', 'LEAPS', 'LEASE', 'LEASH',
    'LEAST', 'LEAVE', 'LEDGE', 'LEECH', 'LEEKS', 'LEFTS', 'LEGAL', 'LEMON', 'LENDS', 'LENSE',
    'LEPER', 'LEVEL', 'LEVER', 'LIARS', 'LICKS', 'LIFER', 'LIFTS', 'LIMES', 'LIMIT', 'LINED',
    'LINEN', 'LINER', 'LINES', 'LINKS', 'LIONS', 'LISTS', 'LITER', 'LIVED', 'LIVER', 'LIVES',
    'LOADS', 'LOAFS', 'LOAMS', 'LOANS', 'LOBBY', 'LOCAL', 'LOCKS', 'LOCUST', 'LODGE', 'LOFTY'
];

// Valid words for guessing (includes target words)
const validWords = [...wordList];

// Game config
const maxGuesses = 6;
const wordLength = 5;
