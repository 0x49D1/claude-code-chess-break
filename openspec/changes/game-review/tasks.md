# Tasks

## 1. Pure core

- [x] 1.1 Types: `Judgment`, `Mistake`, `GameAnalysis`; view field `analysis`.
- [x] 1.2 `hooks/lichess/analysis.ts`: `exportUrl`, `readAnalysis`. Verify: `tests/analysis.test.ts`: no analysis yet, white's and black's mistakes only, the order and the cap, mate, the better move, errors.

## 2. Actions

- [x] 2.1 `hooks/app/analysis.ts`: `reviewGame`, `checkAnalysis`, the poller. `hooks/app/game.ts`: `leaveGame` clears `analysis`.

## 3. Pane and texts

- [x] 3.1 `hooks/i18n/*`: the review texts in en, fr, ru, ka.
- [x] 3.2 `hooks/ui/analysis.tsx` and its line in `hooks/ui/game.tsx`. Verify: pane tests: offered after a game, waiting then ready by polling, a press shows the position, gave up then check again, no mistakes, aborted.

## 4. Done

- [x] 4.1 README; version 0.5.0.
- [x] 4.2 `claude plugin test .`, `claude plugin validate .` pass.
