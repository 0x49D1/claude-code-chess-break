# Spec Delta

## Purpose

Keeps the puzzles a person has solved cleanly from being offered again as new puzzles, while missed ones can come back.

## ADDED Requirements

### Requirement: Solved puzzles kept
A puzzle solved cleanly SHALL be kept as solved across sessions, the last 5,000 at most. A missed puzzle, or one solved with a mistake, a hint or the solution, SHALL NOT be kept.

#### Scenario: Solved cleanly
- **WHEN** a puzzle is solved with no mistake and no help
- **THEN** it is kept as solved

### Requirement: Not offered again
A new puzzle SHALL NOT be one kept as solved when another can be had: offline, a solved puzzle SHALL be skipped while the theme has unsolved ones; from Lichess or Chess.com, a solved one SHALL be asked for again, up to 3 tries in all, then taken. Puzzles due for review SHALL come as before.

#### Scenario: Lichess offers it again
- **WHEN** Lichess answers with a puzzle solved before, then with a new one
- **THEN** the new one shows

#### Scenario: A missed puzzle
- **WHEN** a missed puzzle is offered again as a new puzzle
- **THEN** it shows
