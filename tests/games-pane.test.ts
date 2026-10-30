import { expect, mock, test } from 'claude-code/testing'
import type { On, RenderElement } from 'claude-code'
import type { Engine } from 'claude-code/testing'

import { glyphOf } from '../hooks/ui/board'
import { AI, PANE, command, fields, full, lichess, signedIn, state, stockfishGame } from './fixtures/fake'
import { CORRESPONDENCE_FULL, PLAYING } from './fixtures/lichess'

const mount = ($: Engine) => $.ui.mount({ ...PANE, surface: 'terminal' })

/** The Text that shows exactly `text`, or one that matches it: a Text keeps no key once drawn. */
const textOf = async (ui: Awaited<ReturnType<typeof mount>>, text: string | RegExp) =>
  (await ui.findAll({ type: 'Text' })).find(e => (typeof text === 'string' ? e.text === text : text.test(e.text)))

/** Two correspondence games: Stockfish waiting on the opponent, bob waiting on the person. */
const TWO_GAMES = JSON.stringify({
  nowPlaying: [
    { gameId: 'sl0w1', color: 'white', speed: 'correspondence', isMyTurn: false, secondsLeft: 9000, opponent: { username: 'Stockfish level 2', ai: 2 } },
    { gameId: 'sl0w2', color: 'black', speed: 'correspondence', isMyTurn: true, secondsLeft: 216_000, opponent: { username: 'bob', rating: 1600 } },
  ],
})

const PERSON = (moves: string, extra: object = {}) => full(moves, extra).replace('"aiLevel":3', '"id":"bob","name":"bob","rating":1600')

test('setup: level 6 and 5+3, then play', async ($, on) => {
  const settle = signedIn(on)
  const { calls, streams, endAll } = lichess(on, AI)
  const ui = await mount($)
  await ui.press({ key: 'play-stockfish' })
  expect(await ui.find({ key: 'setup-play' })).toBeDefined()
  await ui.press({ key: 'setup-level-6' })
  await ui.press({ key: 'setup-clock-5+3' })
  await ui.press({ key: 'setup-play' })
  expect(fields(calls.find(c => c.url.endsWith('/api/challenge/ai'))?.body)).toEqual({ level: '6', 'clock.limit': '300', 'clock.increment': '3', color: 'random' })
  await settle(() => streams('/stream/g4m3').length > 0)
  streams('/stream/g4m3')[0]!.feed.line(full())
  await settle(() => false, 1)
  expect(await ui.find({ key: 'setup-play' })).toBeUndefined()
  await ui.unmount()
  endAll()
  await settle(() => false, 1)
})

test('setup for a person: no clock under 10+0, days offered; cancel goes back', async ($, on) => {
  signedIn(on)
  lichess(on)
  const ui = await mount($)
  await ui.press({ key: 'play-human' })
  expect(await ui.find({ key: 'setup-clock-3+2' })).toBeUndefined()
  expect(await ui.find({ key: 'setup-clock-10+0' })).toBeDefined()
  expect(await ui.find({ key: 'setup-clock-14d' })).toBeDefined()
  expect(await ui.find({ key: 'setup-rated-rated' })).toBeDefined()
  await ui.press({ key: 'setup-cancel' })
  expect(await ui.find({ key: 'setup-play' })).toBeUndefined()
  await ui.unmount()
})

test('the last choices come back', async ($, on) => {
  signedIn(on, 'lip_good', { gameChoices: { ai: { kind: 'ai', level: 6, clock: '15+10', color: 'black' } } })
  lichess(on)
  const ui = await mount($)
  await ui.press({ key: 'play-stockfish' })
  const chosen = async (key: string) => JSON.stringify(await ui.find({ key })).includes('"inverse":true')
  expect(await chosen('setup-level-6')).toBe(true)
  expect(await chosen('setup-level-3')).toBe(false)
  expect(await chosen('setup-clock-15+10')).toBe(true)
  expect(await chosen('setup-color-black')).toBe(true)
  await ui.unmount()
})

