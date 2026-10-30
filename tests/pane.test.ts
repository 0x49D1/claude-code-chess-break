import { expect, mock, test } from 'claude-code/testing'
import type { On, RenderElement } from 'claude-code'
import type { Engine } from 'claude-code/testing'

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

/**
 * The hint row under the prompt as the mod leaves it: the test draws it in the engine's place,
 * and reads the tail the mod added.
 */
function hintRow($: Engine, on: On) {
  let tail = ''
  on('ui.render', { component: 'PromptHint' }, async (engine, e) => {
    tail = String(e.props.tail ?? '')
    const { Text } = engine.ui.resolve(e)
    return h(Text, null, `${e.props.hint} ${tail}`) as RenderElement
  })
  return async () => {
    tail = ''
    const ui = await $.ui.mount({ plugin: 'chess-break', component: 'PromptHint', surface: 'terminal', props: { isDraft: false, isWorking: false, hint: '? for shortcuts' } })
    await ui.unmount()
    return tail
  }
}

/** Takes the status line under the prompt and drops it. */
function quietStatus(on: On) {
  on('ui.status', async () => ({ value: undefined }))
}

/** Answers Lichess from memory, the first new puzzle abc12, the next ones new2, new3…, and keeps the addresses asked. */
function lichess(on: On) {
  quietStatus(on)
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
  expect(JSON.stringify(await ui.find({ key: 'ply-1' }))).toContain('4. Qxf7#')
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
  quietStatus(on)
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
  quietStatus(on)
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

test('solved from the prompt, the line under it keeping track while the pane is hidden', async ($, on) => {
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
  const tail = hintRow($, on)

  await $.command.run(command(''))
  // The pane shows the puzzle: the line stays as it was.
  expect(await tail()).not.toContain('♞')

  isOpen = false
  expect((await $.command.run(command('nxe5'))).text).toBe('Nxe5, keep going.')
  await clock.advance(400)
  expect(await tail()).toContain('♞ Mix · White to play · ⏮ Qg5 · /chess-break <move> or open')
  expect((await $.command.run(command('hint'))).text).toBe('Move the knight on e5.')
  expect((await $.command.run(command('zz'))).text).toBe('“zz” can\'t be played here.')
  expect((await $.command.run(command('solution'))).text).toBe('Nxf7. It will come back for review.')
  expect(await tail()).not.toContain('♞')
  expect((await $.command.run(command('skip'))).text).toBe('New puzzle.')
})

test('the line under the prompt can be turned off', { options: { promptLine: false } }, async ($, on) => {
  mock.store(on)
  mock.clock(on)
  lichess(on)
  on('ui.panes', async () => ({ value: [] }))
  const tail = hintRow($, on)
  await $.command.run(command('next'))
  expect(await tail()).not.toContain('♞')
})

test('a failed explanation says why, and Explain asks again', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  lichess(on)
  const usage = { input_tokens: 0, output_tokens: 0 } as never
  let calls = 0
  on('model.complete', async () => {
    calls++
    if (calls === 2) throw new Error('refused')
    return { value: { isAnswered: false, reason: 'api-error', status: 429, error: 'rate_limit', usage } }
  })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'retry' })
  await ui.press({ key: 'reveal' })
  await ui.press({ key: 'explain' })
  expect(await ui.find({ text: /🧠 Claude is out of usage limits for now\./ })).toBeDefined()
  expect(await ui.find({ key: 'explain' })).toBeDefined()

  await ui.press({ key: 'explain' })
  expect(calls).toBe(2)
  expect(await ui.find({ text: /🧠 The request to Claude was not sent\./ })).toBeDefined()
  expect(await ui.find({ text: /looking at it/ })).toBeUndefined()

  // The command asks again too, and answers the pane's words.
  expect((await $.command.run(command('explain'))).text).toBe('Claude is out of usage limits for now.')
  expect(calls).toBe(3)
  await ui.unmount()
})

test('a finished puzzle replays move by move, and Claude explains it on request', async ($, on) => {
  quietStatus(on)
  mock.store(on)
  mock.clock(on)
  on('http.fetch', async () => ({
    value: { status: 200, ok: true, headers: {}, text: JSON.stringify({
      game: { pgn: 'e4 e5 Nf3 Nc6 Bc4 Nd4' },
      puzzle: { id: 'replay', themes: ['fork'], solution: ['f3e5', 'd8g5', 'e5f7'], initialPly: 5 },
    }) },
  }))
  const asked: { model: string; prompt: string }[] = []
  on('model.complete', async (_$, e) => {
    asked.push({ model: e.model, prompt: String(e.prompt) })
    const usage = { input_tokens: 1, output_tokens: 1 } as never
    return { value: { isAnswered: true, text: 'WHY: Nxe5 grabs a pawn and eyes f7.\nTIP: Look for knight forks on f7.\nFACT: The f7 square is the weakest at the start.', usage } }
  })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'retry' })
  await ui.input({ key: 'move-replay', text: 'Nxd4' })
  await ui.press({ key: 'reveal' })
  const square = async (name: string) => JSON.stringify(await ui.find({ key: `sq-${name}` }))

  // The end: the knight on f7. The start: on f3.
  expect(await square('f7')).toContain('♘')
  await ui.press({ key: 'ply-0' })
  expect(await square('f3')).toContain('♘')
  expect(await square('f7')).not.toContain('♘')
  await ui.press({ key: 'forward' })
  expect(await square('e5')).toContain('♘')
  await ui.press({ key: 'ply-2' })
  expect(await square('g5')).toContain('♛')
  await ui.press({ key: 'back' })
  await ui.press({ key: 'back' })
  await ui.press({ key: 'back' })
  expect(await square('f3')).toContain('♘')

  await ui.press({ key: 'explain' })
  expect(asked).toHaveLength(1)
  expect(asked[0]!.prompt).toContain('The solution, both sides\' moves: Nxe5 Qg5 Nxf7')
  expect(asked[0]!.prompt).toContain('Moves the player tried that were wrong:')
  expect(await ui.find({ text: /^💭 Nxe5 grabs a pawn and eyes f7\.$/ })).toBeDefined()
  expect(await ui.find({ text: /^📌 Look for knight forks on f7\.$/ })).toBeDefined()
  expect(await ui.find({ text: /^✨ The f7 square/ })).toBeDefined()
  expect(await ui.find({ key: 'explain' })).toBeUndefined()
  const drawn = JSON.stringify(await ui.drawn())
  expect(drawn).toContain('https://lichess.org/training/fork')
  expect(drawn).toContain('https://en.wikipedia.org/wiki/Fork_(chess)')
  expect(drawn).toContain('Practise Fork ↗')
  // Asked once per puzzle: the command reuses it.
  expect((await $.command.run(command('explain'))).text).toBe(
    '💭 Nxe5 grabs a pawn and eyes f7.\n📌 Look for knight forks on f7.\n✨ The f7 square is the weakest at the start.\n' +
      '🔗 https://lichess.org/training/fork\n🔗 https://en.wikipedia.org/wiki/Fork_(chess)',
  )
  expect(asked).toHaveLength(1)
  await ui.unmount()
})
