# Tasks

## 1. Pure core

- [ ] 1.1 Add the `Ratings`, `DailyGame` and `ChesscomNote` types and the `chesscom`/`chesscomNote` view fields to `types/index.d.ts`. Verify: `npx -p typescript tsc --noEmit -p .` is clean
- [ ] 1.2 Write `hooks/chesscom/player.ts`: `playerUrl`, `statsUrl`, `gamesUrl`, `readRatings`, `readDailyGames`, `sortGames` and `formatDeadline` (design.md, decision 1). Verify: `tests/chesscom.test.ts` covers:
  - ratings with some kinds missing, and tactics `highest` only;
  - the player found as black with the name in another case, and the opponent named;
  - `isMyTurn` from `turn`;
  - `move_by: 0` giving no deadline;
  - a game matching neither side dropped;
  - sort order;
  - `2d 12h`, `7h 10m`, `40m`.

## 2. Actions

- [ ] 2.1 Write `hooks/app/chesscom.ts`:
  - `connectChesscom($, name)`: refused when signed in to Lichess; checked with `playerUrl`; stored under `chesscomUser`;
  - `forgetChesscom($)`, `restoreChesscom($)`;
  - `refreshChesscom($)`: one request at a time, the `reading` guard, notes, the Lichess check (design.md, decisions 3–4);
  - `pollChesscom($)`;
  - `showChesscomGame($, url)` and `hideChesscomGame($)`.

  Verify: `tests/chesscom.test.ts`, with `http.fetch` stubbed:
  - a 404 keeps nothing;
  - a known name stores it;
  - a signed-in Lichess account refuses with no fetch;
  - two refreshes at once send one request per address;
  - a 429 sets `limited` and keeps the last games;
  - an account present at refresh forgets the name and sets `disconnected`.
- [ ] 2.2 Call `restoreChesscom` and `pollChesscom` at `session.start` in `hooks/register.ts`, and `void refreshChesscom($).catch(() => undefined)` in `openPane`. Verify: a test with a stored name sees the section after session start, and the timer is cancelled by `endAll`-style cleanup so the file doesn't fail for an open timer

## 3. Pane, prompt line, command

- [ ] 3.1 Write `hooks/ui/chesscom.tsx`:
  - `chesscomSection`: ratings row, up to 4 games, `+N`, notes;
  - `shownChesscom(v)`;
  - `chesscomGamePane`: read-only board, whose move, the two links, back.

  Add the section to `sidebar()` and the one routing line to `pane.tsx` (design.md, decisions 5–6). Verify: `tests/chesscom-pane.test.ts` mounts the pane and checks:
  - the list order and marks;
  - opening a game shows its FEN's pieces from the player's side, with the links and no move field;
  - back shows the same puzzle with its moves;
  - a later read that drops the game goes back by itself.
- [ ] 3.2 Add the Chess.com count to `hintTail` (design.md, decision 7). Verify: a test of `hintTail` gives the puzzle line plus the count with two games awaiting, and the unchanged Lichess game line when a game is on
- [ ] 3.3 Add `chesscom <name>` and `chesscom off` to `hooks/commands.ts`, and to `usage`. Verify: command tests for the connected, unknown, unreachable, Lichess-signed-in and off answers
- [ ] 3.4 Add every new text to `en`, `fr`, `ru` and `ka`. Verify: tsc is clean, and the languages test passes

## 4. Isolation and docs

- [ ] 4.1 Check the files that must not change: `git diff --stat <the commit this change starts from> -- hooks/lichess hooks/app/game.ts hooks/app/account.ts hooks/ui/game.tsx tests/play.test.ts tests/account.test.ts tests/game.test.ts` shows nothing, and no existing test file is edited
- [ ] 4.2 Add an isolation test: with a username connected and every Chess.com fetch failing, a Lichess game's pane and prompt line are the same as with no username, and nothing is thrown. Verify: the test passes
- [ ] 4.3 README: a "Chess.com" part covering connecting, what's shown, one account at a time, read-only (moves are made on Chess.com), and the `chesscom` rows in the command table. Verify: the README has them, and `claude plugin validate .` passes

## 5. Done

- [ ] 5.1 Run the three checks from AGENTS.md. Verify: `npx -p typescript tsc --noEmit -p .` is clean, `claude plugin test .` passes, and `claude plugin validate .` passes
- [ ] 5.2 Try it for real in a second Claude Code in tmux (ask first: it uses the network), with a public Chess.com name that has daily games. Verify: the section, a game's position and the prompt-line count look as the specs say; correct anything that doesn't
