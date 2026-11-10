# puzzle-timer Specification

## Purpose

Shows how long each puzzle takes, and keeps clean solve times so the statistics show whether solving gets faster.

## Requirements

### Requirement: A clock on each puzzle
The puzzle's title line SHALL end with its time, `⏱ m:ss`. While the puzzle is played and the pane is shown, it SHALL move each second. Once the puzzle ends, it SHALL show the puzzle's time and stop.

#### Scenario: Solved in 42 seconds
- **WHEN** a puzzle is solved 42 seconds after its first move
- **THEN** its title line ends with `⏱ 0:42`, and still does a while later

### Requirement: The clock starts with the first move
The pane can sit open unwatched, so the clock SHALL start with the person's first move tried, right or wrong, and show `⏱ 0:00` until then. A puzzle that ends with its first move SHALL have no time.

#### Scenario: A minute before the first move
- **WHEN** a puzzle shows, a minute passes, and the person then solves it in 42 seconds from their first move
- **THEN** its time is `0:42`

#### Scenario: One move
- **WHEN** a mate in 1 is solved
- **THEN** no time shows for it, and none is kept

### Requirement: Solve times kept
A clean solve's time SHALL be kept overall and under each trained theme. A missed puzzle, or one solved with a mistake, a hint or the solution, SHALL NOT be counted, nor a solve over 10 minutes, nor one with no time.

#### Scenario: A miss
- **WHEN** the solution is shown
- **THEN** no time is kept for it

### Requirement: Times in the statistics
📊 Progress and `/chess-break stats` SHALL show the average and fastest clean solve when there is one. `stats` SHALL end each theme's line with its average time.

#### Scenario: One solve
- **WHEN** one mate-in-1 puzzle was solved cleanly in 42 seconds
- **THEN** Progress shows `⏱ Clean solves: 0:42 on average, fastest 0:42`, and stats' mate-in-1 line ends with `· ⏱ 0:42`
