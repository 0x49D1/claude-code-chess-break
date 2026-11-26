import type { Attempt, Puzzle, Storm, StormRun } from '../../types'
import { offlinePuzzle } from '../offline'
import { awaitsReply, reply, start } from './attempt'
import { dayOf } from './daily'
import { weekOf } from './summary'
import { MIX } from './themes'

/** A run's time. */
export const STORM_MS = 180_000

/** What a miss takes off the clock. */
export const PENALTY_MS = 10_000

/** Solves in a row that win time back, and how much: then 10 s every 10 more. */
const BONUSES: [number, number][] = [[5, 3_000], [12, 5_000], [20, 7_000], [30, 10_000]]

/** The time a combo of this many solves wins back, when it wins any. */
export function bonusAt(combo: number): number {
  const exact = BONUSES.find(([at]) => at === combo)
  if (exact) return exact[1]
  return combo > 30 && combo % 10 === 0 ? 10_000 : 0
}

/** The run's whole time: 3 minutes, less the misses, plus the combos. */
const allowedMs = (s: Storm) => STORM_MS - s.penaltyMs + s.bonusMs

/** The first puzzle's rating, and how much each next one goes up. */
const FIRST_RATING = 700
const RATING_STEP = 40

/** The band a run's puzzle is picked from: easy first, harder with each one. */
const bandOf = (index: number) => ({ from: FIRST_RATING + RATING_STEP * index, to: FIRST_RATING + RATING_STEP * index + 300 })

/**
 * The run's next puzzle, from the set shipped with the mod: no waiting on the network between
 * puzzles. Once its band has none left unseen, a harder one, then any one not played in the run.
 */
export function stormPuzzle(seen: string[], random = Math.random): Puzzle {
  const band = bandOf(seen.length)
  for (const wider of [band, { from: band.from, to: Infinity }]) {
    const puzzle = offlinePuzzle(MIX, seen, random, wider)
    if (!seen.includes(puzzle.id)) return puzzle
  }
  return offlinePuzzle(MIX, seen, random)
}

export function startStorm(best: number, openedAt: number, random = Math.random): Storm {
  const puzzle = stormPuzzle([], random)
  return { attempt: start(puzzle, false), penaltyMs: 0, bonusMs: 0, combo: 0, bestCombo: 0, solved: 0, missed: 0, seen: [puzzle.id], best, openedAt }
}

/** The puzzle left for a storm, its clock moved on by the time away, so a storm's minutes don't count in its time. */
export function resume(a: Attempt | undefined, s: Storm, now: number): Attempt | undefined {
  if (!a || a.status !== 'playing' || a.startedAt === undefined) return a
  return { ...a, startedAt: a.startedAt + now - s.openedAt }
}

/** Time left, the whole run's before the first move. */
export const timeLeft = (s: Storm, now: number) =>
  Math.max(0, allowedMs(s) - (s.startedAt === undefined ? 0 : (s.endedAt ?? now) - s.startedAt))

/** Started and not over: what keeps the pane open when Claude is done. */
export const isRunning = (s: Storm | undefined, now: number) => !!s && s.startedAt !== undefined && s.endedAt === undefined && timeLeft(s, now) > 0

/** The run ended at its time, once that has come. */
export function endIfDue(s: Storm, now: number): Storm {
  if (s.endedAt !== undefined || s.startedAt === undefined || timeLeft(s, now) > 0) return s
  return { ...s, endedAt: s.startedAt + allowedMs(s) }
}

/** The run with the next puzzle on. */
function advance(s: Storm, last: 'solved' | 'missed', random: () => number): Storm {
  const puzzle = stormPuzzle(s.seen, random)
  return { ...s, last, attempt: start(puzzle, false), seen: [...s.seen, puzzle.id] }
}

/**
 * A move or a click on the run's puzzle. The first one starts the clock. The opponent answers at
 * once; a solved puzzle counts, adds to the combo (which wins time back at 5, 12, 20, 30 and every
 * 10 more), and the next comes; a wrong move counts as missed, costs time, ends the combo, and the
 * next comes. Nothing plays once the time is out.
 */
export function stormChange(s: Storm, fn: (a: Attempt) => Attempt, now: number, random = Math.random): Storm {
  const due = endIfDue(s, now)
  if (due.endedAt !== undefined) return due
  const startedAt = due.startedAt ?? now
  const a = fn(due.attempt)
  if (a === due.attempt) return due
  const run = { ...due, startedAt }
  if (a.hadMistake) {
    const missed = { ...run, missed: run.missed + 1, penaltyMs: run.penaltyMs + PENALTY_MS, combo: 0, gainedMs: undefined }
    return endIfDue(advance(missed, 'missed', random), now)
  }
  if (a.status === 'solved') {
    const combo = run.combo + 1
    const gainedMs = bonusAt(combo)
    const solved = { ...run, solved: run.solved + 1, combo, bestCombo: Math.max(run.bestCombo, combo), bonusMs: run.bonusMs + gainedMs, gainedMs: gainedMs || undefined }
    return advance(solved, 'solved', random)
  }
  return { ...run, attempt: awaitsReply(a) ? reply(a) : a }
}

/** Runs kept, the latest; and those shown as the last ones. */
const KEPT_RUNS = 50
const SHOWN_RUNS = 5

/** An ended run kept with the others, the oldest dropped past the kept ones. */
export function recordRun(runs: StormRun[], s: Storm): StormRun[] {
  if (s.endedAt === undefined) return runs
  return [...runs, { at: s.endedAt, solved: s.solved, missed: s.missed, combo: s.bestCombo }].slice(-KEPT_RUNS)
}

/** The runs in numbers: the best ever, this week's best (from Monday), and the last few's solves, the latest last. */
export function runsSummary(runs: StormRun[], best: number, now: number) {
  const monday = weekOf(now)
  const week = runs.filter(r => dayOf(r.at) >= monday)
  return {
    best: Math.max(best, ...runs.map(r => r.solved)),
    ...(week.length ? { week: Math.max(...week.map(r => r.solved)) } : {}),
    last: runs.slice(-SHOWN_RUNS).map(r => r.solved),
  }
}
