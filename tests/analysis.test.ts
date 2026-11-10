import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { readAnalysis } from '../hooks/lichess/analysis'
import { AI, PANE, command, full, lichess, signedIn, state } from './fixtures/fake'

const ok = (body: object) => ({ ok: true, status: 200, text: JSON.stringify(body) })

/** The fool's mate, as Lichess's analysis judges it: white's 1. f3 and 2. g4 lose. */
const FOOLS_MATE = {
  id: 'g4m3',
  moves: 'f3 e5 g4 Qh4#',
  analysis: [
    { eval: -55, best: 'e2e4', variation: 'e4 e5 Nf3', judgment: { name: 'Inaccuracy', comment: 'Inaccuracy. e4 was best.' } },
    { eval: -40 },
    { mate: -1, best: 'g1f3', variation: 'Nf3 d5', judgment: { name: 'Blunder', comment: 'Checkmate is now unavoidable. Nf3 was best.' } },
    {},
  ],
}

test('the person’s judged moves, the costliest first', () => {
  expect(readAnalysis(ok(FOOLS_MATE), 'w')).toEqual([
    { ply: 2, san: 'g4', judgment: 'Blunder', best: 'Nf3', loss: 960 },
    { ply: 0, san: 'f3', judgment: 'Inaccuracy', best: 'e4', loss: 70 },
  ])
  // Black's moves were not judged.
  expect(readAnalysis(ok(FOOLS_MATE), 'b')).toEqual([])
  expect(readAnalysis(ok(FOOLS_MATE), 'w', 1).map(m => m.san)).toEqual(['g4'])
})

test('no analysis yet, the better move from best, and errors', () => {
  expect(readAnalysis(ok({ id: 'g4m3', moves: 'e4 e5' }), 'w')).toBeUndefined()
  const bare = { moves: 'e4 e5 Qh5', analysis: [{ eval: 20 }, { eval: 30 }, { eval: -2000, best: 'g1f3', judgment: { name: 'Mistake' } }] }
  // Capped at 10 pawns: 30 down to -1000.
  expect(readAnalysis(ok(bare), 'w')).toEqual([{ ply: 2, san: 'Qh5', judgment: 'Mistake', best: 'g1f3', loss: 1030 }])
  expect(() => readAnalysis({ ok: false, status: 404, text: '' }, 'w')).toThrow('HTTP 404')
})

/** A game against Stockfish, played as white to the given end; resolves the answers Lichess gives, to change. */
async function finishedGame($: Engine, on: On, moves: string, end: object) {
  const settle = signedIn(on)
  const answers: Record<string, { status: number; text: string }> = { ...AI, 'opening=false': { status: 200, text: JSON.stringify({ id: 'g4m3', moves: '' }) } }
  const fake = lichess(on, answers)
  await $.command.run(command('play stockfish'))
  await settle(() => fake.streams('/stream/g4m3').length > 0)
  const curl = fake.streams('/stream/g4m3')[0]!
  curl.feed.line(full())
  await settle(() => false, 1)
  curl.feed.line(state(moves, end))
  curl.feed.end()
  await settle(() => false, 1)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const done = async () => {
    await ui.unmount()
    fake.endAll()
    await settle(() => false, 1)
  }
  return { ui, answers, settle, calls: fake.calls, done }
}

test('a review waits for Lichess’s analysis, then shows the costliest moves', async ($, on) => {
  const { ui, answers, settle, calls, done } = await finishedGame($, on, 'f2f3 e7e5 g2g4 d8h4', { status: 'mate', winner: 'black' })
  expect(await ui.find({ text: /🏁/ })).toBeDefined()
  await ui.press({ key: 'review' })
  expect(calls.at(-1)?.url).toBe('https://lichess.org/game/export/g4m3?evals=true&clocks=false&opening=false')
  expect(await ui.find({ text: /^🔍 The analysis happens on Lichess/ })).toBeDefined()
  expect(JSON.stringify(await ui.findAll({ type: 'Link' }))).toContain('Open the game on Lichess ↗')
  expect(await ui.find({ text: /⏳ Waiting for Lichess’s analysis…/ })).toBeDefined()

  // Requested on Lichess and done: the next read shows it, with no press.
  answers['opening=false'] = { status: 200, text: JSON.stringify(FOOLS_MATE) }
  await settle(() => false, 5000, 1)
  await settle(() => false, 1)
  expect(await ui.find({ text: /^🔍 Your costliest moves/ })).toBeDefined()
  expect(JSON.stringify(await ui.find({ key: 'mistake-2' }))).toContain('2. g4?? Blunder · better Nf3 · −9.6')
  expect(JSON.stringify(await ui.find({ key: 'mistake-0' }))).toContain('1. f3?! Inaccuracy · better e4 · −0.7')
  // The position before 2. g4: the g-pawn still home, no queen on h4.
  await ui.press({ key: 'mistake-2' })
  expect(JSON.stringify(await ui.find({ key: 'sq-g2' }))).toContain('♙')
  expect(JSON.stringify(await ui.find({ key: 'sq-h4' }))).not.toContain('♛')
  // Settled: no more reads.
  const reads = calls.length
  await settle(() => false, 5000, 2)
  expect(calls.length).toBe(reads)
  await done()
})

test('after 3 minutes the review gives up; check again says when Lichess fails', async ($, on) => {
  const { ui, answers, settle, done } = await finishedGame($, on, 'e2e4 e7e5', { status: 'resign', winner: 'white' })
  await ui.press({ key: 'review' })
  await settle(() => false, 5000, 36)
  await settle(() => false, 1)
  expect(await ui.find({ text: /^Lichess has no analysis of this game yet\.$/ })).toBeDefined()
  answers['opening=false'] = { status: 500, text: '' }
  await ui.press({ key: 'check-analysis' })
  expect(await ui.find({ text: /^Lichess’s analysis could not be read \(HTTP 500\)\.$/ })).toBeDefined()
  await done()
})

test('no mistakes found, and no review for an aborted game', async ($, on) => {
  const { ui, answers, done } = await finishedGame($, on, 'e2e4 e7e5', { status: 'resign', winner: 'white' })
  answers['opening=false'] = { status: 200, text: JSON.stringify({ moves: 'e4 e5', analysis: [{ eval: 20 }, { eval: 25 }] }) }
  await ui.press({ key: 'review' })
  expect(await ui.find({ text: /^✅ Lichess found no mistakes in your moves\.$/ })).toBeDefined()
  await done()
})

test('an aborted game offers no review', async ($, on) => {
  const { ui, done } = await finishedGame($, on, '', { status: 'aborted' })
  expect(await ui.find({ key: 'review' })).toBeUndefined()
  await done()
})
