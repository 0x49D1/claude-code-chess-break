# Proposal

## Why

Solving faster is part of getting better at tactics, and a wait for Claude is short. A clock on each puzzle, and the times kept, show whether patterns are coming quicker.

## What Changes

- **A clock on each puzzle:** `⏱ 0:42` at the end of the puzzle's title line, moving each second while the pane is shown, stopped at the puzzle's time once it ends.
- **Time away does not count:** the clock starts when the puzzle shows; a puzzle not yet touched starts again from 0:00 when the pane opens again.
- **Times kept:** clean solves only (no mistake, hint or solution), each under 10 minutes, overall and by trained theme.
- **In the statistics:** 📊 Progress and `/chess-break stats` show the average and fastest clean solve; `stats` adds each theme's average.

## Capabilities

### New Capabilities
- `puzzle-timer`: the clock on each puzzle and the solve times kept.

## Impact

- New: `hooks/training/timing.ts`, `tests/timing.test.ts`.
- Edits: `types/index.d.ts`, `hooks/app/state.ts` (`storedTimes`), `hooks/app/actions.ts` (`startClock`, `record`), `hooks/register.ts`, `hooks/ui/pane.tsx`, `hooks/ui/progress.tsx`, `hooks/commands.ts`, `hooks/i18n/*`, version 0.7.0.
