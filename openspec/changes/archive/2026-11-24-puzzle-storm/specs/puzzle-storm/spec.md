## ADDED Requirements


### Requirement: A run
⚡ Storm and `/chess-break storm` SHALL start a run of puzzles from the offline set, the first rated under 1000 and each next one harder, with none repeated in a run. Its 3-minute clock SHALL start with the first move.

#### Scenario: Before the first move
- **WHEN** a run starts
- **THEN** the clock shows 3:00 and does not move

### Requirement: Solves and misses
A solved puzzle SHALL count and bring the next one at once, the opponent's answers played at once. A wrong move SHALL count as missed, take 10 seconds off the clock and bring the next puzzle. Storm puzzles SHALL NOT count toward progress, reviews, the daily goal or the solved list.

#### Scenario: A miss
- **WHEN** a wrong move is played 4 seconds into a run
- **THEN** the next puzzle shows and 2:46 is left

### Requirement: The end of a run
When the time runs out, no move SHALL play. The pane SHALL show the run's solves and misses, and whether it beat the best run, which SHALL be kept across sessions. 🔄 Again SHALL start a new run, and ← Back or Esc SHALL return to the puzzle.

#### Scenario: A new best
- **WHEN** a run ends with 1 solved and the best was 0
- **THEN** the pane says it is a new best and 1 is kept

### Requirement: The pane during a run
While a run is on, Claude finishing SHALL NOT close the pane. A move typed with `/chess-break <move>` SHALL go to the run.

#### Scenario: Claude finishes
- **WHEN** Claude's turn ends during a run
- **THEN** the pane stays open
