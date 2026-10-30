# Design

## Context

- `$.http.fetch` resolves only with the whole answer, so it cannot read Lichess's never-ending NDJSON game stream. `$.process.spawn` streams stdout line by line. `hooks/app/account.ts` already uses it for the sign-in listener. `spawn` takes `input` for stdin.
- `$.clock.every(ms, fn)` and `$.clock.sleep` exist. They drive the clocks between Lichess updates and the backoff between reconnects.
- The pane, the prompt line and the commands all read one `view` atom (`types/index.d.ts` `View`). `board()` in `hooks/ui/board.tsx` takes an `Attempt` and uses only `fen`, `lastMove`, `selected`, `hint`, `status` and the puzzle's side.
- The move input (`readMove`, `completions` in `hooks/chess/position.ts`) works for any FEN.
- `turn.complete` in `hooks/register.ts` keeps the pane open only for a started puzzle.
- The mod engine rules: a file that touches `view` declares the atom itself, and `$` goes only into `function` declarations.

## Goals / Non-Goals

**Goals:** one game at a time. Lichess is the only source of truth for the position and clocks, so a dropped stream or a new session catches up by reading the stream again.

**Non-Goals:** no local engine and no move validation beyond chess.js's legality check before sending. No shared state between sessions beyond what Lichess holds.

## Decisions

### Board API endpoints

| Action | Request |
| --- | --- |
| Stockfish | `POST /api/challenge/ai` form `level`, `clock.limit` (s), `clock.increment`, `color` → `{ id }` |
| Seek | `POST /api/board/seek` form `rated`, `time` (min), `increment`, `variant=standard`. The request stays open while seeking, and closing it cancels the seek |
| Game started (seek) | `GET /api/stream/event` → `{ type: 'gameStart', game: { gameId } }` |
| Game in progress at session start | `GET /api/account/playing` → `nowPlaying[]` |
| Game stream | `GET /api/board/game/stream/{id}`: `gameFull`, then `gameState`, `opponentGone`, `chatLine` (ignored) |
| Move | `POST /api/board/game/{id}/move/{uci}` |
| Resign / abort | `POST /api/board/game/{id}/resign`, `/abort` |
| Draw | `POST /api/board/game/{id}/draw/yes` or `/no` (yes both offers and accepts) |

Short requests go through `$.http.fetch` with `Authorization: Bearer`, as `sendResult` does. Long-lived ones (the seek, the event stream, the game stream) go through `curl`.

### curl with the token on stdin

`curl -sN --fail-with-body --config - <url>` gets `header = "Authorization: Bearer …"` on stdin through `spawn`'s `input`. The token stays out of argv, so `ps` never shows it. Python's urllib, through the existing `python3` dependency, was considered and rejected: curl buffers nothing with `-N`, and it was vibe-gambit's choice too. A shared `streamLines($, url, onLine)` in `hooks/app/game.ts` splits stdout into lines, as the sign-in listener's loop does.

### The game's parsing is pure

`hooks/lichess/game.ts` holds the URLs, the request forms, and `readGameEvent(line) → GameEvent`. `hooks/training/`-style pure functions turn an event and the current `Game` into the next `Game`:

- the FEN by replaying the UCI `moves` with chess.js
- `lastMove`
- the clocks with the time they were received
- `status` and `winner`
- the draw offer from `wdraw` or `bdraw`

They are tested directly, like the training code.

### State: `View.game`, beside `attempt`

```ts
type Game = {
  id: string; kind: 'ai' | 'seek'; settings: GameSettings  // to play again
  side: Color; fen: string; moves: string[]; lastMove?: string
  white: Player; black: Player                            // name, rating, or `Stockfish level n`
  clock: { white: number; black: number; at: number }     // ms, epoch ms of the last update
  status: string; winner?: Color; drawOffer?: Color
  selected?: string; promoting?: string; pending?: string // a sent move not yet confirmed
  note?: string                                           // why a move was refused, reconnecting…
}
type View = { …; game?: Game; seeking?: GameSettings }
```

The pane draws the game when `game` or `seeking` is set, and puzzles otherwise. `attempt` is left alone, so the puzzle is still there after the game. The countdown is computed when drawing, `clock[toMove] - (now - at)`. The engine has no timers in render, so a `$.clock.every(1000)` started with the stream calls `update` with a tick counter and is stopped when the game ends.

### Board reuse

`board()` takes `{ fen, side, lastMove?, selected?, hint?, isActive }`. Puzzles pass their attempt mapped into that, and games pass theirs. The click logic of `click`/`promote` is copied into `hooks/training/game.ts` (`clickGame`), about ten lines. Making it generic over `Attempt | Game` would cost more than it saves.

### Moves

A move is played locally as `pending` and sent. The next `gameState` either contains it (clear `pending`) or not (refused: show Lichess's FEN, `note` from the answer's `error`). A non-2xx on the POST also restores the position. The prompt path in `commands.ts` checks `view.game` first, so `/chess-break Nf3` goes to the game when one is on.

### Scope and old tokens

`SCOPES` becomes `['puzzle:read', 'puzzle:write', 'board:play']`. A stored token is not inspected up front. The first game request answering 401 or 403 sets `note` to the renew-sign-in message and shows 🔑. `TOKEN_PAGE` follows `SCOPES`, so a pasted token gets the scope too.

### Lifecycle hooks

- `turn.complete`: keep the pane open if `game` (not over) or `seeking`, with a toast.
- `session.start`: if signed in, fetch `/api/account/playing`, and open the stream of the first game found.
- Stream end while the status is `started` reopens after 1, 2, 4… up to 30 seconds, with `note` set to reconnecting. A `gameFull` resets the whole state, so a reconnect needs no bookkeeping.

## Risks / Trade-offs

- [Lichess rate-limits (429)] → no retry loop on 429: show "wait a minute" and stop the stream backoff for 60 seconds.
- [curl missing] → `spawn` fails, games answer "needs curl", and puzzles are untouched (spec: Stream failures).
- [The 1 s tick redraws the pane while waiting] → only while a game is on, and the board is small.
- [Several Claude Code sessions open one game] → each streams independently, and moves from either are valid on Lichess. The views may briefly disagree until the next event. Acceptable, since sharing is out of scope.
- [The seek's 10+0 floor is Lichess policy and could change] → the clock list lives in one constant.

## Migration Plan

No data migration. Existing tokens keep working for puzzles, and games ask for a new sign-in. Rollback is a revert, and `board:play` tokens keep working for puzzles.
