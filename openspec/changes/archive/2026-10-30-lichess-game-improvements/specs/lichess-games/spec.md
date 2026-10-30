# Spec Delta

## MODIFIED Requirements

### Requirement: Play Stockfish
The person SHALL be able to challenge Lichess's Stockfish at a level from 1 to 8, with a clock of `3+2`, `5+3`, `10+0`, `10+5`, `15+10` or `30+0`, or with 1, 2, 3, 5, 7, 10 or 14 days per move, and a colour of white, black or random. Defaults: level 3, `10+0`, random. The game SHALL be casual.

#### Scenario: Start with arguments
- **WHEN** the person runs `/chess-break play stockfish 5 5+3 black`
- **THEN** a game against Stockfish level 5 starts, with 5 minutes plus 3 seconds a move, and the person plays black

#### Scenario: Days per move
- **WHEN** the person runs `/chess-break play stockfish 4 3d`
- **THEN** a correspondence game against Stockfish level 4 starts, with 3 days per move

#### Scenario: Invalid arguments
- **WHEN** the level is outside 1–8, or the clock or days are not in the list
- **THEN** no game starts and the answer lists the accepted levels, clocks and days

### Requirement: Play a person
The person SHALL be able to seek a random opponent at `10+0`, `10+5`, `15+10`, `30+0` or `30+20`, or at 1, 2, 3, 5, 7, 10 or 14 days per move, casual unless `rated` is given. Default: `10+0`. While a live seek waits, the pane SHALL show that it is searching and offer to cancel. Cancelling SHALL withdraw the seek. A correspondence seek SHALL be posted to Lichess's lobby, where it waits on its own. The pane SHALL say so and SHALL NOT wait for it.

#### Scenario: Seek found
- **WHEN** the person runs `/chess-break play human 15+10 rated` and Lichess pairs them
- **THEN** a rated 15+10 game starts and the pane shows the opponent's name and rating

#### Scenario: Seek cancelled
- **WHEN** the person cancels while searching
- **THEN** the seek is withdrawn on Lichess and the pane returns to puzzles

#### Scenario: Correspondence seek
- **WHEN** the person runs `/chess-break play human 3d`
- **THEN** the seek is posted, the answer says the game joins the games list once someone accepts it, and the pane returns to puzzles

#### Scenario: Blitz seek refused locally
- **WHEN** the person asks for a clock faster than `10+0` against a person
- **THEN** no seek is sent and the answer says that Lichess allows only rapid and classical seeks from this kind of app

### Requirement: The game outlives Claude's turn
While a live game or a live seek is on, the pane SHALL NOT close when Claude finishes, puzzles SHALL NOT load, and the line under the prompt SHALL show the opponent, both clocks and whose move it is. A correspondence game SHALL NOT hold the pane open. A live game still on when a session starts SHALL be resumed from Lichess.

#### Scenario: Claude finishes mid-game
- **WHEN** Claude's turn completes during a live game
- **THEN** the pane stays open and a toast says the game goes on

#### Scenario: Claude finishes beside a correspondence game
- **WHEN** Claude's turn completes while the pane shows a correspondence game
- **THEN** the pane closes as it does after a puzzle

#### Scenario: New session during a game
- **WHEN** a session starts while a live game of the account is still on at Lichess
- **THEN** the pane shows that game at its current position and clocks

## ADDED Requirements

### Requirement: Game setup screen
Pressing 🤖 or 👤 in the pane SHALL open a setup screen instead of starting a game. For Stockfish it offers the level, the clock or days, and the colour. For a person it offers the clock or days, and casual or rated. ▶ Play SHALL start the game with the choices shown, and cancel SHALL return to where the pane was.

#### Scenario: Choose and play
- **WHEN** the person presses 🤖, picks level 6 and `5+3`, and presses ▶ Play
- **THEN** a game against Stockfish level 6 at `5+3` starts

#### Scenario: Only accepted choices
- **WHEN** the setup screen is for a person
- **THEN** it offers no clock faster than `10+0`

### Requirement: Remembered game choices
The last settings a game was started with SHALL be kept across sessions, one set for Stockfish and one for a person. They SHALL fill the setup screen the next time, whether that game was started from the screen or by command. Before any game, the defaults apply.

#### Scenario: Choices come back
- **WHEN** the person last played `/chess-break play stockfish 6 15+10 black`, and opens 🤖 in a new session
- **THEN** the screen shows level 6, `15+10` and black selected

### Requirement: Move list
During a game, the pane SHALL show the moves in SAN between the two clocks, numbered, one move pair a row, with the newest move marked. When they do not fit, the oldest SHALL be left out, behind `…`. While the game is on, the list SHALL NOT be browsable.

#### Scenario: Moves as they are played
- **WHEN** the game's moves are e4 e5 Nf3
- **THEN** the list shows `1. e4 e5` and `2. Nf3`, with Nf3 marked

#### Scenario: A long game
- **WHEN** more moves have been played than fit between the clocks
- **THEN** the list shows `…` and then the latest moves

### Requirement: Replay after the game
Once a game has ended, the person SHALL be able to see the board after any of its moves by clicking the move, or with `j` and `k`, as in a finished puzzle. Playing again or returning to puzzles SHALL leave the replay.

#### Scenario: Back to the opening
- **WHEN** a game has ended and the person clicks move 3
- **THEN** the board shows the position after that move, with it marked as the last move

### Requirement: Material
Beside each player, the pane SHALL show the pieces that player has captured, and the material lead of the side ahead (pawn 1, knight and bishop 3, rook 5, queen 9).

#### Scenario: A knight up
- **WHEN** white has captured a knight and lost nothing
- **THEN** white's line shows the captured knight and `+3`, and black's shows nothing

### Requirement: Low-time warning
In a live game, the person's own clock SHALL be drawn red under 30 seconds, and one beep SHALL play when it first drops under 30 seconds, where the host plays sounds.

#### Scenario: Under thirty seconds
- **WHEN** the person's clock drops from 31 to 29 seconds
- **THEN** the clock turns red and one beep plays, and none more in that game

### Requirement: Takeback against Stockfish
In a game against Stockfish, the person SHALL be able to ask for a takeback with ↩ in the pane or `/chess-break takeback`. In a game against a person, takeback SHALL NOT be offered, and the opponent's takeback requests SHALL be declined.

#### Scenario: Take a move back
- **WHEN** the person asks for a takeback after their move against Stockfish
- **THEN** the request is sent to Lichess and the board shows the position Lichess returns

#### Scenario: Against a person
- **WHEN** the person runs `/chess-break takeback` in a game against a person
- **THEN** nothing is sent and the answer says takebacks are only against Stockfish

### Requirement: Opponent moved alert
When the opponent moves while the pane is hidden, a toast SHALL name the opponent and the move. When `gameSound` is on in `/config` (off by default), a short sound SHALL play as well, where the host plays sounds. Nothing SHALL be announced while the pane is shown.

#### Scenario: Pane hidden
- **WHEN** Stockfish plays Nf6 while the pane is hidden
- **THEN** a toast says `♞ Stockfish level 3 played Nf6`
