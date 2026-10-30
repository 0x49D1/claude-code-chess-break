# Design

## Context

- `/config` options reach the mod only through `register(on, options)`, which copies them into the module-level `settings` in `hooks/app/state.ts`. The pane draws from the `view` atom, not from `settings`.
- `sendResult` in `hooks/app/account.ts` posts `{ id, win, rated: true }` to `/api/puzzle/batch/<theme>` and shows the `glicko.rating` and `rounds[0].ratingDiff` from the answer.
- `explain` in `hooks/app/actions.ts` awaits `$.model.complete`. That call resolves `{ isAnswered: false, reason }` for `api-error` (with `status: number | null` and `error`, a kind such as `rate_limit`, `overloaded` or `authentication_failed`), `empty-reply` or `aborted`. It rejects only when the engine refuses to send. The view keeps `explanation: { puzzleId, text?, failed?: string }`, and `failed` is the raw `reason`.

## Goals / Non-Goals

**Goals:**
- The rated choice is drawn from the view, so the pane redraws when it switches, and saved in `/config`, so there is one place to see it.
- An explanation failure is a value, put into words only in `hooks/i18n`, as AGENTS.md asks.

**Non-Goals:**
- Telling a subscription usage limit apart from an API rate limit: both come back as 429 / `rate_limit`, and both mean "not now".
- Showing when the limit resets: the result doesn't carry it.

## Decisions

**1. `isRated` lives in the view, and `/config` saves it.**
`INITIAL_VIEW` gets `isRated: true`. At `session.start`, `register.ts` sets it from `settings.ratedPuzzles`. The pane's key calls a new action, `switchRated($)` in `app/account.ts`, which flips `view.isRated` and then calls `$.config.set({ key: 'chess-break.ratedPuzzles', value })`. `sendResult` reads `view.isRated`.
- *Instead: read `settings.ratedPuzzles` directly.* The pane would not redraw on a switch, and it would depend on whether `$.config.set` reloads the module.
- *Instead: keep it in `$.store`.* That's a second place for one choice, and `/config` would show something else.
- If `$.config.set` is refused (a deny), the view keeps the switch for this session and the debug log says why. Nothing is thrown.

**2. A casual result clears the rating change.**
When `rated` is false, `sendResult` still posts, still updates the rating from `glicko` (it should not change), and sets `ratingDiff: undefined`, so the account line shows no `(+0)`.

**3. `ExplainFailure` is a union, mapped in the core.**
`types/index.d.ts`: `ExplainFailure = 'limit' | 'busy' | 'offline' | 'signedOut' | 'empty' | 'refused' | 'other'`, and `explanation.failed?: ExplainFailure`.
`explainFailure(r)` in `training/explain.ts` maps an unanswered `ModelCompleteResult` (type-only import from `claude-code`):
- `api-error` with status 429 or `rate_limit` → `limit`;
- `overloaded`, 529 or another 5xx → `busy`;
- `null` status → `offline`;
- `authentication_failed`, 401 or 403 → `signedOut`;
- `empty-reply` → `empty`;
- anything else (`invalid_request`, `aborted`, `unknown`) → `other`.

`explain` wraps the call in `try`/`catch`, and a rejection becomes `refused`. `messages.explainFailed` becomes `(why: ExplainFailure) => string`, with a `switch` the compiler checks, in each of the four locales.
- *Instead: keep a string and build the text in `explain`.* AGENTS.md rules that out: a new outcome is a new kind.

**4. The key is `c`, on the account line.**
`c` is free (the taken keys are e, h, j, k, l, n, r, s). The button sits beside "sign out", so it only shows when someone is signed in. Its label is "casual" while results are casual and "rated" otherwise, so the line itself shows the state.

## Risks / Trade-offs

- [`$.config.set` may reload the module and run `register` again] → `session.start` is what copies `settings.ratedPuzzles` into the view, and the view already holds the new value, so a reload changes nothing. A pane test checks the value after a switch.
- [Lichess may refuse `rated: false` for an account with no puzzle history, or ignore it] → Task 1.1 checks the API's answer to a casual result before the code relies on it. If Lichess ignores it, the change stops at the pane and says so.
- [What an out-of-limits completion really returns isn't documented beyond 429 / `rate_limit`] → `other` still names a failure in words, and the stubbed tests cover each reason the types list.
