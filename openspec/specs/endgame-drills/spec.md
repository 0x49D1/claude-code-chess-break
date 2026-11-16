# endgame-drills Specification

## Purpose

Lets the person practise converting won endgames against Stockfish, from the position.

## Requirements

### Requirement: Endgame drills
🏆 Endgames SHALL list four positions, each legal, White to move and won: king and queen against king, king and rook against king, king and pawn with the king in front, the Lucena position. A press SHALL start a casual Lichess game against Stockfish level 8 from the position, as White, and SHALL NOT change the person's remembered setup choices. Esc and `← Back` SHALL leave the list.

#### Scenario: King and rook
- **WHEN** a signed-in person presses King and rook against king
- **THEN** Lichess is asked for a game against Stockfish level 8 with that position, and the board shows it, White to move

### Requirement: Games from a position
A game SHALL start from Lichess's `initialFen` when it gives one other than `startpos`. Its board, whose move it is, clocks, move list, replay and the review's puzzles SHALL follow from that position.

#### Scenario: Black to move at the start
- **WHEN** a game starts from a position with Black to move
- **THEN** Black's clock runs first, and the first move is Black's
