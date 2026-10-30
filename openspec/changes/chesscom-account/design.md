# Design

## Context

- Chess.com's Published-Data API (checked 2026-10-30): read-only, no authentication. Everything this change uses comes from three calls:
  - `/pub/player/{u}`: 404 for an unknown name.
  - `/pub/player/{u}/stats`: `chess_rapid`, `chess_blitz`, `chess_bullet` and `chess_daily`, each with `last.rating`; `tactics` with only `highest` and `lowest`. Empty objects are left out.
  - `/pub/player/{u}/games`: each current daily game's `url`, `fen`, `turn`, `move_by` (seconds, `0` on vacation), and `white`/`black` as profile URLs.
- Requests in parallel can get a 429; one after another is unlimited. The pages say they refresh every 12–24 hours, but every endpoint answered `cache-control: max-age=5` with recent `last-modified` dates, so the data is close to live.
- The pane routes in `hooks/ui/pane.tsx`: sign-in, then `if (v.game || v.seeking) return gamePane(…)`, then the puzzle. `board(els, shown, onSquare)` in `hooks/ui/board.tsx` draws any `BoardView`, and `isActive: false` draws it with no move entry.
- `hintTail(v)` in `hooks/ui/hint.tsx` returns the Lichess game's or the seek's line first, then the puzzle's.
- `hooks/chesscom/client.ts` already has `USER_AGENT` and the daily-puzzle read.

## Goals / Non-Goals

**Goals:**
- Nothing in the Lichess code paths changes behaviour: the files listed in proposal.md stay byte-for-byte the same, and existing tests pass unedited.
- One request to Chess.com at a time, from one place.

**Non-Goals:**
- A shared games model with Lichess correspondence. `lichess-game-improvements` can adopt `formatDeadline` and the list later.
- Conditional requests (`If-None-Match`). Two small reads every 5 minutes don't need them.

## Decisions

**1. A pure core in `hooks/chesscom/player.ts`.**
- `playerUrl(u)`, `statsUrl(u)` and `gamesUrl(u)`, with the name lowercased and encoded.
- `readRatings(text)` returns `{ rapid?, blitz?, bullet?, daily?, tacticsBest? }`.
- `readDailyGames(text, user)` returns `DailyGame[]`, each with `url`, `fen`, `side`, `opponent`, `isMyTurn` and `moveBy?` (ms). The player's side is whichever of `white`/`black` ends in `/<user>`, compared without case. The opponent is the other one's last path part. `isMyTurn` is `turn` matching that side. A game that matches neither side, or has no `fen`, is dropped.
- `sortGames(games)`: the player's move first, the soonest deadline first.
- `formatDeadline(ms)`: `2d 12h`, `7h 10m` or `40m`.

Each read casts to an all-optional shape and checks every field, as AGENTS.md asks.
- *Instead: put these in `client.ts` next to the puzzle read.* A separate file keeps the puzzle source's code as it is.

**2. Separate state: `view.chesscom`.**
`chesscom?: { user: string; ratings?: Ratings; games: DailyGame[]; shownUrl?: string; note?: ChesscomNote }`, where `ChesscomNote = 'unreachable' | 'limited' | 'disconnected'`. The username is also kept in `$.store` under `chesscomUser`. Only `hooks/app/chesscom.ts` writes these. A shown game is referred to by `shownUrl` and looked up in `games` when drawn, so a refresh moves the board without any extra code, and a game that ended goes away by itself.
- *Instead: keep the shown game as a copy.* It would go stale, and need code to sync it.

**3. One refresh, one at a time.**
`refreshChesscom($)` in `hooks/app/chesscom.ts` awaits `stats`, then `games`, never both at once. A module-level `reading` promise (with a comment) makes a second call while one runs wait for it instead of sending more. `pollChesscom($)` starts a module-level `poll = $.clock.every(5 * 60_000, …)` timer, and `forgetChesscom` cancels it. The pane opening calls `void refreshChesscom($).catch(() => undefined)`. That's one line in `openPane` in `hooks/app/actions.ts`, a puzzle file and not a Lichess one.
- Status 429 sets the `limited` note, any other failure sets `unreachable`, and the last data stays. The next successful read clears the note.

**4. The one-account rule, enforced from the Chess.com side only.**
- `connectChesscom($, name)` refuses before sending anything when `view.account` is set.
- Every refresh first reads `view.account`. If someone is signed in, it forgets the username (store, view, timer) and sets a top-level `chesscomNote: 'disconnected'`. The pane shows that once and clears it on the next press.
- The sidebar section and the prompt-line count also check `!v.account` when drawn, so after a Lichess sign-in they vanish at once, before the next refresh.
- *Instead: make sign-in disconnect Chess.com.* That means editing `hooks/app/account.ts`, which this change must not touch.

**5. Routing: one line after the Lichess game.**
In `pane.tsx`, after `if (v.game || v.seeking) return gamePane(…)` comes `if (shownChesscom(v)) return chesscomGamePane(…)`, from `hooks/ui/chesscom.tsx`. The Lichess check stays first, so it always wins. `view.attempt` is never touched, so going back shows the same puzzle. The game view draws `board(els, { fen, side, isActive: false }, () => {})`, whose move it is, `Link`s to the game's `url` and to `analysisUrl(fen, side)`, and a back button that clears `shownUrl`.

**6. The sidebar section** is `chesscomSection(…)` in `hooks/ui/chesscom.tsx`, placed under the account line in `sidebar()`. It has one ratings row, up to 4 games (each a button that opens it), and a `+N` count beyond that, to stay inside the pane's 24 rows. The list's buttons only show when no Lichess game or seek is on.

**7. The prompt line: a segment appended at the end.**
`hintTail` gets one step after the Lichess game and seek branches: a count of `isMyTurn` games, appended to the puzzle's segments, or on its own when no puzzle is under way. This differs from the Lichess correspondence plan, which replaces the line only when no puzzle is under way. A puzzle is under way nearly all the time the pane is hidden, so the count would hardly ever show.

**8. Texts.** New keys in `Messages` for every locale (en, fr, ru, ka): the section's labels, the notes, the command's answers, the links. They're plain words, with no Chess.com logo or wording copied.

## Risks / Trade-offs

- [A username matched by URL suffix could miss a renamed account] → profile URLs carry the current name, which is the one connected. A game matching neither side is dropped, not shown wrong.
- [Rated `daily` and `rapid` fields absent for new players] → they're optional, and shown only when present.
- [The refresh after a Lichess sign-in can lag up to 5 minutes] → drawing already hides the section at once. Only clearing the store waits, and the next pane open runs a refresh.
- [`hintTail` and `sidebar` are shared drawing code] → the edits only add, behind `v.chesscom && !v.account`. The isolation test (tasks 4.2) checks the Lichess game pane and line with a username connected and every Chess.com request failing.
