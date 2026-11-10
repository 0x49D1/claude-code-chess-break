# Proposal

## Why

Puzzles come one at a time while Claude works, with nothing to aim at across a day. A small daily target, and a count of the days in a row it was met, give a reason to come back each day without asking for long sessions.

## What Changes

- **A daily goal:** a number of puzzles a day, 5 by default, set in `/config` (**Daily goal**). 0 turns it off.
- **What counts:** every finished puzzle, solved or missed, new or a review. A puzzle counts once, as progress does now.
- **The day:** the person's local calendar day. A new day starts the count at 0.
- **The day streak:** the days in a row the goal was met, and the best such run. A day missed ends the streak; today not yet met keeps yesterday's streak alive until the day ends.
- **In the pane:** one sidebar line under the session marks: `🎯 Today 3/5 · 📅 4 days in a row`, a ✅ once today's goal is met, and no streak part while it is 0.
- **Kept across sessions** in the store, as progress is.

Out of scope:
- a toast or sound when the goal is met;
- the prompt line under the prompt: it stays as it is;
- `/chess-break stats`: the goal is in the pane only;
- goals per theme, or by time spent.

## Capabilities

### New Capabilities
- `daily-goal`: the daily puzzle target, what counts towards it, the day streak, and how the pane shows them.

### Modified Capabilities
None.

## Impact

- New: `hooks/training/daily.ts` (pure), `tests/daily.test.ts`.
- Edits:
  - `types/index.d.ts`: the `Daily` type and a `daily` view field;
  - `hooks/app/state.ts`: the setting, the initial value, `storedDaily`;
  - `hooks/app/actions.ts`: `record` counts the puzzle for the day;
  - `hooks/register.ts`: reads the setting and the stored day;
  - `hooks/ui/pane.tsx`: the sidebar line;
  - `hooks/i18n/*`: two texts in four languages;
  - `.claude-plugin/plugin.json`: the setting, version 0.3.0;
  - `README.md`.
- No network, no new dependency.
