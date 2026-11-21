# weekly-summary Specification

## Purpose

Shows the person, once a week, how last week's training went.

## Requirements

### Requirement: Puzzles by day
Every finished puzzle SHALL be counted under its local day, solved cleanly or not, and days older than the history's 12 weeks SHALL be dropped.

#### Scenario: Two puzzles
- **WHEN** one puzzle is solved cleanly and one missed on 10 November
- **THEN** that day counts 1 solved and 1 failed

### Requirement: Last week's card
On the first pane opening of a week whose card was not seen, when last week (Monday to Sunday, local days) had puzzles, the pane SHALL show a card: puzzles played and solved cleanly with the share, the day streak and its best, and the best and weakest theme among those played at least 3 times last week. ✔ Got it and Esc SHALL close it until the next week. A week with no puzzles SHALL show no card.

#### Scenario: Seen once
- **WHEN** the person closes the card and the pane opens again the same week
- **THEN** no card shows

#### Scenario: A Wednesday
- **WHEN** the pane first opens on Wednesday 18 November
- **THEN** the card covers 9 to 15 November
