# Spec Delta

## Purpose

Lets a person signed in to Lichess choose whether the puzzles they solve in the pane count for their Lichess puzzle rating, and switch that choice at any time.

## ADDED Requirements

### Requirement: Rated puzzles option
The mod SHALL have a `/config` option, "Rated puzzles", on by default. While it is on, a signed-in person's Lichess puzzle results SHALL be sent as rated. While it is off, they SHALL be sent as casual: Lichess still records the puzzle as played, and the rating does not change.

#### Scenario: Rated by default
- **WHEN** a signed-in person with the option unset solves a Lichess puzzle
- **THEN** the result is sent to Lichess as rated, and the pane shows the new rating and its change

#### Scenario: Casual
- **WHEN** a signed-in person with the option off solves or misses a Lichess puzzle
- **THEN** the result is sent to Lichess as not rated, the rating shown stays the same, and no rating change is shown

#### Scenario: Not signed in, review, or another source
- **WHEN** the person is signed out, the puzzle is a review, or it comes from Chess.com or the offline set
- **THEN** no result is sent, whatever the option says

### Requirement: Switch from the pane
While signed in, the pane SHALL offer a key (`c`) that switches between rated and casual. The switch SHALL take effect for the next result sent, SHALL be saved to the "Rated puzzles" option, and SHALL still hold in a new session. The account line SHALL say "casual" while results are casual.

#### Scenario: Switch to casual
- **WHEN** a signed-in person presses `c` with rated puzzles on
- **THEN** the account line says "casual", `/config` shows the option off, and the next result is sent as not rated

#### Scenario: Switch back
- **WHEN** they press `c` again
- **THEN** "casual" goes away, the option is on again, and the next result is rated

#### Scenario: Signed out
- **WHEN** no one is signed in
- **THEN** the pane shows no rated/casual key
