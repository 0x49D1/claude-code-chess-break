# Design

## Context

- `record($, attempt, isWin)` in `hooks/app/actions.ts` counts each finished puzzle once (`isRecorded`): progress and the review queue. The day count goes in the same place.
- `Progress.streak` is the clean-puzzle streak, shown as `🔥 Streak 3 · best 5`. The day streak is a separate value with its own words.
- `$.clock.now()` gives the time; tests drive it with `mock.clock`.
- `userConfig` accepts `"type": "number"` (checked with `claude plugin validate`).

## Decisions

**1. One stored record, `daily`.** `{ day, done, metOn?, streak, best }`: the local day counted, its count, the last met day, the streak as of that day, and the best. Read with field checks in `storedDaily`, as data from the store is.

**2. Days are local calendar strings.** `dayOf(time)` gives `2026-11-10` from the local date. The day before is found from the calendar (noon of the date minus one), so a summer-time change never skips or doubles a day.

**3. Pure core in `hooks/training/daily.ts`.**
- `recordDaily(daily, now, goal)`: counts one puzzle; when the count reaches the goal and today was not yet met, today becomes met and the streak grows from yesterday's or starts at 1.
- `todayOf(daily, now)`: what the pane shows: today's count (0 on a new day), the streak if its last met day is today or yesterday (else 0), and whether today is met.
- Comparing `done >= goal` rather than `===` lets a goal lowered during the day be met with the next puzzle.

**4. The pane reads the clock when drawing,** so a day that ends while the pane is open shows 0 and the right streak at the next draw, with no timer.

## Risks / Trade-offs

- A machine clock or time zone change can count a day twice or skip one. Accepted: it is a training aid, not a record.
