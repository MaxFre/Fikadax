# Game Hub

A collection of fun web-based games!

## 🎮 Available Games

### Memory Card Game 🎴
Test your memory by matching pairs of cards!
- Single & Multiplayer modes
- 3 difficulty levels (Easy, Medium, Hard)
- Online multiplayer support with PeerJS
- Timed challenges
- [Play Memory Game](memoryGame/game.html)

### Wordle 🔤
Guess the 5-letter word in 6 tries!
- 160+ word dictionary
- Color-coded hints
- Keyboard support
- Simple and addictive gameplay
- [Play Wordle](wordle/index.html)

## 📁 Project Structure

```
index.html              # Main game hub (game selector)
│
├── memoryGame/         # Memory Card Game
│   ├── game.html       # Game entry point
│   ├── README.md
│   ├── visuals/        # CSS files (base, screens, game-board, modals, animations, responsive)
│   ├── gameLogic/      # JS game logic (game-state, card-logic, timers, ui-controller, event-handlers)
│   └── multiplayer/    # Multiplayer functionality (peer-connection, online-game)
│
└── wordle/             # Wordle Game
    ├── index.html      # Game entry point
    ├── README.md
    ├── visuals/        # CSS styling
    └── gameLogic/      # JS game logic (game-state, game-logic)
```

## 🚀 Getting Started

1. Open `index.html` in your browser
2. Choose a game from the game hub
3. Have fun!

## 🛠️ Technical Details

All games are built with:
- Pure HTML5
- Vanilla JavaScript (no frameworks)
- Modern CSS3 with animations
- Responsive design for mobile and desktop

### Memory Game Features:
- Modular code organization
- PeerJS for real-time multiplayer
- LocalStorage for game state (future enhancement)
- Accessibility features (ARIA labels, keyboard navigation)

### Wordle Features:
- Dictionary validation
- Smart color-coding algorithm
- Smooth animations and transitions
- Mobile-responsive keyboard

## 📝 Notes

- The old `script.js` and `style.css` files can be safely deleted - they're no longer used
- Memory game supports up to 8 players in local/online multiplayer
- Wordle uses a curated list of common 5-letter words

## 🎨 Design

Both games feature:
- Animated gradient backgrounds
- Smooth transitions and animations
- Modern, clean UI design
- Color-coded feedback systems
- Responsive layouts for all screen sizes

## 🔜 Future Games

The modular structure makes it easy to add new games! Simply create a new folder with:
- `/gameLogic` for JavaScript
- `/visuals` for CSS
- `index.html` or `game.html` as entry point
- Add a card to the main `index.html` game hub

Enjoy playing! 🎉
