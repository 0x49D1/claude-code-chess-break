# Spec Delta

## Purpose

Lets a signed-in person play live Lichess games against Stockfish or a person from the chess-break pane or the prompt while Claude works, alongside the puzzle training.

## ADDED Requirements

### Requirement: Games need a token with board:play
Sign-in SHALL ask Lichess for `board:play` along with the puzzle scopes. Starting a game SHALL need a stored token that Lichess accepts for `board:play`. Without one, the game SHALL NOT start, and the person SHALL be told to sign in (again).

#### Scenario: Not signed in
- **WHEN** the person runs `/chess-break play stockfish 3` with no stored token
- **THEN** no request is sent to Lichess and the answer says to sign in with `/chess-break login`

#### Scenario: Old puzzle-only token
- **WHEN** a game is started with a token that Lichess refuses for missing scope
- **THEN** the pane says the sign-in must be renewed for games, offers 🔑 sign in, and puzzles keep using the existing token

### Requirement: Play Stockfish
The person SHALL be able to challenge Lichess's Stockfish at a level from 1 to 8, with a clock of `3+2`, `5+3`, `10+0`, `10+5`, `15+10` or `30+0` and a colour of white, black or random. Defaults: level 3, `10+0`, random. The game SHALL be casual.

#### Scenario: Start with arguments
- **WHEN** the person runs `/chess-break play stockfish 5 5+3 black`
- **THEN** a game against Stockfish level 5 starts, with 5 minutes plus 3 seconds a move, and the person plays black

#### Scenario: Invalid arguments
- **WHEN** the level is outside 1–8 or the clock is not in the list
- **THEN** no game starts and the answer lists the accepted levels and clocks

### Requirement: Play a person
The person SHALL be able to seek a random opponent at `10+0`, `10+5`, `15+10`, `30+0` or `30+20`, casual unless `rated` is given. Default: `10+0`. While the seek waits, the pane SHALL show that it is searching and offer to cancel. Cancelling SHALL withdraw the seek.

#### Scenario: Seek found
- **WHEN** the person runs `/chess-break play human 15+10 rated` and Lichess pairs them
- **THEN** a rated 15+10 game starts and the pane shows the opponent's name and rating

#### Scenario: Seek cancelled
- **WHEN** the person cancels while searching
- **THEN** the seek is withdrawn on Lichess and the pane returns to puzzles

#### Scenario: Blitz seek refused locally
- **WHEN** the person asks for a clock faster than `10+0` against a person
- **THEN** no seek is sent and the answer says that Lichess allows only rapid and classical seeks from this kind of app

### Requirement: Live board and clocks
During a game, the pane SHALL show the board from the person's side, both players' names and ratings, both clocks, the last move and whose move it is. The clock of the side to move SHALL count down every second between updates from Lichess, and SHALL be reset to Lichess's value at each update.

#### Scenario: Opponent moves
- **WHEN** Lichess reports the opponent's move
- **THEN** the board shows the move, its squares are marked as the last move, and the person's clock starts counting down

#### Scenario: Clock before the second move
- **WHEN** fewer than two moves have been played
- **THEN** neither clock counts down, as on Lichess

### Requirement: Make moves
On the person's turn, a move SHALL be made by clicking or by typing, with the same input rules as puzzles, in the pane or as `/chess-break <move>`. A legal move SHALL be shown at once and sent to Lichess. If Lichess refuses it, the board SHALL return to Lichess's position and say why. Moves SHALL be refused when it is not the person's turn.

#### Scenario: Move from the prompt
- **WHEN** a game is on, it is the person's turn, and they run `/chess-break Nf3`
- **THEN** Nf3 is played in the game, not in a puzzle

#### Scenario: Not your turn
- **WHEN** the person tries a move while the opponent is to move
- **THEN** nothing is sent and the pane says it is the opponent's move

#### Scenario: Move refused by Lichess
- **WHEN** Lichess refuses a sent move
- **THEN** the board shows Lichess's position again with the reason

### Requirement: Resign, draw and abort
During a game, the person SHALL be able to resign, offer a draw, accept or decline the opponent's draw offer, and abort while fewer than two moves have been played. Each SHALL be available as a pane button and as `/chess-break resign`, `draw`, `draw no` and `abort`. Resigning SHALL need a second press within a few seconds.

#### Scenario: Opponent offers a draw
- **WHEN** Lichess reports a draw offer from the opponent
- **THEN** the pane shows the offer with accept and decline, and `/chess-break draw` accepts it

#### Scenario: Abort after the second move
- **WHEN** two or more moves have been played
- **THEN** abort is not offered and `/chess-break abort` says the game can only be resigned

### Requirement: The game outlives Claude's turn
While a game or seek is on, the pane SHALL NOT close when Claude finishes, puzzles SHALL NOT load, and the line under the prompt SHALL show the opponent, both clocks and whose move it is. A game still on when a session starts SHALL be resumed from Lichess.

#### Scenario: Claude finishes mid-game
- **WHEN** Claude's turn completes during a game
- **THEN** the pane stays open and a toast says the game goes on

#### Scenario: New session during a game
- **WHEN** a session starts while a game of the account is still on at Lichess
- **THEN** the pane shows that game at its current position and clocks

### Requirement: Game end
When Lichess reports the game over, the pane SHALL show the result and its reason (mate, resignation, time, draw, aborted), link to the game on Lichess, and offer another game with the same settings (for a person, a new seek) or a return to puzzles. Game results SHALL NOT change puzzle progress or reviews.

#### Scenario: Win on time
- **WHEN** the opponent's clock runs out
- **THEN** the pane shows the win on time, with a link to the game and a play-again button

### Requirement: Stream failures
The live game SHALL be read from Lichess's game stream. If the stream breaks, it SHALL be reopened, and the pane SHALL show the person that the game is reconnecting. If no stream tool is available, games SHALL say so, and puzzles SHALL keep working. The token SHALL NOT appear in any process's arguments or in the conversation.

#### Scenario: Network drop
- **WHEN** the game stream ends while the game is on
- **THEN** the pane shows reconnecting and the stream is reopened, ending in the current position

#### Scenario: No curl
- **WHEN** `curl` cannot be started
- **THEN** starting a game answers that games need `curl`, and nothing is sent to Lichess
