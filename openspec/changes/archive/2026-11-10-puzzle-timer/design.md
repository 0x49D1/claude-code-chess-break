# Design

## Decisions

**1. `startedAt` and `elapsedMs` on the attempt.** The clock is drawn from them at each draw, which already reads `$.clock.now()`; `record` sets `elapsedMs` once.

**2. One place starts the clock,** `startClock` in `hooks/app/actions.ts`, from `loadNext` and `openPane`. It resets an untouched puzzle's `startedAt`, so a puzzle loaded at the end of a turn is timed from when it is seen.

**3. A redraw each second only while useful.** `puzzleTick` (module state, as `tick` in `app/game.ts`) invalidates `ui.render` while a puzzle is played and the pane is shown, and stops itself otherwise; opening the pane starts it again. A test that moves the clock a day therefore runs one tick, not 86,400.

**4. Times are their own store,** `times`: `{ all, themes }` of `{ count, totalMs, fastestMs }`, read with checks. Clean solves only, under 10 minutes, so an attempt left open while away does not skew the average.
