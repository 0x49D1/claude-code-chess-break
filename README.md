# chess-break

A Claude Code mod for **chess tactics training while Claude works**. Puzzles come from Lichess, by theme. The ones you miss come back for review until you've learned them, and your progress is tracked per theme.

## What it does

- **Train a theme:** forks, pins, back-rank mates, rook endgames… or a mix (`/chess-break themes` lists them).
- **Review what you miss:** a puzzle failed, or solved with a hint or the solution, comes back after 1 day. Solve it cleanly and it returns after 3 days, then 7, then it's learned. Due reviews come before new puzzles.
- **See your progress:** `/chess-break stats` shows accuracy per theme, your streak and your weakest theme.
- **Play by clicking or typing:** click a piece to see its moves (dots) and captures (tinted squares). Or type the move (`Nf3`, `nf3`, `e2e4`, French `Cf3`); the legal moves that fit show as you type, and Enter plays the only one left.
- **English and French**, following Claude Code's language setting, then your system locale.

The pane opens when Claude starts working and closes when Claude is done, unless you're mid-puzzle.

## Install

From a clone of this repository:

```
claude --plugin-dir /path/to/chess-break
```

## Commands

| Command | Effect |
| --- | --- |
| `/chess-break` | open the pane |
| `/chess-break next` | next puzzle (a puzzle left after a mistake or help counts as missed) |
| `/chess-break theme <name>` | train a theme: `fork`, `back-rank-mate`, `mix`… |
| `/chess-break themes` | list the themes |
| `/chess-break stats` | progress per theme |
| `/chess-break review` | play the puzzles due for review |
| `/chess-break lang auto` / `en` / `fr` | language |

In the pane: `h` hint, `s` solution, `n` next (outside the move field).

## Settings (`/config`)

- **Open while Claude works** (on by default)
- **Difficulty**: easiest → hardest, for new puzzles
- **Language**: auto, en, fr

## Development

```
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

| Folder | What's in it |
| --- | --- |
| `hooks/chess/` | a thin layer over chess.js: reading typed moves, completions |
| `hooks/lichess/` | Lichess addresses and answers |
| `hooks/training/` | an attempt at a puzzle, the review queue, progress, themes (no `$`, all tested directly) |
| `hooks/i18n/` | every text, one file per language, typed by `Messages` |
| `hooks/app/` | state and the actions that use `$` |
| `hooks/ui/` | the board and the pane |
| `hooks/vendor/` | chess.js 1.4.0 (BSD-2-Clause, see `chess.js.LICENSE`), copied because a mod can only import its own files |

A few rules the mod engine enforces: a file that reads or updates the pane's state declares the atom itself; `$` goes only into `function` declarations across files, never arrow functions or object methods.

The idea of puzzles in a pane while Claude works comes from [cclichess](https://github.com/MrtnsK/cclichess) by MrtnsK. This project is a separate implementation.
