# Changelog

All notable changes to this project will be documented in this file.

## [0.0.1.0] - 2026-04-13

### Added
- Daily streak banner now appears as a full-width hero above the Sudoku board, replacing the smaller card in the right column. Shows today's puzzle number, current streak, and a prominent "Play today" call-to-action, or a green completion state with countdown to the next puzzle.

### Fixed
- Clicking "Play today" while mid-game now asks for confirmation before discarding your progress.
- Countdown timer no longer shows negative or garbled values after midnight.
- Countdown timer handles DST transitions correctly (no more "25:xx:xx" on fall-back nights).
