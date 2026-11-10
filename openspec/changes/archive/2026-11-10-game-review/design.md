# Design

## Context

- Lichess's API has no endpoint to request a computer analysis. `GET /game/export/{id}?evals=true` with `Accept: application/json` includes `analysis` only once one was done: one entry per move, with `eval` (centipawns, white's view) or `mate`, and for an inaccurate move `best` (UCI), `variation` (SAN, starting with the better move) and `judgment.name` (`Inaccuracy`, `Mistake`, `Blunder`).
- Cloud evaluation (`/api/cloud-eval`) has cached positions only, mostly openings: not enough for a game.
- A finished game stays in the view with `replayPly` for the board; `gameAtPly` draws any ply.

## Decisions

**1. Pure reading in `hooks/lichess/analysis.ts`.** `readAnalysis(res, side)` gives `undefined` while there is no analysis, else the person's judged moves, costliest first, at most 3. The loss of move `i` is the evaluation after move `i - 1` minus after move `i`, from the person's side; before the first move it is 0.15 (Lichess's start). Evaluations are capped at ±1000 and a mate is ±1000, so a missed mate does not dwarf the rest.

**2. The better move is `variation`'s first word,** already SAN, falling back to `best`.

**3. Polling in `hooks/app/analysis.ts`,** one timer (`poller`, module state with a comment, as `tick` in `app/game.ts`): every 5 s, 36 times at most. Each tick stops it when the view's game is no longer the one reviewed. `leaveGame` clears `analysis`.

**4. State is a union,** `GameAnalysis`: `waiting`, `gaveUp`, `failed` (with why), `ready` (with mistakes), each with its `gameId`; the pane ignores one for another game.

**5. Drawing in `hooks/ui/analysis.tsx`,** called from the finished-game part of `hooks/ui/game.tsx`, to keep that file small.
