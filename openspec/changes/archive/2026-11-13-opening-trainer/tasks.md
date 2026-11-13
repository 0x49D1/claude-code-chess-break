# Tasks

- [x] 1.1 Types: `Puzzle.source` takes `'opening'`; `View.isOpeningsShown`.
- [x] 1.2 `hooks/training/openings.ts`: `OPENINGS`, `findOpening`, `openingPuzzle`. Verify: every line legal and ending on the person's move; a Black opening starts after White's first move.
- [x] 2.1 `hooks/app/openings.ts`: `openOpenings`, `closeOpenings`, `startOpening`. `screenOf` and `stepBack` know the screen.
- [x] 3.1 `hooks/i18n/*`: the screen's and the command's texts, in en, fr, ru, ka.
- [x] 3.2 `hooks/ui/openings.tsx`, the sidebar button and the route. `hooks/commands.ts`: `opening`. Verify: pane test picks the Najdorf and plays it; a wrong move in the Italian brings it back the next day; the command lists, starts, refuses.
- [x] 4.1 README, ROADMAP, CHANGELOG, version 0.12.0, `hooks/release.ts`; tsc, tests, validate.
