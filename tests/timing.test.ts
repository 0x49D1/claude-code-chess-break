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

/** Scholar's mate to find: Qxf7#, one move. */
const SCHOLAR = JSON.stringify({
  game: { pgn: 'e4 e5 Bc4 Nc6 Qf3 d6' },
  puzzle: { id: 'abc12', rating: 900, themes: ['mateIn1', 'short'], solution: ['f3f7'], initialPly: 5 },
})

/** Three plies: Nxe5, the reply Qg5, then Nxf7. */
const DEFLECT = JSON.stringify({
  game: { pgn: 'e4 e5 Nf3 Nc6 Bc4 Nd4' },
  puzzle: { id: 'deflect', themes: ['fork'], solution: ['f3e5', 'd8g5', 'e5f7'], initialPly: 5 },
})

/** Lichess answering with the puzzle, the pane shown or not; resolves the clock to move. */
function setup(on: On, puzzle: string, isShown = false) {
  mock.store(on)
  const clock = mock.clock(on)
  on('ui.status', async () => ({ value: undefined }))
  on('ui.panes', async () => ({ value: (isShown ? [{ id: 'chess-break', isShown: true, isPlaced: true }] : []) as never }))
  on('ui.open', async () => ({ value: { isPlaced: true } as never }))
  on('http.fetch', async () => ({ value: { status: 200, ok: true, headers: {}, text: puzzle } }))
  return clock
}

const mount = ($: Engine) => $.ui.mount({ ...PANE, surface: 'terminal' })

/** The puzzle's title line alone: a Text keeps no key once drawn. */
const titleOf = async (ui: Awaited<ReturnType<typeof mount>>) =>
  (await ui.findAll({ type: 'Text' })).map(e => e.text).find(text => text.startsWith('🧩 '))

test('the clock starts with the first move; the solve’s time shows, then in Progress and stats', async ($, on) => {
  const clock = setup(on, DEFLECT)
  const ui = await mount($)
  await ui.press({ key: 'retry' })
  // The pane open in the background: a minute before the first move does not count.
  await clock.advance(60_000)
  expect(await titleOf(ui)).toMatch(/  ·  ⏱ 0:00$/)
  await ui.input({ key: 'move-deflect', text: 'Nxe5' })
  await clock.advance(42_000)
  await ui.input({ key: 'move-deflect', text: 'Nxf7' })
  expect(await ui.find({ text: /🎉 Solved!/ })).toBeDefined()
  // Stopped at the solve.
  await clock.advance(30_000)
  expect(await titleOf(ui)).toMatch(/  ·  ⏱ 0:42$/)
  await ui.press({ key: 'progress' })
  expect(await ui.find({ text: /^⏱ Clean solves: 0:42 on average, fastest 0:42$/ })).toBeDefined()
  await ui.unmount()
  const stats = (await $.command.run(command('stats'))).text
  expect(stats).toContain('⏱ Clean solves: 0:42 on average, fastest 0:42')
  expect(stats).toContain('Fork: 1 ✓ 0 ✗ (100%) · ···█ · ⏱ 0:42')
})

test('a puzzle solved in one move has no time, and a miss is not counted', async ($, on) => {
  setup(on, SCHOLAR)
  const ui = await mount($)
  await ui.press({ key: 'retry' })
  await ui.input({ key: 'move-abc12', text: 'Qxf7#' })
  expect(await ui.find({ text: /🎉 Solved!/ })).toBeDefined()
  expect(await titleOf(ui)).not.toMatch(/⏱/)
  await ui.press({ key: 'next' })
  await ui.press({ key: 'reveal' })
  await ui.press({ key: 'progress' })
  expect(await ui.find({ text: /Clean solves/ })).toBeUndefined()
  await ui.unmount()
})

test('a wrong first try starts the clock too, and it moves while the pane is shown', async ($, on) => {
  const clock = setup(on, DEFLECT, true)
  const ui = await mount($)
  await ui.press({ key: 'retry' })
  await clock.advance(10_000)
  expect(await titleOf(ui)).toMatch(/⏱ 0:00$/)
  await ui.input({ key: 'move-deflect', text: 'Nxd4' })
  await clock.advance(5_000)
  expect(await titleOf(ui)).toMatch(/⏱ 0:05$/)
  await ui.input({ key: 'move-deflect', text: 'Nxe5' })
  await clock.advance(1_000)
  await ui.input({ key: 'move-deflect', text: 'Nxf7' })
  expect(await titleOf(ui)).toMatch(/⏱ 0:06$/)
  // Solved: the redraw stops at its next second.
  await clock.advance(1_000)
  await ui.unmount()
})
