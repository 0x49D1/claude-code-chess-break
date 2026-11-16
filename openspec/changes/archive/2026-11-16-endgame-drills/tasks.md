# Tasks

- [x] 1.1 Types: `GameSettings.fen`, `Game.initialFen`, `View.isEndgamesShown`.
- [x] 1.2 `initialFen` read from `gameFull`; `fen` sent with the challenge; `startOf` and `toMove` in place of `START` and move-count parity. Verify: tests for the read, the form and `toMove` from Black to move; every existing test passes.
- [x] 1.3 `hooks/training/endgames.ts`: four positions and `drillSettings`. Verify: each legal, White to move.
- [x] 2.1 `hooks/app/endgames.ts`; a drill not saved as setup choices; screen and Esc.
- [x] 3.1 Texts in en, fr, ru, ka; `hooks/ui/endgames.tsx`; the 🏆 button. Verify: a pane test starts the KR drill, checks the challenge, the board and the choices.
- [x] 4.1 README, ROADMAP, CHANGELOG, version 0.15.0, `hooks/release.ts`; tsc, tests, validate.
