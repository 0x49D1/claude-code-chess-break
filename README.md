# chess-break

A [Claude Code](https://claude.com/claude-code) mod for **chess tactics training while Claude works**. Puzzles come from Lichess by theme, from Chess.com's daily puzzles, or from a set of 1,469 shipped with the mod for offline use. The ones you miss come back for review until you've learned them, and your progress is tracked per theme.

## What it does

- **Train a theme:** forks, pins, back-rank mates, rook endgames… or a mix (`/chess-break themes` lists them).
- **Review what you miss:** a puzzle failed, or solved with a hint or the solution, comes back after 1 day. Solve it cleanly and it returns after 3 days, then 7, then it's learned. Due reviews come before new puzzles.
- **Replay and learn:** once a puzzle ends, click any move (or `j` / `k`) to see the board at that point. 🧠 Explain asks Claude why the solution works, with a tip to remember and a fact about the pattern, plus links to practise the theme on Lichess and read about it on Wikipedia.
- **See your progress:** `/chess-break stats` shows accuracy per theme, your streak and your weakest theme.
- **Play by clicking or typing:** click a piece to see its moves (dots) and captures (tinted squares). Or type the move (`Nf3`, `nf3`, `e2e4`, French `Cf3`); the legal moves that fit show as you type, and Enter plays the only one left.
- **A training card:** the board drawn like a printed diagram (one ink, white pieces outlined), with a sidebar for this session's results 🟩🟥, your streak 🔥, reviews due 🔁 and your top themes' accuracy.
- **English, French, Russian and Georgian**, following Claude Code's language setting, then your system locale. The Georgian theme names are partly in English until a native speaker checks them.

The pane opens when Claude starts working and closes when Claude is done, unless you're mid-puzzle. While it's hidden, the end of the line under the prompt keeps the puzzle in view (theme, whose move, the last move, the streak), and you can answer from the prompt: `/chess-break Qxf7`, `/chess-break hint`.

## Puzzle sources

| Source | What you get |
| --- | --- |
| `lichess` (default) | a new puzzle on your theme, at your chosen difficulty |
| `chesscom` | a random puzzle from Chess.com's daily puzzle archive (no themes or ratings: its API has none) |
| `offline` | 1,469 popular puzzles picked from the [Lichess puzzle database](https://database.lichess.org/#puzzles) (CC0), every training theme covered |

Pick one with `/chess-break source …` or in `/config`. When Lichess or Chess.com can't be reached, puzzles come from the offline set until it can. Missed puzzles are kept whole, so reviews work offline too.

`scripts/pick_offline.py` rebuilds the offline set from the database.

## Lichess account (optional)

`/chess-break login` (or 🔑 in the pane) signs in to Lichess for **rated puzzles**: new puzzles come from your account, results count toward your puzzle rating, and the sidebar shows it (`👤 you · ⭐ 1650 (+8)`).

- **In the browser:** approve on Lichess; a one-shot listener on `127.0.0.1` (needs `python3`) catches the answer and exits. Only puzzle permissions are asked for (`puzzle:read`, `puzzle:write`).
- **Or paste a personal token** in the pane, if the browser runs on another machine.
- The token is kept in the mod's local storage and never goes into the conversation: `/chess-break login <token>` is refused for that reason.
- `/chess-break logout` signs out and revokes the token on Lichess. Reviews and puzzles from Chess.com or the offline set stay local.

## Install

From a clone of this repository:

```
claude --plugin-dir /path/to/chess-break
```

## Commands

| Command | Effect |
| --- | --- |
| `/chess-break` | open the pane |
| `/chess-break <move>` | play a move: `Qxf7`, `qxf`, `e2e4`, `Cf3` |
| `/chess-break hint` / `solution` | a hint, or the rest of the solution |
| `/chess-break explain` | Claude explains the finished puzzle (one small model call; the answer also goes into the conversation) |
| `/chess-break next` (or `skip`) | next puzzle (a puzzle left after a mistake or help counts as missed) |
| `/chess-break theme <name>` | train a theme: `fork`, `back-rank-mate`, `mix`… |
| `/chess-break themes` | list the themes |
| `/chess-break source lichess` / `chesscom` / `offline` | where puzzles come from |
| `/chess-break stats` | progress per theme |
| `/chess-break review` | play the puzzles due for review |
| `/chess-break login` / `logout` / `account` | Lichess account, for rated puzzles |
| `/chess-break lang auto` / `en` / `fr` / `ru` / `ka` | language |

In the pane: `h` hint, `s` solution, `n` next, `e` explain, `j` / `k` replay (outside the move field). Esc returns to the prompt.

## Settings (`/config`)

- **Open while Claude works** (on by default)
- **Puzzle line under the prompt** (on by default)
- **Puzzles from**: lichess, chesscom, offline
- **Difficulty**: easiest → hardest, for new Lichess puzzles
- **Language**: auto, en, fr, ru, ka

## Development

```
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

| Folder | What's in it |
| --- | --- |
| `hooks/chess/` | a thin layer over chess.js: reading typed moves, completions |
| `hooks/lichess/` | Lichess addresses and answers, and sign-in (PKCE, the redirect listener) |
| `hooks/chesscom/` | Chess.com's daily puzzle answers |
| `hooks/offline/` | the shipped puzzle set (generated, CC0) |
| `hooks/training/` | an attempt at a puzzle, the review queue, progress, themes (no `$`, all tested directly) |
| `hooks/i18n/` | every text, one file per language, typed by `Messages` |
| `hooks/app/` | state and the actions that use `$` |
| `hooks/ui/` | the board and the pane |
| `hooks/vendor/` | chess.js 1.4.0 (BSD-2-Clause, see `chess.js.LICENSE`), copied because a mod can only import its own files |

A few rules the mod engine enforces: a file that reads or updates the pane's state declares the atom itself; `$` goes only into `function` declarations across files, never arrow functions or object methods.

The idea of puzzles in a pane while Claude works comes from [cclichess](https://github.com/MrtnsK/cclichess) by MrtnsK. This project is a separate implementation.

## Not affiliated

chess-break is not affiliated with, endorsed by or sponsored by Lichess or Chess.com. Each puzzle links back to its page on the site it comes from.

## License

MIT, see `LICENSE`. chess.js, in `hooks/vendor/`, is BSD-2-Clause.
