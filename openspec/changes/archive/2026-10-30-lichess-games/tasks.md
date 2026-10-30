# Tasks

## 1. Lichess Board API, pure

- [x] 1.1 Add `Game`, `GameSettings`, `Player` to `types/index.d.ts`, plus `game?` and `seeking?` on `View`. Verify with `claude plugin validate .`
- [x] 1.2 Create `hooks/lichess/game.ts`: the endpoint URLs, the AI and seek form bodies, the clock lists (`AI_CLOCKS`, `SEEK_CLOCKS`), and `readGameEvent(line)` for `gameFull`, `gameState` and `gameStart` from the event stream (`opponentGone` and chat ignored: claiming a win is out of scope). Verify with tests in `tests/game.test.ts` on recorded sample lines, plus an unknown line → ignored
- [x] 1.3 Add `board:play` to `SCOPES` in `hooks/lichess/auth.ts`. Verify that `tests/account.test.ts` still passes and that `TOKEN_PAGE` contains `scopes[]=board:play`

## 2. Game state transitions, pure

- [x] 2.1 Create `hooks/training/game.ts`:
  - `applyEvent(game, event, now)`: FEN from UCI moves, last move, clocks, status, winner, draw offer, and a pending move cleared or rolled back
  - `clockLeft(game, now)`: no countdown before move 2
  - `clickGame`, `playGame` with the `readMove`/`completions` rules, refused when it is not your turn
  
  Verify with `tests/game.test.ts`: opponent move, own move confirmed, own move refused, draw offer, mate end, and the clock frozen before move 2
- [x] 2.2 Parse the command arguments (`stockfish [level] [clock] [colour]`, `human [clock] [rated]`) into `GameSettings` or an error. Verify with tests for the defaults, the full arguments, level 9, and `3+2` for human refused

## 3. Streams and actions (`hooks/app/game.ts`)

- [x] 3.1 `streamLines($, url, onLine)` over `curl -sN --fail-with-body --config -`, with the token in `input`. Verify with a `tests/` case stubbing `process.spawn` with `on(...)` as `tests/account.test.ts` does: the argv contains no token, and lines are delivered split correctly across chunks
- [x] 3.2 `startGame($, settings)`:
  - AI: POST, then open the game stream
  - seek: open the seek through curl plus the event stream, then on `gameStart` open the game stream
  - `cancelSeek` kills both
  - 401/403 → renew-sign-in note; curl missing → needs-curl note
  
  Verify with tests stubbing `http.fetch` and `process.spawn` for each path
- [x] 3.3 `gameMove`, `resign` (two presses within 3 s), `offerDraw`/`answerDraw`, `abort` (only before move 2), each a POST with the result reflected in `view.game`. Verify with tests stubbing `http.fetch` and `process.spawn`
- [x] 3.4 Reconnect with 1→30 s backoff while the status is `started`, a 60 s pause on 429, and a `$.clock.every(1000)` tick only while a game runs. Verify with tests stubbing `http.fetch` and `process.spawn`: the stream ends → reopened, the game over → the tick stopped

## 4. Pane, prompt line, commands

- [x] 4.1 Change `board()` in `hooks/ui/board.tsx` to take `{ fen, side, lastMove, selected, hint, isActive }`, and update the puzzle call. Verify that `tests/pane.test.ts` still passes unchanged
- [x] 4.2 Draw the game in `hooks/ui/pane.tsx`:
  - names and ratings, the clocks (the side to move in bold), the board, the move field, and `note`
  - buttons: resign, draw, abort (when allowed), cancel (while seeking)
  - at the end: the result, a Lichess link, play again, back to puzzles
  - a "New game" entry from the puzzle view
  
  Verify with `tests/pane.test.ts` cases for seeking, mid-game, a draw offer and the game over
- [x] 4.3 Show the game in `hintTail` in `hooks/ui/hint.tsx` (opponent, clocks, whose move). Verify with a `tests/pane.test.ts` case
- [x] 4.4 Add `play`, `resign`, `draw [no]` and `abort` to `hooks/commands.ts`, and route moves to the game when one is on. Verify with command tests for each, and that a move with no game still goes to the puzzle
- [x] 4.5 Add all game texts to `Messages` and to `en`, `fr`, `ru` and `ka`. Verify with `npx -p typescript tsc --noEmit -p .` (the types force every locale; `claude plugin validate` does not type-check)

## 5. Lifecycle and docs

- [x] 5.1 `hooks/register.ts`:
  - keep the pane open on `turn.complete` during a game or seek, with a toast
  - on `session.start`, resume a game found by `/api/account/playing`
  
  Verify with tests stubbing `http.fetch` and `process.spawn` for both
- [x] 5.2 In `README.md`:
  - a Games section: commands, clocks, `board:play`, curl, casual/rated
  - the commands table
  - the sign-in scopes line
  
  Verify that the documented commands match `commands.ts`
- [ ] 5.3 Play a real 10+0 game against Stockfish level 1 with `claude --plugin-dir .`: moves by click and from the prompt, the clocks, and resign. Verify that the game appears on the Lichess account

## Workflow follow-up

- Archive the change once implemented and reviewed.
