# Tasks

## 1. Check Lichess's behaviour first

- [ ] 1.1 With the signed-in account and `curl`, check the four assumptions in the design:
  - a correspondence seek (`POST /api/board/seek` with `days`) answers at once;
  - a correspondence game's state lines carry `wtime`/`btime` in ms;
  - `takeback/yes` against Stockfish is accepted and the next state drops the moves;
  - `/api/account/playing` lists `isMyTurn` and `secondsLeft`.

  Record the answers, trimmed, as fixtures in `tests/fixtures/` and note in `design.md` any assumption that failed, before group 3. Verify: the fixtures exist and `design.md` has no unchecked assumption

## 2. Pure game logic (`hooks/training/game.ts`, `hooks/lichess/game.ts`)

- [ ] 2.1 Clocks with days:
  - `Nd` in `readSettings`;
  - `readClock` → `{ days }`;
  - `gameForm` sends `days`;
  - `isCorrespondence`;
  - `formatClock` in days, hours and minutes.

  Verify with `tests/game.test.ts`: `play stockfish 4 3d`, `play human 3d`, `9d` refused, the forms, and `2d 12h` / `5h 03m` / `42m` / `4:05`
- [ ] 2.2 `sanMoves`, `moveRows` (with `…` past 8 rows) and `gameAtPly`. Verify with tests for a 3-move game, a 30-move game and the replay position
- [ ] 2.3 `material(fen)`: captured pieces per side and the lead. Verify with tests for the start (nothing), a knight up (+3), and a promotion (no negative counts)
- [ ] 2.4 Read `/api/account/playing` into `GameSummary[]`, plus:
  - `awaiting(games)`, ordered by least time left;
  - `newlyMine(before, after)`, for the toast.

  Read takeback offers (`wtakeback`/`btakeback`) into `GameState`. Verify with tests on the 1.1 fixtures
- [ ] 2.5 `beep(frequency, ms)`: a WAV as base64. Verify with a test that decodes it: `RIFF`/`WAVE` header, mono, 8-bit, and its length matches `ms`

## 3. Actions (`hooks/app/game.ts`)

- [ ] 3.1 `refreshGames` replaces `resumeGame`:
  - it reads the list into `View.games` and follows a live game;
  - it toasts games newly awaiting the person;
  - it runs every five minutes from `session.start` while signed in, and stops at sign-out.

  Verify with tests stubbing `http.fetch`: the list fills, the toast fires once, sign-out stops the timer
- [ ] 3.2 `startGame` for days:
  - a correspondence seek is a plain POST, with the answer from 1.1;
  - a correspondence AI challenge follows the game;
  - a second live game is refused.

  `startGame` also stores the choices in `gameChoices` per kind. Verify with tests: `play human 3d`, `play stockfish 2 1d`, live-while-live refused, `gameChoices` written by command
- [ ] 3.3 `takeback` against Stockfish; the opponent's takeback offers declined against a person. Verify with tests: the request sent, refused against a person, `takeback/no` sent once per offer
- [ ] 3.4 Alerts in `follow`:
  - the opponent's move toasted when the pane is not shown, with a sound only with `gameSound`;
  - the low-time beep once per live game under 30 s.

  Verify with tests stubbing `ui.panes`, `ui.toast` and `audio.play`

## 4. Pane, prompt line, settings

- [ ] 4.1 Setup screen in `hooks/ui/game.tsx`:
  - the rows for level, clock/days, colour, and rated;
  - ▶ Play and cancel;
  - 🤖/👤 in `hooks/ui/pane.tsx` open it, filled from `gameChoices`.

  Verify with pane tests: choose level 6 and `5+3` and play; the person's screen offers no clock under `10+0`; the choices come back
- [ ] 4.2 Move list between the clocks, the newest move marked; material on each clock line; your clock red under 30 s. Verify with pane tests for a short game, a long one (`…`), a knight up, and 0:29 in red
- [ ] 4.3 Replay after the end: move buttons, `j`/`k` only once the game is over. ↩ takeback for Stockfish only. Verify with pane tests: click move 3, check the board; no ↩ against a person
- [ ] 4.4 Games list:
  - the games awaiting first, marked;
  - choosing one follows it;
  - a way back to the list;
  - the list hidden during a live game.

  `turn.start` opens the game awaiting with the least time left before puzzles; `turn.complete` closes the pane beside a correspondence game. Verify with tests for both orders, and for the close
- [ ] 4.5 Prompt line in `hooks/ui/hint.tsx`: `⚔ N games await your move` when no live game is on, the pane is hidden and no puzzle is under way. Verify with a hint-row test
- [ ] 4.6 `/chess-break takeback` and `/chess-break games` in `hooks/commands.ts`; `gameSound` in `.claude-plugin/plugin.json` and `settings`; all new texts in `en`, `fr`, `ru` and `ka`. Verify with command tests and `npx -p typescript tsc --noEmit -p .`

## 5. Docs and the real check

- [ ] 5.1 In `README.md`:
  - Games: the setup screen, days per move, the games list, takeback, the alerts (sound on macOS and the desktop app only), and the new commands;
  - Settings: `gameSound`.

  Verify that the documented commands match `commands.ts`
- [ ] 5.2 On Lichess with `claude --plugin-dir .`, check each part for real:
  - a 10+0 game against Stockfish 1, set up on the screen, with the move list, material, takeback, and the low-time colour;
  - a 1-day game against Stockfish, picked up on the next Claude turn.

  Verify both games on the Lichess account

## Workflow follow-up

- Archive `lichess-games` first (its spec synced), then this change.
