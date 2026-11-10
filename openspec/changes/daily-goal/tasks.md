# Tasks

## 1. Pure core

- [x] 1.1 Add `Daily` and the `daily` view field to `types/index.d.ts`.
- [x] 1.2 Write `hooks/training/daily.ts`: `NO_DAILY`, `dayOf`, `recordDaily`, `todayOf` (design.md, decisions 2–3). Verify: `tests/daily.test.ts` covers the goal met, a second day in a row, a day missed, a new day's count, goal 0, a goal lowered during the day.

## 2. Actions and settings

- [x] 2.1 `hooks/app/state.ts`: `settings.dailyGoal`, `daily` in `INITIAL_VIEW`, `storedDaily` with field checks.
- [x] 2.2 `hooks/app/actions.ts`: `record` counts the puzzle with `recordDaily` and stores it.
- [x] 2.3 `hooks/register.ts`: read `dailyGoal`, load the stored day at session start.
- [x] 2.4 `.claude-plugin/plugin.json`: the **Daily goal** setting; version 0.3.0.

## 3. Pane and texts

- [x] 3.1 `hooks/i18n/*`: `pane.today` and `pane.dayStreak` in en, fr, ru, ka.
- [x] 3.2 `hooks/ui/pane.tsx`: the sidebar line. Verify: a pane test solves a puzzle and finds `🎯 Today 1/5`, and with the goal at 1 finds `✅` and `📅 1 day in a row`; with the goal at 0 there is no line.

## 4. Done

- [x] 4.1 README: the setting and the line.
- [x] 4.2 `claude plugin test .`, `claude plugin validate .` pass; `npx -p typescript tsc --noEmit -p .` where the engine's types are present.
