# Design

## Decisions

**1. A pure `mistakePuzzles(game, mistakes, title)` in `hooks/training/mistakes.ts`.** It replays the game's UCI moves with `line` (each chess.js move carries `before`), reads the better move with `readMove` from that position, and builds a `Puzzle`: id `game-<gameId>-<ply>`, `source: 'game'`, `url` the game on Lichess at that ply (`#<ply>`), `solution` the better move as UCI, `themes` empty.

**2. One move only.** Lichess's `variation` goes on, but its later moves are an engine's line, not forced: a puzzle that refuses a good second move teaches the wrong thing.

**3. `Puzzle.source` widens to `Source | 'game'`.** `Source` stays the setting's values, so `/chess-break source game` is still refused. `sendResult` already sends only `lichess` puzzles.

**4. The title is made in the person's language when the puzzle is made** (`t.game.fromGame(playerName(...))`), and kept in `title`, as Chess.com's are. The pane shows a puzzle's title when it has one.

**5. Cards are added in `checkAnalysis` when the analysis is ready**, with `recordReview(..., false, now)` for each puzzle not already in the queue, then `dueCount` refreshed.
