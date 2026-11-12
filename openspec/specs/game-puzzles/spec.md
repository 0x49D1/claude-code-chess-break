# game-puzzles Specification

## Purpose

Turns the person's costliest moves in a reviewed Lichess game into puzzles that come back until learned.

## Requirements

### Requirement: Mistakes become puzzles
When a game's review shows the person's costliest moves, each SHALL become a puzzle: from the position before the move, with Lichess's better move as its solution, and the opponent's move before it as its last move. A better move that is not legal there SHALL be skipped.

#### Scenario: Two mistakes
- **WHEN** the review shows `2. g4?? … better Nf3` and `1. f3?! … better e4`
- **THEN** two puzzles are made: one after 1. f3 e5 with solution Nf3, one from the start with solution e4

### Requirement: They come back as missed puzzles
Each such puzzle SHALL join the review queue as a missed puzzle, due the next day. A puzzle already in the queue SHALL be left as it is. The review SHALL say the moves come back as puzzles.

#### Scenario: The next day
- **WHEN** a day has passed since the review
- **THEN** `/chess-break review` offers the game's puzzles, titled with the opponent

#### Scenario: Reviewed again
- **WHEN** the person presses Check again on a game already reviewed
- **THEN** no puzzle is added twice, and none under review starts over

### Requirement: A setting turns it off
The mod SHALL have a **Puzzles from my games** setting, on by default. Off, the review SHALL still show the costliest moves, and SHALL neither queue them nor say they come back.

#### Scenario: Off
- **WHEN** the setting is off and a review shows two mistakes
- **THEN** the review queue is unchanged, and no "come back as puzzles" line shows

### Requirement: Kept apart from Lichess puzzles
A game's puzzle SHALL NOT be sent to Lichess as a puzzle result.

#### Scenario: Signed in
- **WHEN** a signed-in person solves a puzzle from their game
- **THEN** nothing is sent to Lichess's puzzle API
