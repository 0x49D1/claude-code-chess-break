import { expect, mock, test } from 'claude-code/testing'
import type { On, RenderElement } from 'claude-code'
import type { Engine } from 'claude-code/testing'

import { AI, PANE, command, fields, full, lichess, signedIn, state, stockfishGame } from './fixtures/fake'

test('Stockfish: the challenge, the stream through curl, moves from the prompt, resign twice', async ($, on) => {
  const settle = signedIn(on)
  const lichessFake = lichess(on, AI)
  const { calls, spawned, streams } = lichessFake

  expect((await $.command.run(command('play stockfish 5 5+3 white'))).text).toBe('Game against Stockfish level 5 (5+3) in the pane.')
  const challenge = calls.find(c => c.url.endsWith('/api/challenge/ai'))!
  expect(challenge).toMatchObject({ method: 'POST', auth: 'Bearer lip_good' })
  expect(fields(challenge.body)).toEqual({ level: '5', 'clock.limit': '300', 'clock.increment': '3', color: 'white' })

  await settle(() => streams('/api/board/game/stream/g4m3').length > 0)
  const curl = streams('/api/board/game/stream/g4m3')[0]!
  // The token goes on stdin, never into the arguments a process list shows.
  expect(curl.argv[0]).toBe('curl')
  expect(curl.argv.join(' ')).not.toContain('lip_good')
  expect(curl.input).toContain('header = "Authorization: Bearer lip_good"')

  // A line split across two pieces still reads as one.
  curl.feed.raw(full().slice(0, 40))
  curl.feed.raw(`${full().slice(40)}\n`)
  await settle(() => false, 1)
  expect((await $.command.run(command('e4'))).text).toBe('Your opponent’s move')
  expect(calls.at(-1)).toMatchObject({ method: 'POST', url: 'https://lichess.org/api/board/game/g4m3/move/e2e4' })
  expect((await $.command.run(command('d4'))).text).toBe('It’s your opponent’s move.')

  curl.feed.line(state('e2e4 e7e5'))
  await settle(() => false, 1)
  expect((await $.command.run(command('abort'))).text).toBe('Both sides have moved: the game can only be resigned now.')
  expect((await $.command.run(command('resign'))).text).toBe('Press resign again to resign.')
  expect(calls.some(c => c.url.endsWith('/resign'))).toBe(false)
  expect((await $.command.run(command('resign'))).text).toBe('Resigned.')
  expect(calls.at(-1)?.url).toBe('https://lichess.org/api/board/game/g4m3/resign')

  curl.feed.line(state('e2e4 e7e5', { status: 'resign', winner: 'black' }))
  curl.feed.end()
  await settle(() => false, 1)
  expect((await $.command.run(command('resign'))).text).toMatch(/No game under way/)
  expect(spawned.length).toBe(1)
})

test('a move Lichess refuses goes back off the board', async ($, on) => {
  const settle = signedIn(on)
  const { streams, endAll } = lichess(on, { ...AI, '/move/e2e4': { status: 400, text: '{"error":"Not your turn, or game already over"}' } })
  await $.command.run(command('play stockfish'))
  await settle(() => streams('/stream/g4m3').length > 0)
  streams('/stream/g4m3')[0]!.feed.line(full())
  await settle(() => false, 1)
  expect((await $.command.run(command('e4'))).text).toBe('Lichess refused: Not your turn, or game already over.')
  // Back to the start: e4 is legal again, and refused again.
  expect((await $.command.run(command('e4'))).text).toMatch(/Lichess refused/)
  endAll()
  await settle(() => false, 1)
})

test('a dropped stream is reopened, after a second, then two', async ($, on) => {
  const settle = signedIn(on)
  const { streams } = lichess(on, AI)
  await $.command.run(command('play stockfish'))
  await settle(() => streams('/stream/g4m3').length > 0)
  streams('/stream/g4m3')[0]!.feed.line(full())
  streams('/stream/g4m3')[0]!.feed.end(200)
  await settle(() => streams('/stream/g4m3').length > 1, 100)
  expect(streams('/stream/g4m3').length).toBe(2)
  streams('/stream/g4m3')[1]!.feed.end(502)
  await settle(() => streams('/stream/g4m3').length > 2, 100)
  expect(streams('/stream/g4m3').length).toBe(3)
  // The game over, the stream ends for good.
  streams('/stream/g4m3')[2]!.feed.line(full('e2e4 e7e5', { status: 'aborted' }))
  streams('/stream/g4m3')[2]!.feed.end(200)
  await settle(() => false, 1000)
  expect(streams('/stream/g4m3').length).toBe(3)
})

