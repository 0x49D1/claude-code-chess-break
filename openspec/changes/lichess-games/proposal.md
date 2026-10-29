# Proposal

## Why

Puzzles fill short waits. Longer Claude runs leave time for a real game, and the Lichess sign-in already exists. [vibe-gambit](https://github.com/PopFlamingo/vibe-gambit) shows this works inside a Claude Code pane through Lichess's Board API. This change brings live games to chess-break and keeps the training card as it is.

## What Changes

- **Play Stockfish on Lichess**: pick a level (1–8), a clock (`3+2`, `5+3`, `10+0`, `10+5`, `15+10`, `30+0`), and a colour (white, black, random). Always casual, as Lichess requires.
- **Play a person on Lichess**: a seek for a random opponent at rapid or classical (`10+0`, `10+5`, `15+10`, `30+0`, `30+20`), casual by default, `rated` on request. The Board API allows no faster seeks.
- **Live game in the pane**: the board from your side, both clocks counting down, opponent names and ratings, the last move, and the game's status. Moves are made by clicking or typing, exactly as in puzzles (`Nf3`, `e2e4`, French `Cf3`), and also from the prompt (`/chess-break Nf3`).
- **Game actions**: resign, offer, accept or decline a draw, and abort before the second move. These work as pane buttons and as commands.
- **While a game is on**: the pane stays open when Claude finishes, the prompt line shows the game (opponent, clocks, whose move), and puzzles wait until the game ends. When the game ends, the pane shows the result, links to the game on Lichess, and offers another game with the same settings or a return to puzzles.
- **Sign-in asks for `board:play` too**. A token from the puzzle-only sign-in has no `board:play`. Starting a game with it says so and offers to sign in again. Puzzles keep working with the old token.
- **Needs `curl`** for the live game stream. Without it, games say so and puzzles still work.

Not in this change: challenging a friend by username, takebacks, chat, claiming a win when the opponent leaves, correspondence, variants, and following one game from several Claude Code sessions.

## Capabilities

### New Capabilities
- `lichess-games`: starting, playing and finishing live Lichess games against Stockfish or a person, from the pane and from the prompt.

### Modified Capabilities
None. No specs exist yet in `openspec/specs/`. The sign-in scope and the pane staying open are part of `lichess-games`.

## Impact

- `hooks/lichess/`: Board API addresses and readers for game events (new `game.ts`), and `board:play` added to `SCOPES` in `auth.ts`.
- `hooks/app/`: game state and actions (new `game.ts`). The stream runs through `curl`, started with `$.process.spawn`, and the token is passed on stdin, never in argv.
- `hooks/ui/`: the pane draws a game when one is on. `hint.tsx` shows the game line.
- `hooks/commands.ts`: `play`, `resign`, `draw`, `abort`. During a game, a move sent from the prompt goes to the game.
- `hooks/register.ts`: the pane does not close on `turn.complete` during a game, and an unfinished game reconnects at session start.
- `types/index.d.ts`, `hooks/i18n/*`: game types and texts in all four languages.
- `tests/`: game event parsing and clock tests.
- `README.md`: a Games section.
