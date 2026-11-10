# Spec Delta

## Purpose

Gives the person a small number of puzzles to do each day, and shows how many days in a row they have done it.

## ADDED Requirements

### Requirement: A daily goal
The mod SHALL have a **Daily goal** setting: a whole number of puzzles a day, 5 by default. 0 SHALL turn the goal off, and with it the sidebar line.

#### Scenario: Default
- **WHEN** the setting was never changed
- **THEN** the goal is 5 puzzles a day

#### Scenario: Off
- **WHEN** the goal is 0
- **THEN** the sidebar shows no goal line, and no day is counted as met

### Requirement: What counts
Every finished puzzle SHALL count once towards the current local day: solved or missed, new or a review. A puzzle left unfinished SHALL NOT count. The count SHALL start at 0 on each new local day.

#### Scenario: Solved and missed both count
- **WHEN** the person solves two puzzles and misses one today
- **THEN** today's count is 3

#### Scenario: A new day
- **WHEN** the person did 3 puzzles yesterday and none today
- **THEN** today's count is 0

### Requirement: The day streak
A day SHALL be met when its count reaches the goal. The streak SHALL be the number of days in a row that were met, ending today or yesterday. A met day that follows a met yesterday SHALL add one; one that follows a missed day SHALL start again at 1. While today is not yet met, yesterday's streak SHALL still show. The best streak SHALL be kept.

#### Scenario: Two days in a row
- **WHEN** the goal was met yesterday with a streak of 1, and today's count reaches the goal
- **THEN** the streak is 2

#### Scenario: A day missed
- **WHEN** the goal was last met two days ago
- **THEN** the streak shows 0, and meeting today's goal makes it 1

#### Scenario: Goal lowered during the day
- **WHEN** 3 puzzles are done today and the goal is changed from 5 to 3
- **THEN** the day is met with the next finished puzzle

### Requirement: Shown in the pane
While the goal is on, the sidebar SHALL show today's count and the goal, a mark once today is met, and the streak while it is above 0. The line SHALL be in the person's language. The goal and streak SHALL be kept across sessions.

#### Scenario: Under way
- **WHEN** the goal is 5, 3 puzzles are done today and the streak is 4
- **THEN** the sidebar shows `🎯 Today 3/5 · 📅 4 days in a row`

#### Scenario: Met
- **WHEN** the fifth puzzle of the day is finished
- **THEN** the line shows `5/5 ✅`
