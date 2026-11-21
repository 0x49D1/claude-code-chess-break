# Proposal

## Why

Progress made a few puzzles at a time is hard to see. Once a week, a short look back says how many puzzles went in, how well, and which theme to work on.

## What Changes

First slice of the roadmap's "Weekly summary":

- **Puzzles by day:** every finished puzzle is also counted under its local day, solved cleanly or not, kept as long as the history (12 weeks). The history by theme cannot give it: a puzzle counts under each of its themes, and some have none.
- **Last week's card:** on the first pane opening of a week whose card was not seen, when last week (Monday to Sunday) had puzzles: puzzles played and solved cleanly with the share, the day streak and its best, the best and the weakest theme of those played at least 3 times.
- **✔ Got it**, or Esc, closes it until the next week.

Left for later slices: each theme's accuracy compared with the week before; a command to see the card again.

## Impact

- New: `hooks/training/summary.ts` (`weekOf`, `lastWeek`, `recordDay`, `weekSummary`), `hooks/app/summary.ts`, `hooks/ui/summary.tsx`, `tests/summary.test.ts`.
- Edits: `types/index.d.ts` (`WeekSummary`, `View.summary`), `hooks/app/state.ts` (`storedDays`), `hooks/app/actions.ts` (`record`, `openPane`), screen and Esc, `hooks/ui/pane.tsx`, `hooks/i18n/*`, README, ROADMAP, version 0.18.0.
