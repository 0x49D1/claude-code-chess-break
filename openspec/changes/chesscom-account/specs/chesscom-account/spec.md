# Spec Delta

## Purpose

Lets a person connect their public Chess.com username to the mod, so the pane can show their Chess.com ratings and games, with at most one of Lichess and Chess.com connected at a time.

## ADDED Requirements

### Requirement: Connect a username
`/chess-break chesscom <name>` SHALL check the name with Chess.com before keeping it. A name Chess.com doesn't know SHALL be refused and nothing kept. A known name SHALL be kept across sessions. No token, password or other secret SHALL be asked for.

#### Scenario: Known name
- **WHEN** the person runs `/chess-break chesscom anna` and Chess.com knows `anna`
- **THEN** the answer says Chess.com is connected as `anna`, and the pane's sidebar shows her Chess.com section

#### Scenario: Unknown name
- **WHEN** Chess.com answers that the name doesn't exist
- **THEN** the answer says no such Chess.com player, and nothing is kept

#### Scenario: Chess.com unreachable
- **WHEN** Chess.com can't be reached while connecting
- **THEN** the answer says Chess.com couldn't be reached, and nothing is kept

#### Scenario: Kept across sessions
- **WHEN** a new session starts after a name was connected
- **THEN** the Chess.com section shows again with no command

### Requirement: Disconnect
`/chess-break chesscom off` SHALL forget the username and remove the Chess.com section from the pane. Puzzles from Chess.com as a source SHALL keep working with no username.

#### Scenario: Off
- **WHEN** the person runs `/chess-break chesscom off`
- **THEN** the username is forgotten, the Chess.com section and its prompt-line count go away, and `source chesscom` still gives Chess.com puzzles

### Requirement: One account at a time
Lichess and Chess.com SHALL NOT be connected at once. Connecting Chess.com while signed in to Lichess SHALL be refused. Signing in to Lichess SHALL go ahead as it does now and SHALL make Chess.com disconnect itself, saying so once.

#### Scenario: Chess.com while Lichess is signed in
- **WHEN** the person is signed in to Lichess and runs `/chess-break chesscom anna`
- **THEN** nothing is kept, no request is sent to Chess.com, and the answer says to sign out of Lichess first with `/chess-break logout`

#### Scenario: Lichess sign-in while Chess.com is connected
- **WHEN** Chess.com is connected and the person signs in to Lichess
- **THEN** the Lichess sign-in works as before, the Chess.com section is no longer shown, the username is forgotten, and the pane says once that Chess.com was disconnected

### Requirement: Ratings
While Chess.com is connected, the sidebar SHALL show the player's current rapid, blitz, bullet and daily ratings, each only when Chess.com has one, and their best tactics rating, marked as best.

#### Scenario: Some ratings
- **WHEN** the player has rapid and blitz ratings, no bullet or daily, and a best tactics rating of 1800
- **THEN** the sidebar shows rapid and blitz, no bullet or daily, and tactics as best 1800

### Requirement: Failures stay in the Chess.com section
A failed request to Chess.com SHALL show only as a line in the Chess.com section, and the last ratings and games read SHALL stay shown. Puzzles, Lichess sign-in and Lichess games SHALL behave exactly as with no Chess.com username.

#### Scenario: Chess.com down during a Lichess game
- **WHEN** every Chess.com request fails while a Lichess game is on
- **THEN** the game pane is the same as with no Chess.com username, and nothing is thrown

#### Scenario: Rate limited
- **WHEN** Chess.com answers 429
- **THEN** the Chess.com section says it will try again later, and the next poll tries again
