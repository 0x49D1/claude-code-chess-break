# Proposal

## Why

Won endgames are lost by people who know the theory and have never played it against resistance. Lichess's Stockfish defends every position as well as it can, and its challenge API starts a game from any position.

## What Changes

First slice of the roadmap's "Endgame drills":

- **🏆 Endgames** under ⚔ New game lists four won positions, White to move: king and queen against king, king and rook against king, king and pawn with the king in front, the Lucena position.
- A press starts a casual Lichess game against Stockfish level 8, 15+10, from the position, in the game pane. 🔄 at the end plays the same drill again.
- **Games from any position:** a game reads Lichess's `initialFen` and replays its moves from it, so the board, whose move it is, the clocks, the move list, replay and the review's puzzles all follow.
- A drill is not kept as the person's setup choice for the next game.

Left for later slices: keeping which drills were converted and bringing back the others; more positions, holding a draw among them.

## Impact

- New: `hooks/training/endgames.ts`, `hooks/app/endgames.ts`, `hooks/ui/endgames.tsx`, `tests/endgames.test.ts`.
- Edits: `types/index.d.ts` (`GameSettings.fen`, `Game.initialFen`, `View.isEndgamesShown`), `hooks/lichess/game.ts` (`initialFen`, the `fen` field), `hooks/training/game.ts` (`startOf`, `toMove`), `hooks/app/game.ts`, `hooks/ui/game.tsx`, `hooks/training/mistakes.ts`, screen and Esc, `hooks/ui/pane.tsx`, `hooks/i18n/*`, README, ROADMAP, version 0.15.0.
