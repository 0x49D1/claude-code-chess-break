import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

import { NO_TIMES, averageMs, formatTime, recordTime } from '../hooks/training/timing'
import { PANE, command } from './fixtures/fake'

test('clean solves timed, overall and by trained theme; one left open too long is not counted', () => {
  let t = recordTime(NO_TIMES, ['fork', 'short'], 42_000)
  t = recordTime(t, ['fork'], 18_000)
  expect(t.all).toEqual({ count: 2, totalMs: 60_000, fastestMs: 18_000 })
  expect(t.themes).toEqual({ fork: { count: 2, totalMs: 60_000, fastestMs: 18_000 } })
  expect(averageMs(t.all)).toBe(30_000)
  expect(recordTime(t, ['pin'], 11 * 60_000)).toBe(t)
})

test('times read as minutes and seconds', () => {
  expect(formatTime(0)).toBe('0:00')
  expect(formatTime(42_999)).toBe('0:42')
  expect(formatTime(725_000)).toBe('12:05')
})

/** Scholar's mate to find: Qxf7#. */
const SCHOLAR = JSON.stringify({
  game: { pgn: 'e4 e5 Bc4 Nc6 Qf3 d6' },
  puzzle: { id: 'abc12', rating: 900, themes: ['mateIn1', 'short'], solution: ['f3f7'], initialPly: 5 },
})

/** Lichess answering the puzzle, the pane shown or not; resolves the clock to move. */
function setup(on: On, isShown = false) {
  mock.store(on)
  const clock = mock.clock(on)
  on('ui.status', async () => ({ value: undefined }))
  on('ui.panes', async () => ({ value: (isShown ? [{ id: 'chess-break', isShown: true, isPlaced: true }] : []) as never }))
  on('ui.open', async () => ({ value: { isPlaced: true } as never }))
  on('http.fetch', async () => ({ value: { status: 200, ok: true, headers: {}, text: SCHOLAR } }))
  return clock
}

/** The puzzle's title line alone: a Text keeps no key once drawn. */
const titleOf = async (ui: Awaited<ReturnType<Engine['ui']['mount']>>) =>
  (await ui.findAll({ type: 'Text' })).map(e => e.text).find(text => text.startsWith('🧩 '))

test('a solve’s time on the puzzle, then in Progress and stats', async ($, on) => {
  const clock = setup(on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'retry' })
  expect(await titleOf(ui)).toMatch(/  ·  ⏱ 0:00$/)
  await clock.advance(42_000)
  await ui.input({ key: 'move-abc12', text: 'Qxf7#' })
  expect(await ui.find({ text: /🎉 Solved!/ })).toBeDefined()
  // Stopped at the solve.
  await clock.advance(30_000)
  expect(await titleOf(ui)).toMatch(/  ·  ⏱ 0:42$/)
  await ui.press({ key: 'progress' })
  expect(await ui.find({ text: /^⏱ Clean solves: 0:42 on average, fastest 0:42$/ })).toBeDefined()
  await ui.unmount()
  const stats = (await $.command.run(command('stats'))).text
  expect(stats).toContain('⏱ Clean solves: 0:42 on average, fastest 0:42')
  expect(stats).toContain('Mate in 1: 1 ✓ 0 ✗ (100%) · ···█ · ⏱ 0:42')
})

test('a missed puzzle’s time is not counted', async ($, on) => {
  setup(on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'retry' })
  await ui.press({ key: 'reveal' })
  await ui.press({ key: 'progress' })
  expect(await ui.find({ text: /Clean solves/ })).toBeUndefined()
  await ui.unmount()
})

test('the clock moves while the pane is shown; reopened untouched, it starts again', async ($, on) => {
  const clock = setup(on, true)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'retry' })
  await clock.advance(5_000)
  expect(await titleOf(ui)).toMatch(/⏱ 0:05$/)
  // The pane opened again by command, before any move: the time away does not count.
  await clock.advance(60_000)
  await $.command.run(command(''))
  expect(await titleOf(ui)).toMatch(/⏱ 0:00$/)
  await clock.advance(3_000)
  await ui.input({ key: 'move-abc12', text: 'Qxf7#' })
  expect(await titleOf(ui)).toMatch(/⏱ 0:03$/)
  // Solved: the redraw stops at its next second.
  await clock.advance(1_000)
  await ui.unmount()
})
