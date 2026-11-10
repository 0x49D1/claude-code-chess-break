# Proposal

## Why

Signed out of Lichess, from Chess.com, or offline, a new puzzle is picked at random and can be one already solved. A puzzle solved once teaches less the second time; one missed is worth meeting again.

## What Changes

- The ids of puzzles solved cleanly are kept (the last 5,000), across sessions.
- Offline, a solved puzzle is skipped; once every puzzle on the theme is solved, they come again rather than none.
- From Lichess or Chess.com, a solved puzzle is asked for again, up to 3 tries, then taken rather than none. Signed in, Lichess already gives unseen puzzles.
- Missed puzzles, or ones solved with a hint or the solution, are not kept: they can come again as new puzzles, as well as through the review queue.

## Impact

- New: `hooks/training/solved.ts`, `tests/solved.test.ts`. Edits: `hooks/app/state.ts` (`storedSolved`), `hooks/app/actions.ts` (`loadNext`, `record`). Version 0.8.0.