test('the move list: pairs between the clocks, the newest marked; a long game behind …', async ($, on) => {
  const { curl, settle, endAll } = await stockfishGame($, on)
  const ui = await mount($)
  curl.feed.line(state('e2e4 e7e5 g1f3'))
  await settle(() => false, 1)
  expect(await textOf(ui, '2.')).toBeDefined()
  expect((await textOf(ui, 'Nf3'))?.props.inverse).toBe(true)
  expect((await textOf(ui, 'e5'))?.props.inverse).toBe(false)
  expect(await ui.find({ key: 'game-ply-3' })).toBeUndefined()
  // Knights out and back, 15 times each: 60 moves.
  curl.feed.line(state(Array(15).fill('g1f3 g8f6 f3g1 f6g8').join(' ')))
  await settle(() => false, 1)
  expect(await textOf(ui, '…')).toBeDefined()
  expect(await textOf(ui, '30.')).toBeDefined()
  expect(await textOf(ui, '23.')).toBeUndefined()
  await ui.unmount()
  endAll()
  await settle(() => false, 1)
})

test('material: a knight up shows on its line; my clock red under 30 s', async ($, on) => {
  const { curl, settle, endAll } = await stockfishGame($, on)
  const ui = await mount($)
  curl.feed.line(JSON.stringify({ type: 'gameState', moves: 'e2e4 b8c6 f1b5 a7a6 b5c6', wtime: 29_000, btime: 595_000, status: 'started' }))
  await settle(() => false, 1)
  const mine = await textOf(ui, /magnus/)
  expect(mine?.text).toContain(`magnus (1500)  ${glyphOf('n')} +3`)
  expect(mine?.text).toContain('0:29')
  expect(mine?.props.color).toBe('error')
  const theirs = await textOf(ui, /⏱.*Stockfish/)
  expect(theirs?.text).not.toContain('+')
  expect(theirs?.props.color).toBeUndefined()
  await ui.unmount()
  endAll()
  await settle(() => false, 1)
})

test('after the end: click move 3, or j and k, to see the board then', async ($, on) => {
  const { curl, settle } = await stockfishGame($, on)
  const ui = await mount($)
  curl.feed.line(state('f2f3 e7e5 g2g4 d8h4', { status: 'mate', winner: 'black' }))
  curl.feed.end()
  await settle(() => false, 1)
  const queen = glyphOf('q')
  expect((await ui.find({ key: 'sq-h4' }))?.text).toContain(queen)
  await ui.press({ key: 'game-ply-3' })
  expect((await ui.find({ key: 'sq-h4' }))?.text).not.toContain(queen)
  expect((await ui.find({ key: 'sq-d8' }))?.text).toContain(queen)
  await ui.press({ key: 'game-forward' })
  expect((await ui.find({ key: 'sq-h4' }))?.text).toContain(queen)
  await ui.unmount()
})

test('↩ against Stockfish once I have moved; never against a person', async ($, on) => {
  const { curl, settle, calls, endAll } = await stockfishGame($, on)
  const ui = await mount($)
  expect(await ui.find({ key: 'takeback' })).toBeUndefined()
  curl.feed.line(state('e2e4 e7e5'))
  await settle(() => false, 1)
  await ui.press({ key: 'takeback' })
  expect(calls.at(-1)?.url).toBe('https://lichess.org/api/board/game/g4m3/takeback/yes')
  curl.feed.line(PERSON('e2e4 e7e5'))
  await settle(() => false, 1)
  expect(await ui.find({ key: 'takeback' })).toBeUndefined()
  await ui.unmount()
  endAll()
  await settle(() => false, 1)
})

async function startSession($: Engine, on: On) {
  mock.env(on, {})
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('session.start', async (_$, e) => e)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
}

