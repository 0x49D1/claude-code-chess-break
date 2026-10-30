# lichess-correspondence Specification

## Purpose

Lets the person keep several slow Lichess games going, a move at a time while Claude works, without a clock that runs while they read Claude's answers.

## Requirements

### Requirement: Several games at once
The person SHALL be able to have any number of correspondence games on at once, beside at most one live game. Starting a live game while another live game is on SHALL be refused. Starting a correspondence game SHALL never be refused for the games already on.

#### Scenario: A second correspondence game
- **WHEN** a correspondence game is on and the person starts another one
- **THEN** both are on, and both are in the games list

#### Scenario: A second live game
- **WHEN** a live game is on and the person starts another live game
- **THEN** nothing is sent, and the answer says to finish the live game first

### Requirement: Games list
The pane SHALL offer a games list of every game of the account on at Lichess: the opponent, live or days per move, and whose move it is. Games awaiting the person's move SHALL come first and be marked. Choosing a game SHALL show it, and the pane SHALL offer the way back to the list.

#### Scenario: Two games, one awaiting
- **WHEN** the account has two correspondence games and it is the person's move in one
- **THEN** the list shows that one first, marked as awaiting their move

#### Scenario: Open a game
- **WHEN** the person chooses a game in the list
- **THEN** the pane shows that game, and its moves and clocks as Lichess has them

### Requirement: A move per Claude turn
When Claude starts working and the pane opens, a correspondence game awaiting the person's move SHALL be shown instead of a puzzle, the one with the least time left first. With no game awaiting, the pane SHALL show puzzles as before. A live game on SHALL come before both.

#### Scenario: Game awaiting
- **WHEN** Claude starts a turn and one correspondence game awaits the person's move
- **THEN** the pane opens on that game

#### Scenario: Nothing awaiting
- **WHEN** Claude starts a turn and every correspondence game awaits the opponent
- **THEN** the pane opens on a puzzle

### Requirement: Time left per move
A correspondence game's clock SHALL be shown as the time left for the side to move, in days and hours (`2d 5h`), in hours and minutes under a day, and in minutes under an hour.

#### Scenario: Two and a half days
- **WHEN** 2 days and 12 hours are left for the person's move
- **THEN** the clock shows `2d 12h`

### Requirement: Games awaiting in the prompt line
With no live game on, the line under the prompt SHALL say how many correspondence games await the person's move, when any do. That count SHALL replace the puzzle's line only when the pane is hidden and no puzzle is under way.

#### Scenario: Two awaiting
- **WHEN** two correspondence games await the person's move, the pane is hidden, and no puzzle is under way
- **THEN** the line ends with `⚔ 2 games await your move`

### Requirement: Slow games kept current
The games list SHALL be read from Lichess when Claude starts a turn, when the pane opens, and every five minutes while the session runs. Only the game shown SHALL be followed move by move. When a game the person is not looking at becomes theirs to move, a toast SHALL say so once.

#### Scenario: The opponent answered overnight
- **WHEN** a session starts and the opponent has moved in a correspondence game
- **THEN** the games list marks it as awaiting the person's move

#### Scenario: A move in another game
- **WHEN** the five-minute read finds that the opponent moved in a game not shown
- **THEN** a toast names the opponent and says it is the person's move
