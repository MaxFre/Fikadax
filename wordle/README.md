# Wordle Game

A fun word-guessing game where you have 6 attempts to guess a 5-letter word.

## How to Play

1. Type a 5-letter word and press Enter
2. The tiles will change colors to show how close your guess was:
   - **Green**: Letter is correct and in the right position
   - **Yellow**: Letter is in the word but in the wrong position
   - **Gray**: Letter is not in the word at all

## Features

- 160+ word dictionary
- Color-coded feedback
- On-screen keyboard
- Keyboard support
- Responsive design
- Smooth animations

## File Structure

```
wordle/
├── index.html         # Main game page
├── gameLogic/
│   ├── game-state.js  # Game state and word list
│   └── game-logic.js  # Game logic and UI updates
└── visuals/
    └── styles.css     # All game styling
```

## Development

The game is built with vanilla JavaScript, HTML, and CSS. No dependencies required except for the main index.html which uses internal styling.
