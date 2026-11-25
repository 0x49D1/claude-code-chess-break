import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { Storm } from '../types'
import { PUZZLES } from '../hooks/offline/puzzles'
import { legal, uciOf, after, isMate } from '../hooks/chess/position'
import { play } from '../hooks/training/attempt'
import { PENALTY_MS, STORM_MS, bonusAt, endIfDue, isRunning, resume, startStorm, stormChange, timeLeft } from '../hooks/training/storm'
import { start } from '../hooks/training/attempt'
import { offlinePuzzle } from '../hooks/offline'
import { PANE, command, lichess } from './fixtures/fake'

/** A fixed sequence of numbers, so the run's puzzles are the same each time. */
const seeded = () => {
  let x = 7
  return () => (x = (x * 16807) % 2147483647) / 2147483647
}

/** Plays the run's puzzle through to the end, its solution's moves as typed. */
function solve(s: Storm, now: number, random: () => number): Storm {
  const id = s.attempt.puzzle.id
  let run = s
  while (run.attempt.puzzle.id === id && run.endedAt === undefined) run = stormChange(run, a => play(a, a.puzzle.solution[a.ply]!), now, random)
  return run
}

/** A legal move that is neither the solution's nor a mate. */
const wrongMove = (s: Storm) =>
  legal(s.attempt.fen).find(m => uciOf(m) !== s.attempt.puzzle.solution[s.attempt.ply] && !isMate(after(s.attempt.fen, m)))!.san

test('a run starts easy, with the whole time, and its clock waits for the first move', () => {
  const s = startStorm(4, 0, seeded())
  expect(s.attempt.puzzle.rating).toBeLessThan(1000)
  expect(s.best).toBe(4)
  expect(timeLeft(s, 1_000_000)).toBe(STORM_MS)
  expect(isRunning(s, 1_000_000)).toBe(false)
})

test('a solved puzzle counts and a harder one comes; a miss costs time', () => {
  const random = seeded()
  let s = solve(startStorm(0, 0, random), 1000, random)
  expect(s.solved).toBe(1)
  expect(s.startedAt).toBe(1000)
  expect(s.last).toBe('solved')
  expect(s.seen.length).toBe(2)
  expect(s.attempt.puzzle.rating).toBeGreaterThanOrEqual(740)
  const before = s.attempt.puzzle.id
  s = stormChange(s, a => play(a, wrongMove(s)), 5000, random)
  expect(s.missed).toBe(1)
  expect(s.last).toBe('missed')
  expect(s.attempt.puzzle.id).not.toBe(before)
  expect(timeLeft(s, 5000)).toBe(STORM_MS - PENALTY_MS - 4000)
  expect(isRunning(s, 5000)).toBe(true)
})

test('solves in a row win time back; a miss ends the run of solves', () => {
  expect([1, 4, 5, 12, 20, 30, 31, 40, 50].map(bonusAt)).toEqual([0, 0, 3_000, 5_000, 7_000, 10_000, 0, 10_000, 10_000])
  const random = seeded()
  let s = startStorm(0, 0, random)
  for (let i = 0; i < 5; i++) s = solve(s, 1000, random)
  expect(s.combo).toBe(5)
  expect(s.gainedMs).toBe(3_000)
  expect(timeLeft(s, 1000)).toBe(STORM_MS + 3_000)
  s = solve(s, 1000, random)
  expect(s.gainedMs).toBeUndefined()
  s = stormChange(s, a => play(a, wrongMove(s)), 1000, random)
  expect(s.combo).toBe(0)
  expect(s.bestCombo).toBe(6)
  expect(timeLeft(s, 1000)).toBe(STORM_MS + 3_000 - PENALTY_MS)
  // The time won back moves the end too.
  const end = 1000 + STORM_MS + 3_000 - PENALTY_MS
  expect(endIfDue(s, end - 1).endedAt).toBeUndefined()
  expect(endIfDue(s, end + 5_000).endedAt).toBe(end)
})

test('no puzzle comes twice in a run', () => {
  const random = seeded()
  let s = startStorm(0, 0, random)
  // Far past the hardest band, so each band runs out.
  for (let i = 0; i < 200; i++) s = solve(s, 1000 + i, random)
  expect(new Set(s.seen).size).toBe(s.seen.length)
  expect(s.solved).toBe(200)
})

