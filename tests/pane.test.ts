import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const DAY = 24 * 60 * 60 * 1000

const PANE = {
  plugin: 'chess-break',
  component: 'Pane',
  requestId: 'chess-break',
  props: {
    title: '♞ chess-break',
    isFocused: true,
    bodyColumns: 40,
    placement: 'inline' as 'dock' | 'inline',
    scroll: { offset: 0, bodyRows: 19 },
    view: {},
  },
} as const

/** Scholar's mate to find: Qxf7#. */
const SCHOLAR = JSON.stringify({
  game: { pgn: 'e4 e5 Bc4 Nc6 Qf3 d6' },
  puzzle: { id: 'abc12', rating: 900, themes: ['mateIn1', 'short'], solution: ['f3f7'], initialPly: 5 },
})

/** Answers Lichess from memory, the first new puzzle abc12, the next ones new2, new3…, and keeps the addresses asked. */
function lichess(on: On) {
  const asked: string[] = []
  on('http.fetch', async (_$, e) => {
    asked.push(e.url)
    const news = asked.filter(url => url.includes('/next')).length
    const id = e.url.endsWith('/abc12') || news <= 1 ? 'abc12' : `new${news}`
    return { value: { status: 200, ok: true, headers: {}, text: SCHOLAR.replace('abc12', id) } }
  })
  return asked
}

const command = (args: string) => ({ command: 'chess-break', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 120 } })

test('a puzzle on the chosen theme, solved by typing', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  const asked = lichess(on)
  on('ui.panes', async () => ({ value: [] }))
  on('ui.open', async () => ({ value: { isPlaced: true } as never }))
  expect((await $.command.run(command('theme back-rank-mate'))).text).toBe('Training: Back rank mate. The next puzzle is on it.')
  expect(asked.at(-1)).toContain('angle=backRankMate')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ text: /Black played d6\. Find the best move for White\./ })).toBeDefined()
    expect(await ui.find({ text: /Mate in 1/ })).toBeDefined()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.input({ key: 'move-abc12', text: 'qxf', kind: 'change' })
  expect(await ui.find({ text: /→ Qxf7#/ })).toBeDefined()
  await ui.input({ key: 'move-abc12', text: 'qxf' })
  expect(await ui.find({ text: /Solved!/ })).toBeDefined()
  expect(await ui.find({ text: /^4\. Qxf7#$/ })).toBeDefined()
  expect(await ui.find({ text: /streak 1 \(best 1\)/ })).toBeDefined()
  await ui.unmount()
})

test('a missed puzzle comes back for review the next day', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  const asked = lichess(on)
  on('ui.panes', async () => ({ value: [] }))
  on('ui.open', async () => ({ value: { isPlaced: true } as never }))
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'retry' })
  await ui.press({ key: 'reveal' })
  expect(await ui.find({ text: /Solution: Qxf7#\. It will come back for review\./ })).toBeDefined()

  // Not due yet: the next one is new.
  await ui.press({ key: 'next' })
  expect(asked.at(-1)).toContain('/api/puzzle/next')
  expect((await $.command.run(command('review'))).text).toMatch(/Nothing to review/)

  await clock.advance(DAY)
  expect((await $.command.run(command('review'))).text).toBe('1 to review: the next puzzles are those.')
  expect(asked.at(-1)).toBe('https://lichess.org/api/puzzle/abc12')
  expect(await ui.find({ text: /↻ review/ })).toBeDefined()
  await ui.unmount()
})

test('stats by theme, with the weakest one', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  lichess(on)
  expect((await $.command.run(command('stats'))).text).toMatch(/No puzzles yet/)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'retry' })
  for (let i = 0; i < 3; i++) {
    await ui.press({ key: 'hint' })
    await ui.press({ key: 'next' })
  }
  const stats = (await $.command.run(command('stats'))).text
  expect(stats).toContain('Mate in 1: 0 ✓ 3 ✗ (0%)')
  expect(stats).not.toContain('Short puzzle')
  expect(stats).toContain('Weakest: mateIn1')
  expect((await $.command.run(command('theme nonsense'))).text).toMatch(/No theme “nonsense”/)
  expect((await $.command.run(command('themes'))).text).toMatch(/^Themes for/)
  await ui.unmount()
})

test('French from the locale, English on request', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  mock.env(on, { LANG: 'fr_FR.UTF-8' })
  lichess(on)
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('session.start', async (_$, e) => e)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'retry' })
  expect(await ui.find({ text: /Les Noirs ont joué d6\./ })).toBeDefined()
  expect(await ui.find({ text: /Mat en 1/ })).toBeDefined()
  expect((await $.command.run(command('lang en'))).text).toBe('Language: en.')
  expect(await ui.find({ text: /Black played d6\./ })).toBeDefined()
  await ui.unmount()
})

test('a promotion is chosen with buttons', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  on('http.fetch', async () => ({
    value: { status: 200, ok: true, headers: {}, text: JSON.stringify({
      game: { pgn: 'e4 d5 exd5 c6 dxc6 Nf6 cxb7 Nbd7' },
      puzzle: { id: 'promo', themes: ['promotion'], solution: ['b7a8q'], initialPly: 7 },
    }) },
  }))
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'retry' })
  await ui.press({ key: 'sq-b7' })
  await ui.press({ key: 'sq-a8' })
  expect(await ui.find({ key: 'promote-n' })).toBeDefined()
  await ui.press({ key: 'promote-q' })
  expect(await ui.find({ text: /Solved!/ })).toBeDefined()
  await ui.unmount()
})
