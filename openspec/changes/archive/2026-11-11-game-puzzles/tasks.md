# Tasks

- [x] 1.1 `types/index.d.ts`: `Puzzle.source` takes `'game'`.
- [x] 1.2 `hooks/training/mistakes.ts`: `mistakePuzzles`. Verify: tests for the fool's mate (both puzzles, positions, last moves, solutions), and a better move that doesn't read.
- [x] 2.1 `hooks/app/analysis.ts`: add the cards once, refresh `dueCount`.
- [x] 3.1 `hooks/i18n/*`: `game.fromGame`, `game.comeBack` in en, fr, ru, ka.
- [x] 3.2 Titles in `hooks/ui/pane.tsx` and `hooks/ui/hint.tsx`; the line in `hooks/ui/analysis.tsx`. Verify: a pane test reviews the game, finds the line, and a day later plays the game's puzzle by its title. (Check again adding nothing: no pane path reaches it once a review is ready, so it rests on the queue's own check, `queue[p.id] ? queue : …`.)
- [x] 4.1 README, ROADMAP (slice 1 done, what is left), CHANGELOG, version 0.9.0, `hooks/release.ts`.
- [x] 4.2 tsc, `claude plugin test .`, `claude plugin validate .` pass.
