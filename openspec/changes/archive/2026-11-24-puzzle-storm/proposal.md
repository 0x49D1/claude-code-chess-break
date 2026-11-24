## Why

The roadmap's last item asks for a short timed mode for short waits. A single puzzle can outlast a short wait, or finish well before it ends.

## What Changes

- ⚡ Storm in the sidebar, and `/chess-break storm`, start a 3-minute run.
- Puzzles come from the offline set, so nothing waits on the network. The first is rated about 700, and each next one is about 40 points harder.
- A solve counts and the next puzzle comes at once. A wrong move counts as missed, takes 10 s off the clock, and the next puzzle comes. The opponent's answers are played at once.
- The clock starts with the first move. When it runs out, the run's result shows, with the best run kept in the store (`stormBest`), and 🔄 Again.
- Storm puzzles don't count toward progress, reviews, the daily goal or the solved list.
- The pane stays open when Claude is done while a run is on.

## Impact

`types` (`Storm`), `hooks/training/storm.ts`, `hooks/offline` (a rating band), `hooks/app/storm.ts`, `hooks/ui/storm.tsx`, the screen order, Esc, `turn.complete`, commands, and i18n.
