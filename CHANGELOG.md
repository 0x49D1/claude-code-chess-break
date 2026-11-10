# Changelog

What each version added. The pane shows the latest ones under ℹ About.


## 0.8.3 (2026-11-10)

- The sidebar shows the version again (`ℹ chess-break 0.8.3`), and About its changes: both are now built into the mod rather than read from its files, which failed in some installs.
## 0.8.2 (2026-11-10)

- A solved puzzle closes with Claude, even with the keyboard in the pane; the keyboard keeps the pane open only while a puzzle is on, or during a sign-in or a game's setup.
- Esc goes back: from Progress, About, sign-in, a game's setup or a finished game to the puzzle, and from the puzzle it closes the pane. In a live game it only hands the keyboard back.

## 0.8.1 (2026-11-10)

- The pane stays open when Claude is done if you're in it: a piece clicked, a move typed, or the keyboard in the pane.
- A way back at the top of Progress, About, sign-in, a game's setup and a finished game, for a short terminal.

## 0.8.0 (2026-11-10)

- Puzzles you solve cleanly aren't offered again; missed ones can still come back.

## 0.7.1 (2026-11-10)

- ⏱ The puzzle clock starts with your first move, not when the puzzle shows, since the pane can sit open in the background. A puzzle solved in one move has no time.

## 0.7.0 (2026-11-10)

- ⏱ A clock on each puzzle; time with the pane closed doesn't count.
- 📊 Progress and `/chess-break stats` show your average and fastest clean solve, and stats each theme's average time.

## 0.6.0 (2026-11-10)

- ℹ About in the pane: the version, what's new, and a link to the project on GitHub.

## 0.5.0 (2026-11-10)

- 🔍 Review after a Lichess game: your costliest moves, with the better move, from Lichess's computer analysis.

## 0.4.0 (2026-11-10)

- 📊 Progress: each theme's accuracy week by week over the last 4 weeks, weakest first.
- Signed in to Lichess, each theme also shows Lichess's performance rating and first-try accuracy.
- `/chess-break stats` shows the same weekly bars.

## 0.3.0 (2026-11-10)

- 🎯 Daily goal: a few puzzles a day (5 by default, set in `/config`), and 📅 the days in a row you met it.

## 0.2.5 (2026-11-10)

- The red outlined pawn for Windows Terminal is gone; the README says which font shows solid black pawns.

## 0.2.4 (2026-10-30)

- A setting for the Windows Terminal pawn, and the font fix in the README.

## 0.2.3 (2026-10-30)

- Black pawns are drawn as text, not as the pawn emoji; in Windows Terminal, outlined in red.

## 0.2.2 (2026-10-30)

- Game sounds only with **Game sounds** on, the low-time beep included.

## 0.2.1 (2026-10-30)

- A live game against a person asks before it starts.

## 0.2.0 (2026-10-30)

- A setup screen for games: level, clock or days, colour, casual or rated.
- Correspondence games.
- Casual puzzles: results that don't count for your Lichess rating.
- Explain says why it failed, and can be pressed again.

## 0.1.0 (2026-10-29)

- Tactics puzzles while Claude works: Lichess by theme, Chess.com daily puzzles, or offline.
- Missed puzzles come back for review.
- Progress per theme, and a streak.
- Replay of finished puzzles, and Claude explains them.
- Lichess sign-in for rated puzzles; games against Stockfish or a person.
- English, French, Russian and Georgian.
