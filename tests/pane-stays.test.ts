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
  mock.clock(on)
  const pane = { id: 'chess-break', isShown: true, isPlaced: true, isFocused: false }
  lichess(on, { 'difficulty=normal': { status: 200, text: SCHOLAR } }, [pane])
  const closed: string[] = []
  const toasts: string[] = []
  on('ui.close', async (_$, e) => (closed.push(String(e.id)), { value: undefined }))
  on('ui.toast', async (_$, e) => (toasts.push(String(e.text)), { value: undefined }))
  on('turn.start', async (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', async () => ({ text: '' }))
  await $.turn.start({ text: 'hi', turnId: 't1' })
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

test('the person in the pane: it stays, with no toast', async ($, on) => {
  const { pane, closed, toasts, done } = await turnStarted($, on)
  pane.isFocused = true
  await done()
  expect(closed).toEqual([])
  expect(toasts).toEqual([])
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
