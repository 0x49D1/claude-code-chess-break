# Roadmap

The agreed feature list, in order. A daily run ships one version: code review and real bugs first, then the next open item here. A big item ships in usable slices across days. Done items say their version.

## This list (agreed 2026-11-10)

- [ ] **Puzzles from my own games:** the mistakes the game review finds become puzzles that come back like missed puzzles.
  - [x] Slice 1, 0.9.0: the review's costliest moves come back as one-move puzzles, through the review queue.
  - [x] Slice 2, 0.11.0: the **Puzzles from my games** setting, on by default. Correspondence games were already covered: a finished one gets the same review.
  - [ ] Left: Chess.com games (after the `chesscom-account` change shows them); a longer line where the engine's is forced.
- [ ] **Opening trainer:** pick a few openings; it quizzes the next move, and misses come back until learned.
- [ ] **Endgame drills:** short practice positions (king and pawn, rook endgames) played against Stockfish until converted.
- [ ] **Weekly summary:** a card each Monday with puzzles solved, accuracy per theme, streak, best and weakest theme.
- [ ] **Puzzle Storm mode:** a 3-minute timed run of easy puzzles for short waits.

## Done

- [x] **Daily goal** with the day streak: 0.3.0
- [x] **Progress view** per theme, with Lichess's numbers: 0.4.0
- [x] **Game review** from Lichess's computer analysis: 0.5.0
- [x] **About** with what's new and the GitHub link: 0.6.0
- [x] **Puzzle timer**, with average and fastest solve times in the statistics: 0.7.0 (from the first move: 0.7.1)
- [x] **No repeats** of puzzles solved cleanly: 0.8.0

## Releases

Every version bump adds its lines to `CHANGELOG.md`. On the push to `main`, `.github/workflows/release.yml` tags it `v<version>` and publishes a GitHub release with those lines.
