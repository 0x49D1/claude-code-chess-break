# Proposal

## Why

After a game, the pane shows the result and lets the moves be replayed, but not where the game was lost. Lichess's computer analysis finds that, and the few worst moves with a better one are what a person can learn from in the minute before Claude is done.

## What Changes

- **🔍 Review** on a finished game (not an aborted one).
- **The analysis happens on Lichess.** Lichess's API cannot start one, so the pane says so and links to the game, where the person presses Lichess's "Request a computer analysis" once. No install, no engine in the mod.
- **Waiting:** the pane reads the game's export every 5 seconds for up to 3 minutes, and shows the result as soon as Lichess has it. After that, `🔄 Check again`. A game already analysed shows at once.
- **The result:** the person's (not the opponent's) up to 3 moves Lichess judged an inaccuracy, mistake or blunder, the costliest first: `14. Qxb7?? Blunder · better Nf3 · −3.2`. Pressing one shows the position before it on the board. None: "Lichess found no mistakes in your moves."
- Leaving the game stops the waiting.

Out of scope:
- a local Stockfish;
- reviewing Chess.com games, or puzzles;
- the opponent's mistakes, and the full evaluation graph.

## Capabilities

### New Capabilities
- `game-review`: the review of a finished Lichess game from Lichess's computer analysis.

### Modified Capabilities
None.

## Impact

- New: `hooks/lichess/analysis.ts` (pure), `hooks/app/analysis.ts`, `hooks/ui/analysis.tsx`, `tests/analysis.test.ts`.
- Edits: `types/index.d.ts` (`Mistake`, `GameAnalysis`, a view field), `hooks/app/game.ts` (`leaveGame` clears it), `hooks/ui/game.tsx` (one line), `hooks/i18n/*`, `.claude-plugin/plugin.json` (0.5.0), `README.md`.
- Network: `GET lichess.org/game/export/{id}?evals=true` (public, no scope).
