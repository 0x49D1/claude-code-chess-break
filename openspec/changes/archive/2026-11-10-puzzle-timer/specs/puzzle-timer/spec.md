# Spec Delta

## Purpose

Shows how long each puzzle takes, and keeps clean solve times so the statistics show whether solving gets faster.

## ADDED Requirements

### Requirement: A clock on each puzzle
The puzzle's title line SHALL end with its time, `⏱ m:ss`, from when the puzzle showed. While the puzzle is played and the pane is shown, it SHALL move each second. Once the puzzle ends, it SHALL show the puzzle's time and stop.

#### Scenario: Solved in 42 seconds
- **WHEN** a puzzle is solved 42 seconds after it showed
- **THEN** its title line ends with `⏱ 0:42`, and still does a while later

### Requirement: Time away does not count
When the pane opens on a puzzle with no move, mistake or help yet, its clock SHALL start again from 0:00.

#### Scenario: Pane opened again
- **WHEN** a puzzle showed, the pane closed with no move made, and it opens again a minute later
- **THEN** the clock shows `⏱ 0:00`

### Requirement: Solve times kept
A clean solve's time SHALL be kept overall and under each trained theme. A missed puzzle, or one solved with a mistake, a hint or the solution, SHALL NOT be counted, nor a solve over 10 minutes.

#### Scenario: A miss
- **WHEN** the solution is shown
- **THEN** no time is kept for it

### Requirement: Times in the statistics
📊 Progress and `/chess-break stats` SHALL show the average and fastest clean solve when there is one. `stats` SHALL end each theme's line with its average time.

#### Scenario: One solve
- **WHEN** one mate-in-1 puzzle was solved cleanly in 42 seconds
- **THEN** Progress shows `⏱ Clean solves: 0:42 on average, fastest 0:42`, and stats' mate-in-1 line ends with `· ⏱ 0:42`
