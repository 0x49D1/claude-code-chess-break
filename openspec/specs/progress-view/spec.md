# progress-view Specification

## Purpose

Shows how the person's accuracy on each puzzle theme changes week by week, next to Lichess's own numbers when signed in, so the weak themes stand out.

## Requirements

### Requirement: History by day
Every finished puzzle SHALL be counted under its local day and each of its trained themes, solved cleanly or not, as progress counts it. Days older than 12 weeks SHALL be dropped.

#### Scenario: A puzzle counted
- **WHEN** a fork puzzle is solved today
- **THEN** today's fork count has one more solved

#### Scenario: Old days dropped
- **WHEN** a puzzle is counted and the history has a day 13 weeks old
- **THEN** that day is gone

### Requirement: Progress screen
The sidebar SHALL offer `📊 Progress` (key `p`). It SHALL show one row per theme tried in the last 4 weeks, weakest first: a bar for each of the 4 weeks, oldest first, `·` for a week with no puzzle on the theme, and the 4 weeks' accuracy. `← Back` SHALL return to the puzzle as it was. With nothing in the last 4 weeks, it SHALL say so.

#### Scenario: Two themes
- **WHEN** this week the person solved 2 of 2 forks and 1 of 4 pins
- **THEN** the pin row comes first with `···▃ 25%`, then the fork row with `···█ 100%`

#### Scenario: Back
- **WHEN** a puzzle was under way and the person presses `← Back`
- **THEN** the same puzzle shows, with the moves already played

### Requirement: Lichess's numbers
Signed in to Lichess, opening the screen SHALL read the account's puzzle dashboard for the last 30 days, and each row SHALL show the theme's performance rating and first-try accuracy there. Themes in the dashboard but not in the local history SHALL get rows too. Not signed in, nothing SHALL be asked of Lichess. A dashboard that can't be read SHALL be said in one line, and the rest of the screen SHALL show.

#### Scenario: Signed in
- **WHEN** Lichess gives forks a performance of 1650 with 7 first-try wins of 10
- **THEN** the fork row shows `⭐ 1650 · 70%`

#### Scenario: Lichess fails
- **WHEN** the dashboard answers 500
- **THEN** the screen shows the local rows and a line saying Lichess's dashboard could not be read

### Requirement: Trend in stats
`/chess-break stats` SHALL add to each theme line its 4 weeks' bar and, signed in, its Lichess performance rating.

#### Scenario: Stats with a trend
- **WHEN** the person runs `/chess-break stats` with forks played this week
- **THEN** the fork line ends with `· ···█` and, signed in, `· ⭐ 1650`
