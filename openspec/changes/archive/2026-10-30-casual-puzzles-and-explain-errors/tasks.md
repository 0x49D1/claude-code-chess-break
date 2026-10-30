# Tasks

## 1. Explanation failures

- [x] 1.1 Add `ExplainFailure` to `types/index.d.ts`, and make `explanation.failed` that type. Add `explainFailure(r)` to `training/explain.ts` with the mapping in design.md, decision 3. Verify: in `tests/training.test.ts`, one case per row (429, `rate_limit`, `overloaded`, 503, `null` status, `authentication_failed`, `empty-reply`, `invalid_request`) gives the expected kind
- [x] 1.2 Give `explainFailed` the type `(why: ExplainFailure) => string` in `hooks/i18n/messages.ts`, with a `switch` in `en`, `fr`, `ru` and `ka`. Verify: `npx -p typescript tsc --noEmit -p .` is clean, and the languages test still passes
- [x] 1.3 In `explain` (`app/actions.ts`), map an unanswered result with `explainFailure`, and catch a rejection as `refused`. In `commands.ts`, drop the `?? '?'` fallback. Verify: in `tests/pane.test.ts`, a stubbed 429 shows the out-of-limits text and Explain again; a stubbed rejection shows the refused text with no "looking at it" line; pressing Explain again asks the model a second time; `/chess-break explain` answers the same text

## 2. Rated or casual puzzles

- [x] 2.1 Check that Lichess's `POST /api/puzzle/batch/{angle}` accepts `rated: false` and leaves the rating alone, from the Lichess API docs or its source (lila's puzzle controller), not a live account. Verify: write the answer, with its source, under this task before 2.3
  - Answer: yes. lila's `PuzzleForm.batch.Solution(id, win, rated: Rated = Rated.Yes)` takes `rated` per solution, so the mod sends it explicitly. In `PuzzleFinisher.apply`, a new puzzle with `rated.no` builds the round with the perf unchanged and skips the Glicko update, but `api.round.upsert` still stores the round and the play count goes up, so the puzzle counts as seen. In `PuzzleFinisher.batch`, `ratingDiff` is then 0. Sources: lila master, `modules/puzzle/src/main/PuzzleForm.scala`, `modules/puzzle/src/main/PuzzleFinisher.scala`, `app/controllers/Puzzle.scala` (`apiBatchSolve`), read 2026-10-30. The API docs page renders with JavaScript only and could not be read.
- [x] 2.2 Add the `ratedPuzzles` boolean option (default `true`, title "Rated puzzles") to `.claude-plugin/plugin.json`. Read it into `settings` in `register.ts`, add `isRated: true` to `INITIAL_VIEW`, and copy the setting into the view at `session.start`. Verify: `claude plugin validate .` passes
- [x] 2.3 Make `sendResult` send `rated: view.isRated`, and clear `ratingDiff` when it's false (design.md, decision 2). Verify: a test with a stubbed `http.fetch` sees `rated: false` in the body when the view is casual, and no rating change on the account line
- [x] 2.4 Add `switchRated($)` to `app/account.ts`: it flips `view.isRated`, then `$.config.set({ key: 'chess-break.ratedPuzzles', value })`, and logs a refusal to debug without throwing. Add the `c` button beside sign-out in `ui/pane.tsx`, labelled with new `rated`/`casual` texts in all four locales. Verify: in `tests/pane.test.ts`, signed in, pressing `c` shows "casual", calls `config.set` with `false`, and the next result is sent unrated; pressing it again shows "rated"; signed out, there's no `c` button
- [x] 2.5 README: the "Rated puzzles" option and the `c` key, in the settings and keys parts. Verify: the README names both

## 3. Done

- [x] 3.1 Run the three checks from AGENTS.md. Verify: `npx -p typescript tsc --noEmit -p .` is clean, `claude plugin test .` passes, and `claude plugin validate .` passes
- [x] 3.2 Remove the two lines this change covers from `ideas.txt`. Verify: they're gone from the file