test('the puzzle left for a storm has its clock held while away', () => {
  const left = { ...start(offlinePuzzle('mix', [], seeded()), false), startedAt: 10_000 }
  const s = startStorm(0, 30_000, seeded())
  expect(resume(left, s, 90_000)?.startedAt).toBe(70_000)
  // A puzzle not started, or over, has no clock to hold.
  expect(resume({ ...left, startedAt: undefined }, s, 90_000)?.startedAt).toBeUndefined()
  expect(resume({ ...left, status: 'solved' }, s, 90_000)?.startedAt).toBe(10_000)
})

test('at the time the run ends, and nothing plays after', () => {
  const random = seeded()
  const first = startStorm(0, 0, random)
  const s = stormChange(first, a => play(a, wrongMove(first)), 0, random)
  const late = STORM_MS
  expect(endIfDue(s, late).endedAt).toBe(STORM_MS - PENALTY_MS)
  const after = stormChange(s, a => play(a, a.puzzle.solution[a.ply]!), late, random)
  expect(after.endedAt).toBe(STORM_MS - PENALTY_MS)
  expect(after.solved).toBe(0)
  expect(after.attempt).toBe(s.attempt)
  expect(isRunning(after, late)).toBe(false)
})

const mount = ($: Engine) => $.ui.mount({ ...PANE, surface: 'terminal' })

/** The run's puzzle on the pane, read from its move field's key, with its solution and position from the offline set. */
async function shown(ui: Awaited<ReturnType<typeof mount>>) {
  const key = (await ui.find({ type: 'Input' }))!.key!
  const [, fen, moves] = PUZZLES.find(([id]) => key === `storm-move-${id}`)!
  const [first, ...solution] = moves.split(' ')
  return { key, solution, fen: after(fen, legal(fen).find(m => uciOf(m) === first)!) }
}

test('the pane: ⚡ Storm starts a run, its clock runs out, and the best run is kept', async ($, on) => {
  const store: Record<string, unknown> = {}
  on('store.get', async (_$, e) => ({ value: store[e.key] }))
  on('store.set', async (_$, e) => ((store[e.key] = e.value), { value: undefined }))
  const clock = mock.clock(on)
  lichess(on)
  const ui = await mount($)
  expect((await $.command.run(command('storm'))).text).toBe('Puzzle Storm is in the pane: the clock starts with your first move.')
  expect(await ui.find({ text: /^⚡ Storm  ·  ⏱ 3:00  ·  ✅ 0/ })).toBeDefined()
  // The solver's moves, every other one: the opponent's answers come at once.
  const first = await shown(ui)
  for (let i = 0; i < first.solution.length; i += 2) await ui.input({ key: first.key, text: first.solution[i]! })
  expect(await ui.find({ text: /✅ 1  ·  ❌ 0/ })).toBeDefined()
  expect(await ui.find({ text: '✅ Solved' })).toBeDefined()
  // Typed from the prompt, a move goes to the run too.
  const second = await shown(ui)
  const wrong = legal(second.fen).find(m => uciOf(m) !== second.solution[0] && !isMate(after(second.fen, m)))!.san
  expect((await $.command.run(command(wrong))).text).toBe('⚡ 1 solved, 1 missed')
  expect(await ui.find({ text: '❌ Missed: −10 s' })).toBeDefined()
  await clock.advance(STORM_MS)
  expect(await ui.find({ text: '⏱ Time! 1 solved, 1 missed.' })).toBeDefined()
  expect(await ui.find({ text: '🏅 A new best run!' })).toBeDefined()
  expect(store.stormBest).toBe(1)
  await ui.press({ key: 'storm-again' })
  expect(await ui.find({ text: /🏅 1$/ })).toBeDefined()
  await ui.press({ key: 'storm-back' })
  expect(await ui.find({ key: 'storm-back' })).toBeUndefined()
  await ui.unmount()
})

test('a game\'s setup holds the pane: /chess-break storm says so and starts nothing', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  lichess(on)
  const ui = await mount($)
  await $.command.run(command(''))
  await ui.press({ key: 'play-stockfish' })
  expect((await $.command.run(command('storm'))).text).toBe('Puzzle Storm can start once the game, its setup or the sign-in is closed.')
  await ui.press({ key: 'setup-cancel' })
  expect(await ui.find({ key: 'storm-back' })).toBeUndefined()
  await ui.unmount()
})
