# chess-break

A [Claude Code](https://claude.com/claude-code) mod for **chess tactics training while Claude works**. Puzzles come from Lichess by theme, from Chess.com's daily puzzles, or from a set of 1,469 shipped with the mod for offline use. The ones you miss come back for review until you've learned them, and your progress is tracked per theme. For longer waits, play a live game on Lichess against Stockfish or a person.

## What it does

- **Train a theme:** forks, pins, back-rank mates, rook endgames… or a mix (`/chess-break themes` lists them).
- **Review what you miss:** a puzzle failed, or solved with a hint or the solution, comes back after 1 day. Solve it cleanly and it returns after 3 days, then 7, then it's learned. Due reviews come before new puzzles.
- **Replay and learn:** once a puzzle ends, click any move (or `j` / `k`) to see the board at that point. 🧠 Explain asks Claude why the solution works, with a tip to remember and a fact about the pattern, plus links to practise the theme on Lichess and read about it on Wikipedia.
- **See your progress:** `/chess-break stats` shows accuracy per theme, your streak and your weakest theme.
- **Play by clicking or typing:** click a piece to see its moves (dots) and captures (tinted squares). Or type the move (`Nf3`, `nf3`, `e2e4`, French `Cf3`); the legal moves that fit show as you type, and Enter plays the only one left.
- **A training card:** the board drawn like a printed diagram (one ink, white pieces outlined), with a sidebar for this session's results 🟩🟥, your streak 🔥, reviews due 🔁 and your top themes' accuracy.
- **Play a game on Lichess:** against Stockfish or a person, with clocks, in the same pane. See [Games](#games).
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

`/chess-break login` (or 🔑 in the pane) signs in to Lichess for **rated puzzles** and for [games](#games): new puzzles come from your account, results count toward your puzzle rating, and the sidebar shows it (`👤 you · ⭐ 1650 (+8)`).

- **In the browser:** approve on Lichess; a one-shot listener on `127.0.0.1` (needs `python3`) catches the answer and exits. Only puzzle and board permissions are asked for (`puzzle:read`, `puzzle:write`, `board:play`).
- **Or paste a personal token** in the pane, if the browser runs on another machine.
- The token is kept in the mod's local storage and never goes into the conversation: `/chess-break login <token>` is refused for that reason.
- **Rated or casual:** `c` in the pane (beside sign out) switches puzzles to casual and back. A casual result is still sent, so the puzzle isn't offered again, but the rating doesn't move. The choice is the **Rated puzzles** option in `/config`.
- `/chess-break logout` signs out and revokes the token on Lichess. Reviews and puzzles from Chess.com or the offline set stay local.

## Games

Games on Lichess, through its Board API. They need the sign-in, and `curl` (already on macOS, Windows 10 and later, and most Linux desktops) for the game's live stream. Puzzles don't need `curl`.

| Command | Game |
| --- | --- |
| `/chess-break play stockfish [1-8] [clock\|days] [white\|black\|random]` | against Stockfish, always casual. Clocks: `3+2`, `5+3`, `10+0`, `10+5`, `15+10`, `30+0`. Default: level 3, `10+0`, random |
| `/chess-break play human [clock\|days] [rated]` | against a person Lichess pairs you with, casual unless `rated`. Clocks: `10+0`, `10+5`, `15+10`, `30+0`, `30+20` (Lichess pairs apps like this one at rapid and classical only) |

Days per move, for a correspondence game: `1d`, `2d`, `3d`, `5d`, `7d`, `10d` or `14d`.

Or press 🤖 or 👤 in the pane: a setup screen offers the level, the clock or days, the colour, and casual or rated. ▶ Play starts the game. A live game against a person asks first: Lichess pairs you with a real opponent at once, so ▶ Play shows what is about to start, and only ✔ Find an opponent sends it (🔄 after a game asks the same way). The last choices come back next time, also after a game started by command.

- **Moves:** click, or type in the pane, or from the prompt (`/chess-break Nf3`), the same way as in puzzles.
- **Beside the board:** the moves between the two clocks (the latest ones when they don't fit), the pieces each side has taken, and who is ahead (`+3`). In a live game, your clock turns red under 30 seconds and one beep plays.
- **During the game:** `/chess-break resign` (twice within three seconds), `draw` (offer, or accept the opponent's), `draw no` (decline), `abort` (before both sides have moved). The same actions are buttons in the pane.
- **Takeback:** ↩ in the pane, or `/chess-break takeback`, against Stockfish only. Stockfish takes back your move and its reply. Against a person, takebacks are not offered, and theirs are declined.
- **The live game outlives Claude's turn:** the pane stays open, the line under the prompt shows the opponent, both clocks and whose move it is, and puzzles wait. A live game still on when a new session starts comes back.
- **The opponent moved:** when the pane is hidden, a toast names the move (`♞ Stockfish level 3 played Nf6`). With **Sound when the opponent moves** in `/config`, a short sound plays too.
- **At the end:** the result, the moves to replay (click one, or `j` / `k`), a link to the game on Lichess, 🔄 another game with the same settings, or 🧩 back to puzzles. Games don't count in puzzle progress.
- A sign-in made before games existed has no `board:play`: the first game asks you to sign in again.

### Correspondence games

A move per Claude turn, with no clock running while you read Claude's answer. You can have any number of them, beside at most one live game.

- **Games list:** the pane's sidebar lists every game you have on at Lichess. The ones awaiting your move come first, marked 👉. Press one to show it, and ☰ to come back. `/chess-break games` lists them too.
- **When Claude starts:** a game awaiting your move comes before puzzles, the one with the least time left first. A live game comes before both.
- **When Claude is done:** the pane closes, as after a puzzle. A correspondence game has no clock to lose on.
- **The line under the prompt** says how many games await your move (`⚔ 2 games await your move`) while the pane is hidden and no puzzle is under way.
- **Kept current:** the list is read when a session starts, when the pane opens, and every five minutes. A toast says when a game you are not looking at becomes yours to move.
- **A correspondence seek** waits in Lichess's lobby. The game joins your list once someone accepts it.

Sounds play on macOS and in the desktop app. A Linux or Windows terminal plays nothing.

## Install

In Claude Code (tested on 2.1.312), one step:

```
/plugin install chess-break --marketplace 0x49D1/claude-code-chess-break
```

Or from a terminal: `claude plugin install chess-break --marketplace 0x49D1/claude-code-chess-break`. Then start a new session and run `/chess-break`: the pane opens with a puzzle. The install says some options are not set yet: they all have defaults, so changing them in `/config` (or `/plugin configure chess-break@chess-break`) is up to you.

Claude Code older than 2.1.275 needs two steps:

```
/plugin marketplace add 0x49D1/claude-code-chess-break
```

Then, as a second command:

```
/plugin install chess-break@chess-break
```

**From a clone**, give its path instead: `/plugin install chess-break --marketplace /path/to/claude-code-chess-break`. The mod is then read from that folder: `git pull` and a new session (or `/reload-plugins`) update it.

**Requirements:** nothing for puzzles. The browser sign-in to Lichess needs `python3` (pasting a token doesn't), and [games](#games) need `curl`.

**Update** (installed from GitHub): `/plugin marketplace update chess-break`, then `/plugin update chess-break`. **Remove:** `/plugin uninstall chess-break`, then `/plugin marketplace remove chess-break` if you don't keep the marketplace.

**For development**, load the clone for one session without installing: `claude --plugin-dir /path/to/claude-code-chess-break`.

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
| `/chess-break play stockfish …` / `play human …` | a Lichess game, see [Games](#games) |
| `/chess-break resign` / `draw` / `draw no` / `abort` / `takeback` | during a game (`takeback` against Stockfish only) |
| `/chess-break games` | your games on Lichess, the one awaiting your move on the pane |
| `/chess-break login` / `logout` / `account` | Lichess account, for rated puzzles and games |
| `/chess-break lang auto` / `en` / `fr` / `ru` / `ka` | language |

In the pane: `h` hint, `s` solution, `n` next, `e` explain, `c` rated or casual (signed in), `j` / `k` replay of a finished puzzle or game (outside the move field). Esc returns to the prompt.

## Settings (`/config`)

- **Open while Claude works** (on by default)
- **Puzzle line under the prompt** (on by default)
- **Sound when the opponent moves** (off by default): in a Lichess game with the pane hidden; macOS and the desktop app only
- **Rated puzzles** (on by default): signed in to Lichess, puzzles count for your rating; off, they are casual
- **Puzzles from**: lichess, chesscom, offline
- **Difficulty**: easiest → hardest, for new Lichess puzzles
- **Language**: auto, en, fr, ru, ka

## Development

```
claude plugin validate .
npx -p typescript tsc --noEmit -p .
claude plugin test .
claude --plugin-dir .
```

Before changing code, read [`AGENTS.md`](AGENTS.md): how the code is laid out and written, and what done means. Claude Code reads it on its own.

| Folder | What's in it |
| --- | --- |
| `hooks/chess/` | a thin layer over chess.js: reading typed moves, completions |
| `hooks/lichess/` | Lichess addresses and answers, sign-in (PKCE, the redirect listener), the Board API's game events |
| `hooks/chesscom/` | Chess.com's daily puzzle answers |
| `hooks/offline/` | the shipped puzzle set (generated, CC0) |
| `hooks/training/` | an attempt at a puzzle, a game's moves and clocks, the review queue, progress, themes (no `$`, all tested directly) |
| `hooks/i18n/` | every text, one file per language, typed by `Messages` |
| `hooks/app/` | state and the actions that use `$`, the game streams through `curl` |
| `hooks/ui/` | the board and the pane |
| `hooks/vendor/` | chess.js 1.4.0 (BSD-2-Clause, see `chess.js.LICENSE`), copied because a mod can only import its own files |

A few rules the mod engine enforces: a file that reads or updates the pane's state declares the atom itself; `$` goes only into `function` declarations across files, never arrow functions or object methods.

The idea of puzzles in a pane while Claude works comes from [cclichess](https://github.com/MrtnsK/cclichess) by MrtnsK. This project is a separate implementation.

Live Lichess games in the pane follow the idea of [vibe-gambit](https://github.com/PopFlamingo/vibe-gambit) by PopFlamingo: playing through Lichess's Board API while Claude works. Only the idea and Lichess's public API are shared, no code.

## Not affiliated

chess-break is not affiliated with, endorsed by or sponsored by Lichess or Chess.com. Each puzzle links back to its page on the site it comes from.

## License

MIT, see `LICENSE`. chess.js, in `hooks/vendor/`, is BSD-2-Clause.