test('a person: the seek waits on the event stream, which announces the game', async ($, on) => {
  const settle = signedIn(on)
  const { streams, endAll } = lichess(on)
  expect((await $.command.run(command('play human 3+2'))).text).toMatch(/rapid and classical only: 10\+0, 10\+5/)
  expect((await $.command.run(command('play human 15+10 rated'))).text).toMatch(/Looking for an opponent \(15\+10, rated\)/)
  await settle(() => streams('/api/board/seek').length > 0 && streams('/api/stream/event').length > 0)
  const seek = streams('/api/board/seek')[0]!
  expect(seek.input).toContain('data = "rated=true&time=15&increment=10&variant=standard"')

  streams('/api/stream/event')[0]!.feed.line('{"type":"gameStart","game":{"gameId":"p3rs0n"}}')
  await settle(() => streams('/stream/p3rs0n').length > 0)
  expect(streams('/stream/p3rs0n').length).toBe(1)
  expect(seek.killed.aborted).toBe(true)
  expect(streams('/api/stream/event')[0]!.killed.aborted).toBe(true)
  endAll()
  await settle(() => false, 1)
})

test('a seek cancelled from the pane is withdrawn', async ($, on) => {
  const settle = signedIn(on)
  const { streams } = lichess(on)
  await $.command.run(command('play human'))
  await settle(() => streams('/api/board/seek').length > 0)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ text: /Looking for an opponent \(10\+0, casual\)/ })).toBeDefined()
  await ui.press({ key: 'cancel-seek' })
  await settle(() => streams('/api/board/seek')[0]!.killed.aborted)
  expect(streams('/api/board/seek')[0]!.killed.aborted).toBe(true)
  expect(await ui.find({ text: /Looking for an opponent/ })).toBeUndefined()
  await ui.unmount()
})

test('what stops a game before it starts: no sign-in, wrong arguments', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  const fake = lichess(on, AI)
  expect((await $.command.run(command('play stockfish'))).text).toBe('Games need a Lichess account: /chess-break login.')
  expect((await $.command.run(command('play stockfish 9'))).text).toBe('Stockfish levels go from 1 to 8.')
  expect((await $.command.run(command('play'))).text).toMatch(/play stockfish \[1-8\]/)
  expect(fake.calls.length).toBe(0)
})

test('a token from the puzzle-only sign-in: sign in again', async ($, on) => {
  signedIn(on, 'lip_old')
  lichess(on, { '/api/challenge/ai': { status: 403, text: '{"error":"Missing scope"}' } })
  expect((await $.command.run(command('play stockfish'))).text).toMatch(/sign in again so that the sign-in covers games/)
})

test('no curl: nothing goes to Lichess', async ($, on) => {
  signedIn(on)
  const fake = lichess(on, AI)
  fake.noCurl()
  expect((await $.command.run(command('play stockfish'))).text).toBe('Games need curl, which was not found. Puzzles work without it.')
  expect(fake.calls.length).toBe(0)
})

test('draws: offered, accepted, declined; abort before the second move', async ($, on) => {
  const { calls, curl, settle, endAll } = await stockfishGame($, on)
  expect((await $.command.run(command('draw'))).text).toBe('Draw offered.')
  expect(calls.at(-1)?.url).toBe('https://lichess.org/api/board/game/g4m3/draw/yes')
  curl.feed.line(state('e2e4', { bdraw: true }))
  await settle(() => false, 1)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ text: /🤝 Your opponent offers a draw\./ })).toBeDefined()
  expect((await $.command.run(command('draw'))).text).toBe('Draw accepted.')
  expect((await $.command.run(command('draw no'))).text).toBe('Draw declined.')
  expect(calls.at(-1)?.url).toBe('https://lichess.org/api/board/game/g4m3/draw/no')
  await ui.press({ key: 'abort' })
  expect(calls.at(-1)?.url).toBe('https://lichess.org/api/board/game/g4m3/abort')
  expect((await $.command.run(command('abort'))).text).toBe('Game aborted.')
  await ui.unmount()
  endAll()
  await settle(() => false, 1)
})

