# Proposal

## Why

The game review shows the moves that lost the most, once. Seen once, they are easily forgotten. As puzzles that come back, the person practises finding the better move in their own positions.

## What Changes

First slice of the roadmap's "Puzzles from my own games":

- When the review shows the person's costliest moves, each becomes a puzzle: the position before the move, the better move Lichess gave as its one-move solution, the opponent's move before it shown as the last move.
- It joins the review queue as a missed puzzle does: due the next day, then after 3 and 7 days once solved cleanly, then learned.
- Its title says where it is from: "🧩 Your game against Stockfish level 3"; its link opens the game on Lichess at that move.
- The review says so: "These moves come back as puzzles tomorrow."
- Reading the same review again does not add them twice, nor reset ones already under review.
- It does not go to Lichess as a puzzle result, nor count for the progress by theme (it has no Lichess theme).

Left for later slices: a longer line than the one better move, puzzles from correspondence and Chess.com games, a setting to turn it off.

## Capabilities

### New Capabilities
- `game-puzzles`: puzzles made from the person's own mistakes in a reviewed game.

## Impact

- New: `hooks/training/mistakes.ts` (pure), tests in `tests/analysis.test.ts`.
- Edits: `types/index.d.ts` (`Puzzle.source` takes `'game'`), `hooks/app/analysis.ts` (adds the cards), `hooks/ui/pane.tsx`, `hooks/ui/hint.tsx` (the title), `hooks/ui/analysis.tsx` (one line), `hooks/i18n/*` (two texts), README, ROADMAP, version 0.9.0.
