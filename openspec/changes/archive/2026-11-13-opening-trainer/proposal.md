# Proposal

## Why

Openings are learned by repetition: the next move of a line, again and again, until it comes without thinking. The puzzle machinery already plays a line move by move, answers with the reply, counts a wrong move, and brings a miss back until learned.

## What Changes

First slice of the roadmap's "Opening trainer":

- **Eight openings built in**, their main lines, ending on the person's move:
  - as White: Italian Game, Ruy Lopez, Queen's Gambit Declined, London System;
  - as Black: Sicilian Najdorf, French Winawer, Caro-Kann, King's Indian.
- **📖 Openings** in the sidebar opens a screen listing them, with the side played; a press starts one. `/chess-break opening` lists them, `/chess-break opening <name>` starts one.
- **An opening plays as a puzzle:** the person plays their side's moves, the other side's come by themselves, a wrong move is a mistake, 💡 and 👀 work as in puzzles.
- **A miss brings it back** through the review queue, until learned, as a missed puzzle. It counts under the Opening theme in Progress, and is not sent to Lichess.
- Esc and `← Back` leave the screen.

Left for later slices: choosing a set of openings to rotate through, more lines and side variations, the opening explorer.

## Capabilities

### New Capabilities
- `opening-trainer`: the built-in openings, picking one, and playing and reviewing it as a puzzle.

## Impact

- New: `hooks/training/openings.ts` (pure: the lines and `openingPuzzle`), `hooks/app/openings.ts`, `hooks/ui/openings.tsx`, `tests/openings.test.ts`.
- Edits: `types/index.d.ts` (`Puzzle.source` takes `'opening'`; the view's `isOpeningsShown`), `hooks/training/screen.ts`, `hooks/app/back.ts`, `hooks/ui/pane.tsx` (button, route), `hooks/commands.ts` (`opening`), `hooks/i18n/*`, README, ROADMAP, version 0.12.0.
