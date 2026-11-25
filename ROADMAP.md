# Roadmap

The agreed feature list, in order. A daily run ships one version: code review and real bugs first, then the next open item here. A big item ships in usable slices across days. Done items say their version.

## This list (agreed 2026-11-10)

- [ ] **Puzzles from my own games:** the mistakes the game review finds become puzzles that come back like missed puzzles.
  - [x] Slice 1, 0.9.0: the review's costliest moves come back as one-move puzzles, through the review queue.
  - [x] Slice 2, 0.11.0: the **Puzzles from my games** setting, on by default. Correspondence games were already covered: a finished one gets the same review.
  - [ ] Left, both waiting: Chess.com games (after the `chesscom-account` change shows them); a longer line where the engine's is forced (Lichess's analysis doesn't say which lines are).
- [x] **Opening trainer:** pick a few openings; it quizzes the next move, and misses come back until learned.
  - [x] Slice 1, 0.12.0: eight built-in main lines, picked from 📖 Openings or `/chess-break opening <name>`, played as puzzles; a miss comes back through the review queue.
  - [x] Slice 2, 0.13.0: a set marked with ☑, drilled in turn (▶ Drill my set, `/chess-break opening next`); Explain asks about an opening's plans.
  - [x] Slice 3, 0.14.0: each main line's most common deviation, sixteen openings in all.
  - [x] Done for now: accepting transpositions is left out. A drill's line fixes the other side's replies, so another move order has no reply in it to play: that needs a tree of moves per opening, a change of its own if wanted.
- [ ] **Endgame drills:** short practice positions (king and pawn, rook endgames) played against Stockfish until converted.
  - [x] Slice 1, 0.15.0: four won positions (KQ v K, KR v K, KP v K with the king in front, Lucena) played against Stockfish level 8 from the position, as casual Lichess games; 🔄 replays one.
  - [x] Slice 2, 0.16.0: each drill's result kept (✅ converted, ⏳ tried), and the ones not yet converted listed first.
  - [x] Slice 3, 0.17.0: three more won positions: two bishops, bishop and knight, queen against rook.
  - [ ] Left, waiting: drills to hold a draw (Philidor) or played as Black. They need a drill's goal (a draw counted as converted), the review's mistake reader counting from Black, and positions checked against a tablebase before they ship. A drill with Black to move first also needs the review's mistake reader (`readAnalysis`) to count plies from the start's side, not from White.
- [x] **Weekly summary:** a card each Monday with puzzles solved, accuracy per theme, streak, best and weakest theme.
  - [x] Slice 1, 0.18.0: last week's card on the week's first pane: puzzles played and solved cleanly, the day streak, best and weakest theme; shown once a week. Puzzle totals per day are kept from this version on.
  - [x] Slice 2, 0.19.0: the five most played themes' accuracy against the week before, and `/chess-break week` to see the card again.
- [ ] **Puzzle Storm mode:** a 3-minute timed run of easy puzzles for short waits.
  - [x] Slice 1, 0.20.0: ⚡ Storm and `/chess-break storm`. A run uses puzzles from the offline set, easy first and getting harder. A miss costs 10 s, the clock starts with the first move, and the best run is kept.
  - [x] Slice 2, 0.21.0: solves in a row win time back: 3 s at 5, 5 s at 12, 7 s at 20, 10 s at 30 and every 10 more. A miss ends the combo, and a run's end shows its longest one.
  - [ ] Left: the runs in 📊 Progress (the last few, the best by week).

## Done

- [x] **Daily goal** with the day streak: 0.3.0
- [x] **Progress view** per theme, with Lichess's numbers: 0.4.0
- [x] **Game review** from Lichess's computer analysis: 0.5.0
- [x] **About** with what's new and the GitHub link: 0.6.0
- [x] **Puzzle timer**, with average and fastest solve times in the statistics: 0.7.0 (from the first move: 0.7.1)
- [x] **No repeats** of puzzles solved cleanly: 0.8.0

## Releases

Every version bump adds its lines to `CHANGELOG.md`. On the push to `main`, `.github/workflows/release.yml` tags it `v<version>` and publishes a GitHub release with those lines.
