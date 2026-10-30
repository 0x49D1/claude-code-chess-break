# Proposal

## Why

Two gaps, both from `ideas.txt`:

- **Every puzzle is rated once you sign in.** `sendResult` in `hooks/app/account.ts` always sends `rated: true`. There is no way to warm up, or to try puzzles above your level, without losing rating.
- **When Claude is out of limits, Explain gives no clear error.** An API error shows as "No explanation (api-error)", which doesn't say what went wrong. If `$.model.complete` rejects, `explain` never catches it: the pane stays on "Claude is looking at it…" forever, and `void explain($)` in the pane has no `.catch`.

## What Changes

- **Rated or casual puzzles, when signed in to Lichess:**
  - a new `/config` option, "Rated puzzles", on by default;
  - a pane key (`c`) on the account line that switches it on the spot and saves it to the same option;
  - the account line says "casual" when it's off;
  - a casual result is still sent to Lichess with `rated: false`, so the puzzle counts as seen and doesn't come back. The rating doesn't move, and the pane shows no rating change.
- **Explain failures in words:**
  - the reason becomes a typed outcome instead of a raw string: out of limits (`rate_limit`, HTTP 429), busy (`overloaded`, 5xx), offline (no response), signed out (`authentication_failed`), no reply (`empty-reply`), or refused (the call rejected);
  - each outcome gets its own text in `en`, `fr`, `ru` and `ka`, in the pane and in `/chess-break explain`;
  - a rejected call ends as a failure, not a spinner that never ends, and Explain can be pressed again.

Out of scope: a `/chess-break rated on|off` command, unrated games (games already have their own rated setting), retrying on its own after a limit.

## Capabilities

### New Capabilities
- `puzzle-rating`: whether a signed-in person's Lichess puzzles count for their rating, and how they switch it.
- `puzzle-explanation`: Claude's explanation of a finished puzzle, and what the person sees when it can't be had.

### Modified Capabilities
None: `openspec/specs/` has no specs yet.

## Impact

- `.claude-plugin/plugin.json`: the `ratedPuzzles` option.
- `hooks/register.ts`, `hooks/app/state.ts`: reading the option into `settings` and the view.
- `hooks/app/account.ts`: `sendResult` sends the choice, and a new action switches it.
- `hooks/app/actions.ts`: `explain` catches and maps failures.
- `hooks/training/explain.ts`: the mapping from a model result to an outcome (pure, tested).
- `types/index.d.ts`: `ExplainFailure`, the view's `isRated`.
- `hooks/ui/pane.tsx`, `hooks/commands.ts`, `hooks/i18n/*`: the key, the "casual" mark, the failure texts.
- `README.md`: the option and the key.
- Tests: `tests/training.test.ts`, `tests/pane.test.ts`.
