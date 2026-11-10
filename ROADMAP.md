# Roadmap

The agreed feature list, in order. A daily run ships one version: code review and real bugs first, then the next open item here. A big item ships in usable slices across days. Done items say their version.

## This list (agreed 2026-11-10)

- [ ] **Puzzles from my own games:** the mistakes the game review finds become puzzles that come back like missed puzzles.
- [ ] **Opening trainer:** pick a few openings; it quizzes the next move, and misses come back until learned.
- [ ] **Endgame drills:** short practice positions (king and pawn, rook endgames) played against Stockfish until converted.
- [ ] **Weekly summary:** a card each Monday with puzzles solved, accuracy per theme, streak, best and weakest theme.
- [ ] **Puzzle Storm mode:** a 3-minute timed run of easy puzzles for short waits.
- [ ] **Puzzle timer:** each puzzle's time shown while solving, and kept: average and fastest times in 📊 Progress and `/chess-break stats`.

## Done

- [x] **Daily goal** with the day streak: 0.3.0
- [x] **Progress view** per theme, with Lichess's numbers: 0.4.0
- [x] **Game review** from Lichess's computer analysis: 0.5.0
- [x] **About** with what's new and the GitHub link: 0.6.0

## Releases

Every version bump adds its lines to `CHANGELOG.md`. On the push to `main`, `.github/workflows/release.yml` tags it `v<version>` and publishes a GitHub release with those lines.
