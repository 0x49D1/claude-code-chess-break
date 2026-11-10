# game-review Specification

## Purpose

After a Lichess game ends, shows the person the few moves that lost the most, with the better move, from Lichess's computer analysis.

## Requirements

### Requirement: Review offered
A finished game in the pane, unless aborted, SHALL offer `🔍 Review`. Pressing it SHALL say that the analysis happens on Lichess, link to the game there, and say that the review shows here once Lichess's computer analysis is requested and done.

#### Scenario: Game over
- **WHEN** a game against Stockfish ends by checkmate
- **THEN** the pane offers `🔍 Review`

#### Scenario: Aborted
- **WHEN** the game was aborted
- **THEN** no review is offered

### Requirement: Waiting for Lichess
After `🔍 Review`, the pane SHALL read the game's export with evaluations at once, then every 5 seconds until it has an analysis, for up to 3 minutes. It SHALL then offer `🔄 Check again`. Leaving the game SHALL stop the reading. A failed read SHALL be said, with `🔄 Check again`.

#### Scenario: Analysed while waiting
- **WHEN** the person requests the analysis on Lichess and it is done a minute later
- **THEN** the review shows without another press

#### Scenario: Not requested
- **WHEN** 3 minutes pass with no analysis
- **THEN** the pane says Lichess has no analysis yet and offers `🔄 Check again`

### Requirement: The costliest moves
Once Lichess's analysis is in, the pane SHALL list up to 3 of the person's moves that Lichess judged an inaccuracy, mistake or blunder, the most evaluation lost first, each with its move number, the move, the judgment, Lichess's better move, and the pawns lost. Evaluations SHALL be capped at 10 pawns, a mate counting as 10. Pressing one SHALL show the position before it. With no such move, the pane SHALL say Lichess found no mistakes.

#### Scenario: A blunder and a mistake
- **WHEN** the person, playing white, blundered with 14. Qxb7 (better Nf3, 3.2 pawns lost) and made a mistake with 9. h3
- **THEN** the list shows `14. Qxb7?? Blunder · better Nf3 · −3.2` first, then the mistake

#### Scenario: The opponent's mistakes
- **WHEN** only the opponent's moves were judged
- **THEN** the pane says Lichess found no mistakes in the person's moves
