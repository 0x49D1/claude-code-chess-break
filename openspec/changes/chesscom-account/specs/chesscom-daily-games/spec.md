# Spec Delta

## Purpose

Shows a connected Chess.com player's daily (correspondence) games in the pane, which ones await their move, and each game's position, so they can think about their next move while Claude works and then play it on Chess.com.

## ADDED Requirements

### Requirement: Daily games list
While Chess.com is connected, the sidebar SHALL list the player's current daily games: the opponent's name, whose move it is, and the time left for that move. Games awaiting the player's move SHALL come first and be marked, the one with the least time left first.

#### Scenario: Two games, one awaiting
- **WHEN** the player has a game against `bob` awaiting their move and one against `carl` awaiting carl's
- **THEN** the list shows `bob` first, marked as their move, then `carl`

#### Scenario: No daily games
- **WHEN** the player has no current daily games
- **THEN** the section shows the ratings and says there are no daily games

### Requirement: Time left
A game's time left SHALL be shown in days and hours (`2d 5h`), in hours and minutes under a day (`7h 10m`), and in minutes under an hour (`40m`). A game whose side to move is on vacation (no deadline) SHALL show no time.

#### Scenario: Two and a half days
- **WHEN** 2 days and 12 hours are left
- **THEN** it shows `2d 12h`

#### Scenario: On vacation
- **WHEN** Chess.com gives no deadline for the move
- **THEN** no time is shown for that game

### Requirement: A game's position, read-only
Choosing a game in the list SHALL show its current position on the pane's board, from the player's side, with whose move it is, a link to the game on Chess.com, a link to analyse the position on Lichess, and the way back. The pane SHALL NOT offer to make a move in it. A puzzle under way SHALL be kept and come back unchanged.

#### Scenario: Open a game
- **WHEN** the player, playing black, chooses the game against `bob`
- **THEN** the board shows that game's position with black at the bottom, says whose move it is, and offers "Play on Chess.com ↗", "Analyse on Lichess ↗" and back

#### Scenario: Back to the puzzle
- **WHEN** a puzzle was under way and the player goes back from the game
- **THEN** the same puzzle is shown, with the moves already played

#### Scenario: A Lichess game comes first
- **WHEN** a Lichess game or seek is on
- **THEN** the pane shows the Lichess game, not a Chess.com position, and the list offers no game to open

### Requirement: Kept current
The games and ratings SHALL be read from Chess.com when the pane opens and every 5 minutes while a username is connected, one request after another, never two at once. The position shown SHALL change when a read gives a new one.

#### Scenario: The opponent moved
- **WHEN** the opponent moves on Chess.com and the next read comes
- **THEN** the list marks the game as the player's move, and the position shown, if it is that game, shows the move

#### Scenario: The game ended
- **WHEN** a read no longer lists the game being shown
- **THEN** the pane goes back to what it showed before, and the list no longer has the game

### Requirement: Your move in the prompt line
While the pane is hidden and no Lichess game or seek is on, the line under the prompt SHALL end with the number of Chess.com daily games awaiting the player's move, when any do.

#### Scenario: Two awaiting during a puzzle
- **WHEN** two Chess.com games await the player's move, a puzzle is under way, and the pane is hidden
- **THEN** the puzzle's line ends with the Chess.com count of 2

#### Scenario: Lichess game on
- **WHEN** a Lichess game is on
- **THEN** the line is the Lichess game's line, with no Chess.com count
