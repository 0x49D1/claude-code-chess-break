import { expect, test } from 'claude-code/testing'

import { readDashboard } from '../hooks/lichess/dashboard'
import { dayOf } from '../hooks/training/daily'
import { progressRows, recordHistory, spark } from '../hooks/training/history'

/** Noon on a local day of November 2026, so no time zone moves it to another day. */
const noon = (date: number) => new Date(2026, 10, date, 12).getTime()

test('a puzzle counted under its day and trained themes', () => {
  let h = recordHistory({}, noon(10), ['fork', 'short'], true)
  h = recordHistory(h, noon(10), ['fork', 'pin'], false)
  expect(h).toEqual({ '2026-11-10': { fork: { solved: 1, failed: 1 }, pin: { solved: 0, failed: 1 } } })
})

test('days past 12 weeks are dropped', () => {
  const old = { [dayOf(noon(10) - 84 * 86_400_000)]: { fork: { solved: 1, failed: 0 } } }
  const kept = { [dayOf(noon(10) - 83 * 86_400_000)]: { fork: { solved: 1, failed: 0 } } }
  const h = recordHistory({ ...old, ...kept }, noon(10), ['pin'], true)
  expect(Object.keys(h).sort()).toEqual([...Object.keys(kept), '2026-11-10'].sort())
})

test('a day after today is kept when the clock goes back', () => {
  const h = recordHistory(recordHistory({}, noon(11), ['fork'], true), noon(10), ['pin'], true)
  expect(h).toEqual({ '2026-11-11': { fork: { solved: 1, failed: 0 } }, '2026-11-10': { pin: { solved: 1, failed: 0 } } })
})

test('weeks end today, oldest first; the weakest theme comes first', () => {
  let h = recordHistory({}, noon(3), ['pin'], true)
  for (const isClean of [true, false, false, false]) h = recordHistory(h, noon(4), ['pin'], isClean)
  for (const isClean of [true, true]) h = recordHistory(h, noon(10), ['fork'], isClean)
  const rows = progressRows(h, noon(10))
  expect(rows.map(r => r.theme)).toEqual(['pin', 'fork'])
  // Nov 4 is in this week (Nov 4–10), Nov 3 in the one before.
  expect(rows[0]).toEqual({ theme: 'pin', weeks: [undefined, undefined, 100, 25], accuracy: 40 })
  expect(spark(rows[0]!.weeks)).toBe('··█▃')
  expect(spark(rows[1]!.weeks)).toBe('···█')
})

test('Lichess themes join the rows; length themes are left out', () => {
  const h = recordHistory({}, noon(10), ['fork'], true)
  const rows = progressRows(h, noon(10), {
    fork: { played: 10, accuracy: 70, performance: 1650 },
    pin: { played: 4, accuracy: 25, performance: 1400 },
    short: { played: 9, accuracy: 10, performance: 1200 },
  })
  expect(rows.map(r => [r.theme, r.accuracy, r.lichess?.performance])).toEqual([['pin', undefined, 1400], ['fork', 100, 1650]])
})

test('the dashboard read with checks', () => {
  const ok = (body: object) => ({ ok: true, status: 200, text: JSON.stringify(body) })
  const results = (nb: number, firstWins: number, performance: number) => ({ results: { nb, firstWins, replayWins: 0, puzzleRatingAvg: 1500, performance }, theme: 'x' })
  expect(readDashboard(ok({ days: 30, global: {}, themes: { fork: results(10, 7, 1650), pin: { theme: 'Pin' }, mate: results(0, 0, 0) } }))).toEqual({
    fork: { played: 10, accuracy: 70, performance: 1650 },
  })
  expect(() => readDashboard(ok({ days: 30 }))).toThrow('unexpected answer')
  expect(() => readDashboard({ ok: false, status: 401, text: '' })).toThrow('token refused')
  expect(() => readDashboard({ ok: true, status: 200, text: '<html>' })).toThrow()
})
