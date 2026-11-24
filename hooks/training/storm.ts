import type { Attempt, Puzzle, Storm } from '../../types'
import { offlinePuzzle } from '../offline'
import { awaitsReply, reply, start } from './attempt'
import { MIX } from './themes'

/** A run's time. */
export const STORM_MS = 180_000

/** What a miss takes off the clock. */
export const PENALTY_MS = 10_000

/** The first puzzle's rating, and how much each next one goes up. */
const FIRST_RATING = 700
const RATING_STEP = 40

/** The band a run's puzzle is picked from: easy first, harder with each one. */
const bandOf = (index: number) => ({ from: FIRST_RATING + RATING_STEP * index, to: FIRST_RATING + RATING_STEP * index + 300 })

/** The run's next puzzle, from the set shipped with the mod: no waiting on the network between puzzles. */
export const stormPuzzle = (seen: string[], random = Math.random): Puzzle => offlinePuzzle(MIX, seen, random, bandOf(seen.length))

export function startStorm(best: number, random = Math.random): Storm {
  const puzzle = stormPuzzle([], random)
  return { attempt: start(puzzle, false), penaltyMs: 0, solved: 0, missed: 0, seen: [puzzle.id], best }
}

/** Time left, the whole run's before the first move. */
export const timeLeft = (s: Storm, now: number) =>
  Math.max(0, STORM_MS - s.penaltyMs - (s.startedAt === undefined ? 0 : (s.endedAt ?? now) - s.startedAt))

/** Started and not over: what keeps the pane open when Claude is done. */
export const isRunning = (s: Storm | undefined, now: number) => !!s && s.startedAt !== undefined && s.endedAt === undefined && timeLeft(s, now) > 0

/** The run ended at its time, once that has come. */
export function endIfDue(s: Storm, now: number): Storm {
  if (s.endedAt !== undefined || s.startedAt === undefined || timeLeft(s, now) > 0) return s
  return { ...s, endedAt: s.startedAt + STORM_MS - s.penaltyMs }
}

/** The run with the next puzzle on. */
function advance(s: Storm, last: 'solved' | 'missed', random: () => number): Storm {
  const puzzle = stormPuzzle(s.seen, random)
  return { ...s, last, attempt: start(puzzle, false), seen: [...s.seen, puzzle.id] }
}

/**
 * A move or a click on the run's puzzle. The first one starts the clock. The opponent answers at
 * once; a solved puzzle counts and the next comes; a wrong move counts as missed, costs time, and
 * the next comes. Nothing plays once the time is out.
 */
export function stormChange(s: Storm, fn: (a: Attempt) => Attempt, now: number, random = Math.random): Storm {
  const due = endIfDue(s, now)
  if (due.endedAt !== undefined) return due
  const startedAt = due.startedAt ?? now
  const a = fn(due.attempt)
  if (a === due.attempt) return due
  const run = { ...due, startedAt }
  if (a.hadMistake) return endIfDue(advance({ ...run, missed: run.missed + 1, penaltyMs: run.penaltyMs + PENALTY_MS }, 'missed', random), now)
  if (a.status === 'solved') return advance({ ...run, solved: run.solved + 1 }, 'solved', random)
  return { ...run, attempt: awaitsReply(a) ? reply(a) : a }
}
