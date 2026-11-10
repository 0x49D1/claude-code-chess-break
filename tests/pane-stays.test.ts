import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

import { PANE, lichess } from './fixtures/fake'

/** Scholar's mate to find: Qxf7#. */
const SCHOLAR = JSON.stringify({
  game: { pgn: 'e4 e5 Bc4 Nc6 Qf3 d6' },
  puzzle: { id: 'abc12', themes: ['mateIn1'], solution: ['f3f7'], initialPly: 5 },
})

/** Claude starts a turn, so the pane opens on a puzzle; resolves the pane's row, the closes and the toasts. */
async function turnStarted($: Engine, on: On) {
  mock.store(on)
  const clock = mock.clock(on)
  const pane = { id: 'chess-break', isShown: true, isPlaced: true, isFocused: false }
  lichess(on, { 'difficulty=normal': { status: 200, text: SCHOLAR } }, [pane])
  const closed: string[] = []
  const toasts: string[] = []
  on('ui.close', async (_$, e) => (closed.push(String(e.id)), { value: undefined }))
  on('ui.toast', async (_$, e) => (toasts.push(String(e.text)), { value: undefined }))
  on('turn.start', async (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', async () => ({ text: '' }))
  await $.turn.start({ text: 'hi', turnId: 't1' })
  // The turn loads the puzzle in the background: wait for it, as a turn's length does.
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  for (let i = 0; i < 50 && !(await ui.find({ key: 'move-abc12' })); i++) await clock.advance(1)
  await ui.unmount()
  const done = () => $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  return { pane, closed, toasts, done }
}

test('Claude done with the puzzle untouched: the pane closes', async ($, on) => {
  const { closed, done } = await turnStarted($, on)
  await done()
  expect(closed).toEqual(['chess-break'])
})

test('a piece clicked counts as solving: the pane stays', async ($, on) => {
  const { closed, toasts, done } = await turnStarted($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'sq-f3' })
  await ui.unmount()
  await done()
  expect(closed).toEqual([])
  expect(toasts).toEqual(['Claude is done. Finish your puzzle.'])
})

test('a move typed but not played yet: the pane stays', async ($, on) => {
  const { closed, done } = await turnStarted($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.input({ key: 'move-abc12', text: 'Qx', kind: 'change' })
  await ui.unmount()
  await done()
  expect(closed).toEqual([])
})

test('the keyboard in the pane, a puzzle on: it stays, with no toast', async ($, on) => {
  const { pane, closed, toasts, done } = await turnStarted($, on)
  pane.isFocused = true
  await done()
  expect(closed).toEqual([])
  expect(toasts).toEqual([])
})

test('a solved puzzle with no next one asked for: the pane closes, the keyboard in it or not', async ($, on) => {
  const { pane, closed, toasts, done } = await turnStarted($, on)
  pane.isFocused = true
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.input({ key: 'move-abc12', text: 'Qxf7#' })
  expect(await ui.find({ text: /🎉 Solved!/ })).toBeDefined()
  await ui.unmount()
  await done()
  expect(closed).toEqual(['chess-break'])
  expect(toasts).toEqual([])
})

test('the keyboard in a game’s setup: the pane stays', async ($, on) => {
  const { pane, closed, done } = await turnStarted($, on)
  pane.isFocused = true
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.input({ key: 'move-abc12', text: 'Qxf7#' })
  await ui.press({ key: 'play-stockfish' })
  await ui.unmount()
  await done()
  expect(closed).toEqual([])
})

test('a way back at the top of Progress, About and the game setup', async ($, on) => {
  await turnStarted($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'progress' })
  await ui.press({ key: 'progress-back-top' })
  await ui.press({ key: 'about' })
  await ui.press({ key: 'about-back-top' })
  await ui.press({ key: 'play-stockfish' })
  expect(await ui.find({ key: 'setup-play' })).toBeDefined()
  await ui.press({ key: 'setup-cancel-top' })
  expect(await ui.find({ key: 'setup-play' })).toBeUndefined()
  expect(await ui.find({ key: 'move-abc12' })).toBeDefined()
  await ui.unmount()
})

test('Esc: the pane opens to close with it', async ($, on) => {
  const opens: unknown[] = []
  on('ui.status', async () => ({ value: undefined }))
  on('ui.panes', async () => ({ value: [] }))
  on('ui.open', async (_$, e) => (opens.push(e), { value: { isPlaced: true } as never }))
  mock.store(on)
  mock.clock(on)
  on('http.fetch', async () => ({ value: { status: 200, ok: true, headers: {}, text: SCHOLAR } }))
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  await $.command.run({ command: 'chess-break', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } })
  expect(opens).toContainEqual(expect.objectContaining({ id: 'chess-break', closeOnEscape: true }))
})