test('the games list: the one awaiting first, chosen to show it, ☰ back to the list', async ($, on) => {
  const settle = signedIn(on)
  const { streams, endAll } = lichess(on, { '/api/account/playing': { status: 200, text: TWO_GAMES } })
  await startSession($, on)
  await settle(() => false, 1)
  const ui = await mount($)
  const listed = (await ui.findAll({ type: 'Button' })).filter(b => b.key?.startsWith('game-'))
  expect(listed.map(b => b.key)).toEqual(['game-sl0w2', 'game-sl0w1'])
  expect(listed[0]?.text).toContain('👉 bob · 2d 12h')
  expect(listed[1]?.text).toContain('⏳ Stockfish level 2 · 2h 30m')
  await ui.press({ key: 'game-sl0w2' })
  await settle(() => streams('/stream/sl0w2').length > 0)
  streams('/stream/sl0w2')[0]!.feed.line(PERSON('e2e4').replace('g4m3', 'sl0w2').replace('"type":"gameFull"', '"type":"gameFull","speed":"correspondence"'))
  await settle(() => false, 1)
  // A correspondence clock, in minutes: the line gives 10 minutes.
  expect(await textOf(ui, /⏱ 10m  bob/)).toBeDefined()
  await ui.press({ key: 'games' })
  expect(await ui.find({ key: 'game-sl0w1' })).toBeDefined()
  await ui.unmount()
  endAll()
  await settle(() => false, 1)
})

test('Claude starts: the game awaiting comes before puzzles; Claude done, the pane closes beside it', async ($, on) => {
  const settle = signedIn(on)
  const closed: string[] = []
  on('ui.close', async (_$, e) => (closed.push(String(e.id)), { value: undefined }))
  on('turn.start', async (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', async () => ({ text: '' }))
  const { streams, endAll } = lichess(on, { '/api/account/playing': { status: 200, text: PLAYING } }, [{ id: 'chess-break', isShown: true, isPlaced: true }])
  await $.turn.start({ text: 'hi', turnId: 't1' })
  await settle(() => streams('/stream/cAf7Dbod').length > 0)
  streams('/stream/cAf7Dbod')[0]!.feed.line(CORRESPONDENCE_FULL)
  await settle(() => false, 1)
  const ui = await mount($)
  expect(await ui.find({ key: 'games' })).toBeDefined()
  await ui.unmount()
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  expect(closed).toEqual(['chess-break'])
  endAll()
  await settle(() => false, 1)
})

test('Claude starts with nothing awaiting: a puzzle', async ($, on) => {
  const settle = signedIn(on)
  on('turn.start', async (_$, e) => ({ turnId: e.turnId }))
  const { streams } = lichess(on, { '/api/account/playing': { status: 200, text: PLAYING.replace('"isMyTurn":true', '"isMyTurn":false') } })
  await $.turn.start({ text: 'hi', turnId: 't1' })
  await settle(() => false, 1)
  expect(streams('/stream/').length + streams('cAf7Dbod').length).toBe(0)
  const ui = await mount($)
  expect(await ui.find({ key: 'hint' })).toBeDefined()
  await ui.unmount()
})

/** The line under the prompt as the mod leaves it: its tail. */
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

test('the line under the prompt counts the games awaiting', async ($, on) => {
  const settle = signedIn(on)
  const tail = hintRow($, on)
  const both = TWO_GAMES.replace('"isMyTurn":false', '"isMyTurn":true')
  lichess(on, { '/api/account/playing': { status: 200, text: both } }, [{ id: 'chess-break', isShown: false, isPlaced: true }])
  await startSession($, on)
  await settle(() => false, 1)
  expect(await tail()).toBe('⚔ 2 games await your move')
})

test('/chess-break games: the list in words, the game awaiting on the pane', async ($, on) => {
  const settle = signedIn(on)
  const answers = { '/api/account/playing': { status: 200, text: TWO_GAMES } }
  const { streams, endAll } = lichess(on, answers)
  expect((await $.command.run(command('games'))).text).toBe('👉 bob · 2d 12h\n⏳ Stockfish level 2 · 2h 30m')
  await settle(() => streams('/stream/sl0w2').length > 0)
  expect(streams('/stream/sl0w2').length).toBe(1)
  endAll()
  await settle(() => false, 1)
  answers['/api/account/playing'] = { status: 200, text: '{"nowPlaying":[]}' }
  expect((await $.command.run(command('games'))).text).toBe('No games on at Lichess.')
})

test('the solid pawn asks for its text glyph, not the emoji', () => {
  expect(glyphOf('p')).toBe('♟︎')
  expect(glyphOf('P')).toBe('♙')
})
