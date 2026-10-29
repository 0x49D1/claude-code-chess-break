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
    expect(await ui.find({ text: /🎯 Black played d6\. Find the best move for White\./ })).toBeDefined()
    expect(await ui.find({ text: /🧩 Back rank mate .*White to play/ })).toBeDefined()
    // The puzzle's own themes would give the answer away: they show once it ends.
    expect(await ui.find({ text: /Mate in 1/ })).toBeUndefined()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.input({ key: 'move-abc12', text: 'qxf', kind: 'change' })
  expect(await ui.find({ text: /^  Qxf7#$/ })).toBeDefined()
  await ui.input({ key: 'move-abc12', text: 'qxf' })
  expect(await ui.find({ text: /🎉 Solved!/ })).toBeDefined()
  expect(await ui.find({ text: /^📜 4\. Qxf7#$/ })).toBeDefined()
  expect(await ui.find({ text: /🔖 Mate in 1 · Short puzzle/ })).toBeDefined()
  expect(await ui.find({ text: /🔥 Streak 1 · best 1/ })).toBeDefined()
  expect(await ui.find({ text: /^🟩$/ })).toBeDefined()
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
  expect(await ui.find({ text: /👀 Qxf7#\. It will come back for review\./ })).toBeDefined()

  // Not due yet: the next one is new.
  await ui.press({ key: 'next' })
  expect(asked.at(-1)).toContain('/api/puzzle/next')
  expect((await $.command.run(command('review'))).text).toMatch(/Nothing to review/)

  await clock.advance(DAY)
  const fetched = asked.length
  expect((await $.command.run(command('review'))).text).toBe('1 puzzle to review: the next puzzles are those.')
  // The missed puzzle was kept whole: it comes back without the network.
  expect(asked.length).toBe(fetched)
  expect(await ui.find({ key: 'move-abc12' })).toBeDefined()
  expect(await ui.find({ text: /🔁 Review/ })).toBeDefined()
  expect(await ui.find({ text: /🔁 1 puzzle to review/ })).toBeDefined()
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
  expect(stats).toContain('Weakest: Mate in 1. Try /chess-break theme mateIn1.')
  expect(await ui.find({ text: /^🟥🟥🟥$/ })).toBeDefined()
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
  expect(await ui.find({ text: /Aux Blancs de jouer/ })).toBeDefined()
  expect((await $.command.run(command('lang en'))).text).toBe('Language: en.')
  expect(await ui.find({ text: /Black played d6\./ })).toBeDefined()
  expect((await $.command.run(command('lang ru'))).text).toBe('Язык: ru.')
  expect(await ui.find({ text: /Чёрные сыграли d6\. Найди лучший ход за белых\./ })).toBeDefined()
  expect(await ui.find({ text: /Ход белых/ })).toBeDefined()
  expect((await $.command.run(command('lang ka'))).text).toBe('ენა: ka.')
  expect(await ui.find({ text: /შავები ითამაშეს d6\./ })).toBeDefined()
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

test('puzzles from Chess.com, the offline set, or offline when the network fails', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  let isDown = false
  const asked: { url: string; agent?: string }[] = []
  on('http.fetch', async (_$, e) => {
    asked.push({ url: e.url, agent: e.init?.headers?.['User-Agent'] })
    if (isDown) return { value: { status: 503, ok: false, headers: {}, text: '' } }
    const daily = {
      title: 'Back Rank Blues',
      url: 'https://www.chess.com/daily-chess-puzzle/2026-10-01',
      publish_time: 1790000000,
      fen: 'r5k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 23',
      pgn: '23. Qe8+ Rxe8 24. Rxe8# 1-0',
    }
    return { value: { status: 200, ok: true, headers: {}, text: e.url.includes('chess.com') ? JSON.stringify(daily) : SCHOLAR } }
  })
  on('ui.panes', async () => ({ value: [] }))
  on('ui.open', async () => ({ value: { isPlaced: true } as never }))

  expect((await $.command.run(command('source chesscom'))).text).toBe('Puzzles from Chess.com.')
  expect(asked.at(-1)).toEqual({ url: 'https://api.chess.com/pub/puzzle/random', agent: expect.stringContaining('chess-break') })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ text: /🧩 Back Rank Blues/ })).toBeDefined()
  expect(JSON.stringify(await ui.drawn())).toContain('https://www.chess.com/daily-chess-puzzle/2026-10-01')
  expect((await $.command.run(command('theme fork'))).text).toMatch(/Chess\.com’s puzzles have no themes/)

  const fetched = asked.length
  expect((await $.command.run(command('source offline'))).text).toBe('Puzzles from the offline set.')
  expect(asked.length).toBe(fetched)
  expect(await ui.find({ text: /🧩 Fork/ })).toBeDefined()

  isDown = true
  await $.command.run(command('source lichess'))
  expect(await ui.find({ text: /📡 Lichess can't be reached \(HTTP 503\): puzzles from the offline set for now\./ })).toBeDefined()
  expect(await ui.find({ key: 'hint' })).toBeDefined()
  expect((await $.command.run(command('source nonsense'))).text).toBe('/chess-break source lichess|chesscom|offline')
  await ui.unmount()
})

test('solved from the prompt, the status line keeping track while the pane is hidden', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  on('http.fetch', async () => ({
    value: { status: 200, ok: true, headers: {}, text: JSON.stringify({
      game: { pgn: 'e4 e5 Nf3 Nc6 Bc4 Nd4' },
      puzzle: { id: 'deflect', themes: ['fork'], solution: ['f3e5', 'd8g5', 'e5f7'], initialPly: 5 },
    }) },
  }))
  let isOpen = true
  on('ui.panes', async () => ({ value: [{ id: 'chess-break', isShown: isOpen, isPlaced: true }] as never }))
  on('ui.open', async () => ({ value: { isPlaced: true } as never }))
  const status: (string | undefined)[] = []
  on('ui.status', async (_$, e) => {
    status.push(e.text)
    return { value: undefined }
  })

  await $.command.run(command(''))
  // The pane shows the puzzle: no status line.
  expect(status.at(-1)).toBeUndefined()

  isOpen = false
  expect((await $.command.run(command('nxe5'))).text).toBe('Nxe5, keep going.')
  await clock.advance(400)
  expect(status.at(-1)).toBe('♞ Mix  ·  White to play  ·  ⏮ Qg5  ·  /chess-break <move> or open')
  expect((await $.command.run(command('hint'))).text).toBe('Move the knight on e5.')
  expect((await $.command.run(command('zz'))).text).toBe('“zz” can\'t be played here.')
  expect((await $.command.run(command('solution'))).text).toBe('Nxf7. It will come back for review.')
  expect(status.at(-1)).toBeUndefined()
  expect((await $.command.run(command('skip'))).text).toBe('New puzzle.')
})
