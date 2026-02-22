# Memory Card Game - Project Structure

This project is organized into a modular structure for better maintainability and readability.

## Directory Structure

```
index.html (Main entry point)
memoryGame/
├── visuals/
│   ├── base.css           # Base styles, resets, buttons, status messages
│   ├── screens.css        # Main menu, welcome screen, lobby screen
│   ├── game-board.css     # Game board, cards, player scores
│   ├── modals.css         # Modals and toast notifications
│   ├── animations.css     # All keyframe animations
│   └── responsive.css     # Media queries and responsive design
├── gameLogic/
│   ├── game-state.js      # Game state variables and configuration
│   ├── card-logic.js      # Card rendering and matching logic
│   ├── timers.js          # Turn timer logic
│   ├── ui-controller.js   # UI updates, screens, player scores
│   └── event-handlers.js  # Event listeners and handlers
└── multiplayer/
    ├── peer-connection.js # PeerJS setup and connection handling
    └── online-game.js     # Online game logic and synchronization
```

## File Descriptions

### Visual Styles (memoryGame/visuals/)
- **base.css**: Core styling including reset, body, buttons, and status messages
- **screens.css**: Styling for all menu screens (main menu, welcome, lobby)
- **game-board.css**: Game interface including board, cards, and score displays
- **modals.css**: Modal dialogs and toast notifications
- **animations.css**: All CSS animations (keyframes)
- **responsive.css**: Media queries for mobile and accessibility

### Game Logic (memoryGame/gameLogic/)
- **game-state.js**: Global game state variables and configuration
- **card-logic.js**: Card rendering, flipping, and matching logic
- **timers.js**: Turn timer management and display
- **ui-controller.js**: Screen transitions, player UI updates, game initialization
- **event-handlers.js**: DOM event listeners and keyboard shortcuts

### Multiplayer (memoryGame/multiplayer/)
- **peer-connection.js**: PeerJS connection setup, lobby management, room codes
- **online-game.js**: Online game synchronization, message handling, game state broadcasting

## Loading Order

The HTML loads scripts in this specific order:
1. game-state.js (variables must be loaded first)
2. card-logic.js
3. timers.js
4. ui-controller.js
5. peer-connection.js
6. online-game.js
7. event-handlers.js (must be last to attach events to functions)

## Future Extensions

For adding Wordle or other games, create similar subdirectories:
```
wordle/
├── visuals/
├── gameLogic/
└── (any game-specific folders)
```

## Development Notes

- All global game state is centralized in `game-state.js`
- UI updates are separated from game logic for easier testing
- Multiplayer functionality is isolated for optional loading
- Event handlers are in a separate file for easier modification
