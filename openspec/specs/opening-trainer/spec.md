# opening-trainer Specification

## Purpose

Lets the person drill opening main lines, their own side's moves, with misses coming back until learned.

## Requirements

### Requirement: Built-in openings
The mod SHALL carry eight openings, each a legal main line that ends on the person's move: Italian Game, Ruy Lopez, Queen's Gambit Declined and London System as White; Sicilian Najdorf, French Winawer, Caro-Kann and King's Indian as Black.

#### Scenario: Every line is legal
- **WHEN** each opening's line is replayed from the start
- **THEN** every move is legal, and the last one is the person's side's

### Requirement: Picking an opening
The sidebar SHALL offer `📖 Openings`, a screen that lists each opening with the side played, with a way back at its top and bottom and on Esc. Pressing one SHALL start it in the pane. `/chess-break opening` SHALL list them; `/chess-break opening <name>` SHALL start one, and refuse a name it does not know.

#### Scenario: From the pane
- **WHEN** the person presses the Najdorf
- **THEN** the board shows the position after 1. e4 from Black's side, with Black to play

#### Scenario: Unknown name
- **WHEN** the person runs `/chess-break opening dragon`
- **THEN** the answer says there is no such opening and lists the names

### Requirement: A set drilled in turn
The openings screen SHALL let the person mark openings for their set, kept across sessions in the list's order. `▶ Drill my set` and `/chess-break opening next` SHALL start the set's opening after the one drilled last, round again after the last; with an empty set, the command SHALL say how to make one.

#### Scenario: Two in the set
- **WHEN** the set holds the Italian Game and the Caro-Kann, and the Italian was drilled last
- **THEN** the next drill is the Caro-Kann, and the one after it the Italian again

### Requirement: Explain speaks of the opening
Explain on an opening SHALL ask for the plans and ideas behind the person's moves in that opening, and a fact about the opening, not about a tactic's defence.

#### Scenario: Caro-Kann
- **WHEN** the person asks to explain the Caro-Kann line
- **THEN** Claude is asked about the plans of the Caro-Kann's moves

### Requirement: Played and reviewed as a puzzle
An opening SHALL play as a puzzle: the person's side's moves are asked, the other side's are played, a wrong move counts as a mistake. A miss SHALL bring it back through the review queue until learned. It SHALL count under the Opening theme, and SHALL NOT be sent to Lichess.

#### Scenario: A wrong move
- **WHEN** the person plays 3. Bb5 in the Italian Game
- **THEN** the move is refused as wrong, and once the opening ends it is due again the next day