test('Lichess asks to slow down: the stream waits a minute', async ($, on) => {
  const { curl, streams, settle } = await stockfishGame($, on)
  curl.feed.end(429)
  await settle(() => false, 1000, 50)
  expect(streams('/stream/g4m3').length).toBe(1)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ text: /Lichess asks to slow down: wait a minute\./ })).toBeDefined()
  await ui.unmount()
  await settle(() => streams('/stream/g4m3').length > 1, 1000, 15)
  expect(streams('/stream/g4m3').length).toBe(2)
  streams('/stream/g4m3')[1]!.feed.line(full('', { status: 'aborted' }))
  streams('/stream/g4m3')[1]!.feed.end()
  await settle(() => false, 1)
})

test('the pane: clocks run for the side to move, then the end with its result and actions', async ($, on) => {
  const { curl, settle, calls } = await stockfishGame($, on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ text: /⚔ Stockfish level 3  ·  casual  ·  10\+0/ })).toBeDefined()
  expect(await ui.find({ text: /▶ ⏱ 10:00  magnus \(1500\)/ })).toBeDefined()
  expect(await ui.find({ text: /👉 Your move/ })).toBeDefined()
  // Clicks play: the knight, then its square.
  await ui.press({ key: 'sq-g1' })
  await ui.press({ key: 'sq-f3' })
  expect(calls.at(-1)?.url).toBe('https://lichess.org/api/board/game/g4m3/move/g1f3')
  curl.feed.line(state('g1f3 d7d5'))
  await settle(() => false, 1)
  await settle(() => false, 1000, 5)
  expect(await ui.find({ text: /▶ ⏱ 9:4\d  magnus/ })).toBeDefined()
  expect(await ui.find({ key: 'abort' })).toBeUndefined()

  curl.feed.line(state('g1f3 d7d5', { status: 'outoftime', winner: 'white' }))
  curl.feed.end()
  await settle(() => false, 1)
  expect(await ui.find({ text: /🏁 You won on time\./ })).toBeDefined()
  expect(await ui.find({ key: 'play-again' })).toBeDefined()
  expect(await ui.find({ text: /Lichess ↗/ })).toBeDefined()
  await ui.press({ key: 'puzzles' })
  expect(await ui.find({ text: /🏁/ })).toBeUndefined()
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

test('the line under the prompt shows the game; Claude done, the pane stays', async ($, on) => {
  const tail = hintRow($, on)
  const toasts: string[] = []
  const closed: string[] = []
  on('ui.toast', async (_$, e) => (toasts.push(e.text), { value: undefined }))
  on('ui.close', async (_$, e) => (closed.push(String(e.id)), { value: undefined }))
  on('turn.complete', async () => ({ text: '' }))
  // The pane is placed but hidden: the line under the prompt keeps the game.
  const { settle, endAll } = await stockfishGame($, on, [{ id: 'chess-break', isShown: false, isPlaced: true }])
  expect(await tail()).toBe('⚔ Stockfish level 3 · ⏱ 10:00 – 10:00 · Your move · /chess-break <move> or open')
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  expect(toasts).toEqual(['Claude is done. Your game goes on.'])
  expect(closed).toEqual([])
  endAll()
  await settle(() => false, 1)
})

test('a new session picks up the game still on at Lichess', async ($, on) => {
  const settle = signedIn(on)
  mock.env(on, {})
  const { streams, endAll } = lichess(on, { '/api/account/playing': { status: 200, text: '{"nowPlaying":[{"gameId":"g4m3"}]}' } })
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('session.start', async (_$, e) => e)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await settle(() => streams('/stream/g4m3').length > 0)
  streams('/stream/g4m3')[0]!.feed.line(full('e2e4 e7e5'))
  await settle(() => false, 1)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ text: /⚔ Stockfish level 3  ·  casual$/ })).toBeDefined()
  expect(JSON.stringify(await ui.find({ key: 'sq-e5' }))).toContain('♟')
  await ui.unmount()
  endAll()
  await settle(() => false, 1)
})

test('a game from the puzzle view: the sidebar starts one', async ($, on) => {
  const settle = signedIn(on)
  const { calls, streams, endAll } = lichess(on, AI)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'play-stockfish' })
  await ui.press({ key: 'setup-play' })
  expect(fields(calls.find(c => c.url.endsWith('/api/challenge/ai'))?.body)).toEqual({ level: '3', 'clock.limit': '600', 'clock.increment': '0', color: 'random' })
  await settle(() => streams('/stream/g4m3').length > 0)
  streams('/stream/g4m3')[0]!.feed.line(full())
  await settle(() => false, 1)
  expect(await ui.find({ text: /👉 Your move/ })).toBeDefined()
  await ui.unmount()
  endAll()
  await settle(() => false, 1)
})
