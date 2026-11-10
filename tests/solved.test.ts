import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { offlinePuzzle } from '../hooks/offline'
import { KEPT_SOLVED, recordSolved } from '../hooks/training/solved'
import { PANE } from './fixtures/fake'

test('solved ids kept once each, newest last, the oldest dropped past the limit', () => {
  expect(recordSolved(recordSolved(['a', 'b'], 'a'), 'c')).toEqual(['b', 'a', 'c'])
  const full = Array.from({ length: KEPT_SOLVED }, (_, i) => `p${i}`)
  const next = recordSolved(full, 'new')
  expect(next.length).toBe(KEPT_SOLVED)
  expect(next[0]).toBe('p1')
  expect(next.at(-1)).toBe('new')
})

test('offline: a solved puzzle is skipped until every one on the theme is solved', () => {
  const first = offlinePuzzle('fork', [], () => 0)
  expect(offlinePuzzle('fork', [first.id], () => 0).id).not.toBe(first.id)
  const all: string[] = []
  for (let p = offlinePuzzle('smotheredMate', all, () => 0); !all.includes(p.id); p = offlinePuzzle('smotheredMate', all, () => 0)) all.push(p.id)
  // All solved: they come again rather than none.
  expect(all).toContain(offlinePuzzle('smotheredMate', all, () => 0).id)
})

/** A mate in 1 under the given id. */
const puzzle = (id: string) =>
  JSON.stringify({ game: { pgn: 'e4 e5 Bc4 Nc6 Qf3 d6' }, puzzle: { id, themes: ['mateIn1'], solution: ['f3f7'], initialPly: 5 } })

/** Lichess answering with the ids given, in turn, the last one again once they run out; keeps the count. */
function lichess(on: On, ids: string[]) {
  mock.store(on)
  mock.clock(on)
  on('ui.status', async () => ({ value: undefined }))
  on('ui.panes', async () => ({ value: [] }))
  on('ui.open', async () => ({ value: { isPlaced: true } as never }))
  const asked: string[] = []
  on('http.fetch', async (_$, e) => {
    asked.push(e.url)
    const id = ids[Math.min(asked.length, ids.length) - 1]!
    return { value: { status: 200, ok: true, headers: {}, text: puzzle(id) } }
  })
  return asked
}

test('a puzzle solved cleanly is not offered again', async ($, on) => {
  const asked = lichess(on, ['once', 'once', 'fresh'])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'retry' })
  await ui.input({ key: 'move-once', text: 'Qxf7#' })
  await ui.press({ key: 'next' })
  // Lichess offered it again: asked once more, and the fresh one shows.
  expect(asked.length).toBe(3)
  expect(await ui.find({ key: 'move-fresh' })).toBeDefined()
  await ui.unmount()
})

test('a missed puzzle can come again', async ($, on) => {
  const asked = lichess(on, ['missed', 'other', 'missed'])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'retry' })
  await ui.press({ key: 'reveal' })
  await ui.press({ key: 'next' })
  await ui.press({ key: 'reveal' })
  await ui.press({ key: 'next' })
  expect(asked.length).toBe(3)
  expect(await ui.find({ key: 'move-missed' })).toBeDefined()
  await ui.unmount()
})

test('after 3 tries a solved puzzle is taken again rather than none', async ($, on) => {
  const asked = lichess(on, ['only'])
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'retry' })
  await ui.input({ key: 'move-only', text: 'Qxf7#' })
  await ui.press({ key: 'next' })
  expect(asked.length).toBe(4)
  expect(await ui.find({ key: 'move-only' })).toBeDefined()
  await ui.unmount()
})
