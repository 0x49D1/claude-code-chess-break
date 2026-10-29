# Design

## Context

- `lichess-games` (see its design) follows exactly one game.
  - It has one `followed` id, and one curl child per slot (`game`, `seek`, `events`) in `hooks/app/game.ts`.
  - `View.game` is the game drawn. `Game.moves` holds UCI moves from Lichess's stream.
  - The 1-second tick moves `Game.now` on.
- The puzzle view already has a move list and a replay:
  - `moveLabels` and `atPly` in `hooks/training/attempt.ts`;
  - `View.replayPly`, with `j`/`k` and clickable moves in `hooks/ui/pane.tsx`.
  - `line(fen, tokens)` in `hooks/chess/position.ts` gives SAN for UCI moves, through chess.js's lenient parsing.
- `/api/account/playing` answers every game of the account that is on, without opening a stream. Each entry has `gameId`, `fen`, `color`, `lastMove`, `isMyTurn`, `secondsLeft`, `speed`, `rated`, and `opponent` (`username`, `rating`, `ai`).
- `$.audio.play` takes `{ base64, mime }`. It plays on macOS and in the desktop app. A Linux or Windows terminal plays nothing, and the call still resolves.
- Settings in `/config` come from `userConfig` in `.claude-plugin/plugin.json`, read into `settings` in `hooks/app/state.ts`.

## Goals / Non-Goals

**Goals:**
- Still one curl stream at a time: the game drawn.
- Correspondence games are known from the account's list, which needs no stream.
- Everything new about a game stays pure in `hooks/training/game.ts`, tested directly: SAN rows, material, replay, settings parsing, and the list's order and diff.

**Non-Goals:**
- No browsing during a game (decided).
- No local record of finished games.
- No live game and a correspondence game drawn side by side.

## Decisions

### Clocks and days share one `clock` field

`GameSettings.clock` keeps `minutes+increment` and gains `Nd` (`3d`):
- `readClock` answers `{ days }` for it.
- `gameForm` sends `days` instead of `clock.limit`/`clock.increment` (AI) or `time`/`increment` (seek).
- `isCorrespondence(settings)` is `clock.endsWith('d')`.

A separate `days` field was rejected. Every place that reads a clock would then check two fields, and the command already reads `3d` naturally.

### One live game, many slow ones, one stream

```
  /api/account/playing --(turn.start, pane open, every 5 min)--> View.games: GameSummary[]
                                                                     |
  pane shows:  live game (if on)  >  setup screen  >  chosen game    |  games list
                                                                     v
                         follow(id): the one curl stream, for View.game only
```

- `View.games` holds the list.
- `View.game` stays the game drawn. Choosing another game in the list calls `follow(id)`, which already stops the previous stream.
- A live game is followed whenever it is on. While it is on, the list is not offered: the live game holds the pane.
- `resumeGame` becomes `refreshGames`:
  - it reads the list;
  - it follows a live game if one is on, else nothing;
  - it diffs `isMyTurn` against the previous list, for the toast.
- `turn.start` calls `refreshGames`. When no live game is on and `games` has entries awaiting the person, the pane follows the one with the least `secondsLeft`, instead of loading a puzzle.
- The five-minute refresh is `$.clock.every(300_000)`, started at `session.start` when signed in and stopped at sign-out.

### A correspondence seek is a plain POST

Lichess answers a correspondence seek at once, with no open request to keep. So it goes through `$.http.fetch`, not curl. Nothing waits for it: the game appears in `games` on a later refresh. This behaviour is assumed, and task 1.1 checks it on Lichess before anything depends on it.

### Time left in days

`formatClock(ms)` picks the unit by size: `2d 12h`, `5h 03m`, `42m`, and `m:ss` under an hour, as today. Correspondence state lines carry `wtime`/`btime` in ms like live ones, which task 1.1 checks too. The countdown, `clockLeft`, works unchanged. The low-time warning checks `isCorrespondence` and stays live-only.

### Setup screen: `View.setup`

`View.setup` holds the draft settings, of either kind.
- 🤖 / 👤 fill it from `$.store.get('gameChoices')`, which holds `{ ai, seek }`, or the defaults.
- Each row is a set of `Button`s with the chosen one `inverse`, like the replay row.
- ▶ Play calls `startGame`, which stores the choices for that kind before it starts. So `/chess-break play …` updates them too.
- The pane draws the setup screen when `setup` is set and no live game is on.

### Move list and replay

- `sanMoves(g)` is `line(START, g.moves)` mapped to SAN.
- `moveRows(sans)` gives `['1. e4 e5', '2. Nf3']`.
- The sidebar has room for 8 rows between the clocks, the board being 10 rows. When there are more, the first row is `…` and the last 7 follow.
- After the end, rows become buttons per move.
- `View.replayPly` is reused. The board draws `gameAtPly(g, ply)`, which replays `moves.slice(0, ply)`. `j`/`k` are bound only once the game is over, so typing during a game is untouched.
- Leaving the game resets `replayPly`, as `loadNext` already does.

### Material from the position

`material(fen)` counts each side's pieces against the starting set. Captured pieces are the opponent's missing ones; the lead is the value difference.

*Shortcut:* a promoted piece counts as an extra and is never shown as captured. A count below zero is clamped to 0. It is rare and harmless to the display.

### Sounds made in code

`beep(frequency, ms)` builds a tiny mono 8-bit WAV and returns it as base64 (a 44-byte header plus samples), so no sound file ships. Licensing Lichess's sounds was the alternative, and it's not worth it for a beep.
- The low-time beep plays at most once per game: `Game.isLowTimeWarned`.
- The opponent-move sound plays only with `settings.gameSound`.
- Every `$.audio.play` is `.catch(() => undefined)`, because a host that cannot play is no error.

### Opponent moved: toast only when unseen

When a `gameState` adds an opponent move, `follow` checks `$.ui.panes()` for the pane being shown. If it is not shown, a toast names the move (`♞ Stockfish level 3 played Nf6`, the SAN from `line`). The correspondence diff in `refreshGames` gives the other games' toast. The shown game's own moves arrive by stream and need no toast.

### Takeback

- `POST /api/board/game/{id}/takeback/yes` offers or accepts; `/no` declines.
- The ↩ button shows only when the opponent is Stockfish (`aiLevel`) and the person has moved.
- The state line's `wtakeback`/`btakeback` is read into `GameState.takebackOffer`. Against a person, `follow` answers `/no` once per offer.
- Lichess's Stockfish is assumed to accept at once, and the next `gameState` carries the shortened move list. Task 7.2 checks it.

## Risks / Trade-offs

- [The correspondence assumptions (instant seek answer, ms clocks, Stockfish accepting takebacks) are unverified] → task 1.1 checks them on Lichess first. Design changes from it come back here before the dependent tasks.
- [A refresh every five minutes reads Lichess all session long] → one small GET, only when signed in; stopped at sign-out; 429 skips the next refresh.
- [Opponent-move toasts could be noisy in a live game with the pane hidden] → shown only when the pane is hidden. The pane opening each Claude turn makes that rare during work.
- [The sidebar's 8 rows are fixed] → long games show the latest moves only; the full game is on Lichess, linked at the end.

## Migration Plan

- `GameSettings` keeps its shape: a clock string now may end in `d`.
- Stored `gameChoices` is new, with defaults when absent.
- `lichess-games` must be archived, its spec synced, before this change is archived: its delta modifies that spec.
