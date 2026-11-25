# puzzle-storm

## Purpose

A timed run of puzzles for short waits.

## Requirements

### Requirement: A run
⚡ Storm and `/chess-break storm` SHALL start a run of puzzles from the offline set, the first rated under 1000 and each next one harder, with none repeated in a run. Its 3-minute clock SHALL start with the first move. Once the band of ratings has no puzzle left unseen, the run SHALL take a harder one, then any one not yet played in it. While a sign-in, a game's setup or a game holds the pane, `/chess-break storm` SHALL start no run and SHALL say why. A puzzle left for a run SHALL not count the time spent in the storm.

#### Scenario: Before the first move
- **WHEN** a run starts
- **THEN** the clock shows 3:00 and does not move

### Requirement: Solves and misses
A solved puzzle SHALL count and bring the next one at once, the opponent's answers played at once. A wrong move SHALL count as missed, take 10 seconds off the clock and bring the next puzzle. Storm puzzles SHALL NOT count toward progress, reviews, the daily goal or the solved list.

#### Scenario: A miss
- **WHEN** a wrong move is played 4 seconds into a run
- **THEN** the next puzzle shows and 2:46 is left

### Requirement: Combos
Each solve SHALL add one to the run's combo, and a miss SHALL set it back to zero. A combo of 5 SHALL win 3 s back, 12 win 5 s, 20 win 7 s, 30 win 10 s, and every 10 after 30 another 10 s; the time won SHALL be said above the next puzzle. The end of a run SHALL show its longest combo.

#### Scenario: Five in a row
- **WHEN** the fifth puzzle in a row is solved
- **THEN** the run has 3 s more and the pane says +3 s

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
