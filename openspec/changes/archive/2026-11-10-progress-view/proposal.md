# Proposal

## Why

The mod keeps one running total per theme, with no dates. It can say a theme is weak overall, but not whether it is getting better, or how it stands on Lichess. Accuracy per theme by week, next to Lichess's own numbers, makes the weak themes stand out and shows whether training them helps.

## What Changes

- **A history by day:** each finished puzzle is also counted under its local day and its themes (the trained ones, as progress counts them). The last 12 weeks are kept; older days are dropped.
- **A progress screen in the pane:** `📊 Progress` in the sidebar (`p`) opens it, `← Back` closes it. One row per theme tried in the last 4 weeks: accuracy for each of the 4 weeks as a small bar (`▂▄▆█`, `·` for a week with none), and the 4 weeks' accuracy. Weakest first.
- **Lichess's numbers:** signed in to Lichess, each row also shows Lichess's performance rating and first-try accuracy for the theme over the last 30 days, from its puzzle dashboard. Themes played only on Lichess are listed too. Read when the screen opens; a failure says so in one line and leaves the rest.
- **`/chess-break stats`:** each theme line gets the 4 weeks' bar and, signed in, the Lichess performance rating.

Out of scope:
- charts over more than 4 weeks;
- the overall Lichess puzzle rating history (the rating shown now stays);
- Chess.com numbers: its API gives no per-theme results.

## Capabilities

### New Capabilities
- `progress-view`: the history by day, the progress screen, Lichess's per-theme numbers, and the trend in `/chess-break stats`.

### Modified Capabilities
None.

## Impact

- New: `hooks/training/history.ts` (pure), `hooks/lichess/dashboard.ts` (pure), `hooks/app/progress.ts`, `hooks/ui/progress.tsx`, `tests/history.test.ts`, `tests/progress-pane.test.ts`.
- Edits: `types/index.d.ts`, `hooks/app/state.ts`, `hooks/app/actions.ts` (`record`), `hooks/training/daily.ts` (`lastDays`), `hooks/training/progress.ts` (export the trained themes), `hooks/ui/pane.tsx` (button, route), `hooks/commands.ts` (`stats`), `hooks/i18n/*`, `.claude-plugin/plugin.json` (0.4.0), `README.md`.
- Network: `GET lichess.org/api/puzzle/dashboard/30` with the stored token; the `puzzle:read` scope is already asked for.
