# Tasks

## 1. Pure core

- [x] 1.1 Types: `History`, `ThemeResult`, `Dashboard`; view fields `isProgressShown`, `dashboard`.
- [x] 1.2 `hooks/training/daily.ts`: `lastDays`. `hooks/training/progress.ts`: export `skills`.
- [x] 1.3 `hooks/training/history.ts`: `recordHistory`, `progressRows`, `spark`. Verify: `tests/history.test.ts` covers counting, the 84-day cut, weeks, the weakest first, Lichess-only themes, the bars.
- [x] 1.4 `hooks/lichess/dashboard.ts`: `DASHBOARD_URL`, `readDashboard` with checks. Verify: a test with a full answer, a missing field, bad JSON.

## 2. Actions

- [x] 2.1 `hooks/app/state.ts`: `storedHistory`. `hooks/app/actions.ts`: `record` counts the history.
- [x] 2.2 `hooks/app/progress.ts`: `openProgress`, `closeProgress`, `refreshDashboard`.

## 3. Pane, stats, texts

- [x] 3.1 `hooks/i18n/*`: the new texts in en, fr, ru, ka.
- [x] 3.2 `hooks/ui/progress.tsx` and the route and button in `hooks/ui/pane.tsx`. Verify: `tests/progress-pane.test.ts`: rows after a solved puzzle, back to the puzzle, Lichess numbers when signed in, the failure line.
- [x] 3.3 `hooks/commands.ts`: `stats` with the bars and Lichess.

## 4. Done

- [x] 4.1 README; version 0.4.0.
- [x] 4.2 `claude plugin test .`, `claude plugin validate .` pass.
