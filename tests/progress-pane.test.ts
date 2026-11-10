import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

import { PANE, command, signedIn } from './fixtures/fake'

/** Scholar's mate to find: Qxf7#. */
const SCHOLAR = JSON.stringify({
  game: { pgn: 'e4 e5 Bc4 Nc6 Qf3 d6' },
  puzzle: { id: 'abc12', rating: 900, themes: ['mateIn1', 'short'], solution: ['f3f7'], initialPly: 5 },
})

const results = (nb: number, firstWins: number, performance: number) => ({ results: { nb, firstWins, replayWins: 0, puzzleRatingAvg: 1500, performance } })
const DASHBOARD = JSON.stringify({ days: 30, global: results(14, 8, 1600).results, themes: { mateIn1: results(10, 7, 1650), fork: results(4, 1, 1400), short: results(14, 8, 1600) } })

/** Answers Lichess: the puzzle, results, and the dashboard as given; keeps the addresses asked. */
function lichess(on: On, dashboard = { status: 200, text: DASHBOARD }) {
  on('ui.status', async () => ({ value: undefined }))
  on('ui.panes', async () => ({ value: [] }))
  on('ui.open', async () => ({ value: { isPlaced: true } as never }))
  const asked: string[] = []
  on('http.fetch', async (_$, e) => {
    asked.push(e.url)
    const answer = e.url.includes('/dashboard/') ? dashboard : e.url.includes('/batch/') ? { status: 200, text: '{}' } : { status: 200, text: SCHOLAR }
    return { value: { ...answer, ok: answer.status < 400, headers: {} } }
  })
  return asked
}

/** Solves Qxf7# in the pane and opens the progress screen. */
async function solvedThenProgress($: Engine) {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'retry' })
  await ui.input({ key: 'move-abc12', text: 'Qxf7#' })
  expect(await ui.find({ text: /🎉 Solved!/ })).toBeDefined()
  await ui.press({ key: 'progress' })
  return ui
}

test('the progress screen: this week’s puzzle, and back to it', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  const asked = lichess(on)
  const ui = await solvedThenProgress($)
  expect(await ui.find({ text: /^📊 Progress$/ })).toBeDefined()
  expect(await ui.find({ text: /^···█ 100%  Mate in 1$/ })).toBeDefined()
  expect(await ui.find({ text: /⭐/ })).toBeUndefined()
  // Not signed in: nothing asked of the dashboard.
  expect(asked.some(url => url.includes('/dashboard/'))).toBe(false)
  await ui.press({ key: 'progress-back' })
  expect(await ui.find({ text: /🎉 Solved!/ })).toBeDefined()
  await ui.unmount()
})

test('nothing in the last 4 weeks says so', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  lichess(on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'progress' })
  expect(await ui.find({ text: /^No puzzles in the last 4 weeks\.$/ })).toBeDefined()
  await ui.unmount()
})

test('signed in, Lichess’s numbers by theme, and in stats', async ($, on) => {
  const settle = signedIn(on)
  const asked = lichess(on)
  const ui = await solvedThenProgress($)
  await settle(() => asked.some(url => url.includes('/dashboard/30')))
  await settle(() => false, 1)
  expect(await ui.find({ text: /^⭐ Lichess, last 30 days/ })).toBeDefined()
  const rows = (await ui.findAll({ type: 'Text' })).map(e => e.text).filter(text => /^[·▁-█]{4} /.test(text))
  expect(rows).toEqual(['····    –  Fork · ⭐ 1400 · 25%', '···█ 100%  Mate in 1 · ⭐ 1650 · 70%'])
  await ui.unmount()
  expect((await $.command.run(command('stats'))).text).toContain('Mate in 1: 1 ✓ 0 ✗ (100%) · ···█ · ⭐ 1650')
})

test('a dashboard that fails says so, and the rows stay', async ($, on) => {
  const settle = signedIn(on)
  const asked = lichess(on, { status: 500, text: '' })
  const ui = await solvedThenProgress($)
  await settle(() => asked.some(url => url.includes('/dashboard/30')))
  await settle(() => false, 1)
  expect(await ui.find({ text: /^Lichess’s puzzle dashboard could not be read \(HTTP 500\)\.$/ })).toBeDefined()
  expect(await ui.find({ text: /^···█ 100%  Mate in 1$/ })).toBeDefined()
  await ui.unmount()
})
