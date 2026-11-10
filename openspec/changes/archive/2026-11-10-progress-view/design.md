# Design

## Context

- `record` in `hooks/app/actions.ts` counts each finished puzzle once; history goes in the same place.
- `recordProgress` in `hooks/training/progress.ts` leaves out themes that are not skills (`NOT_SKILLS`); the history must count the same themes.
- `dayOf` in `hooks/training/daily.ts` gives local calendar days.
- Lichess's dashboard (`GET /api/puzzle/dashboard/{days}`, scope `puzzle:read`): `themes` keyed by theme, each with `results: { nb, firstWins, replayWins, puzzleRatingAvg, performance }`.

## Decisions

**1. History is `Record<day, Record<theme, Tally>>`,** stored as `history`, read with field checks. 84 days kept: enough for 4 weeks shown, with room to show more later.

**2. Weeks end today.** Week 4 is today and the 6 days before it; week 1 is days 21–27 back. A week is the sum of its days. `lastDays(now, n)` in `daily.ts` lists the days, newest first.

**3. Rows are built in one pure function,** `progressRows(history, now, lichess?)`: the union of themes with local results in 4 weeks and, signed in, Lichess's trained themes; each with its 4 week accuracies, its 4-week accuracy, and Lichess's result. Sorted by the local 4-week accuracy, then Lichess's, weakest first; themes with neither last.

**4. A bar per week:** `▁▂▃▄▅▆▇█` by eighths of accuracy, `·` for no puzzle.

**5. The dashboard lives in the view,** `dashboard?: { themes } | { failed }`, read each time the screen opens or stats runs. No cache: it is one small request on a press.

**6. The screen is a view flag,** `isProgressShown`, routed after the game and setup screens, so a game still takes the pane.

## Risks / Trade-offs

- Themes Lichess names that the mod does not translate fall back to the key, as theme names do now.
