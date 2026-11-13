# Design

## Decisions

**1. An opening is a `Puzzle`.** `openingPuzzle(opening)` replays the SAN line with `line`. As White: from the start, the whole line as the solution. As Black: from after White's first move, that move as `lastMove`, the rest as the solution. Each line ends on the person's move, so the attempt ends solved on it. Everything else (replies, mistakes, help, review, timer, Explain) is the puzzle's.

**2. `Puzzle.source` takes `'opening'`; `title` is the opening's name; `themes: ['opening']`,** Lichess's theme, so Progress counts it and Explain names it. `sendResult` sends only `lichess` puzzles.

**3. Names stay in English** in every language, as Lichess and most books name them; the screen's texts are translated.

**4. The screen is a view flag, `isOpeningsShown`,** placed in `screenOf` after About, so Esc's `stepBack` leaves it like the others.

**5. One strict line per opening.** A transposing move counts as wrong; a later slice can add accepted alternatives.
