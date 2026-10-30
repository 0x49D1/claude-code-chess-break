import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

import { command, fields, full, lichess, signedIn, state, stockfishGame } from './fixtures/fake'
import { CORRESPONDENCE_FULL, PLAYING } from './fixtures/lichess'

const MINUTES_5 = 300_000

/** The fixture's game, waiting for the opponent instead of the person. */
const PLAYING_THEIRS = PLAYING.replace('"isMyTurn":true', '"isMyTurn":false')

/** A live game against a person, as /api/account/playing lists it. */
const PLAYING_PERSON = '{"nowPlaying":[{"gameId":"p3rs0n","color":"white","speed":"rapid","isMyTurn":true,"opponent":{"username":"bob","rating":1600}}]}'

const toasts = (on: On) => {
  const said: string[] = []
  on('ui.toast', async (_$, e) => (said.push(e.text), { value: undefined }))
  return said
}

const sounds = (on: On) => {
  const played: unknown[] = []
  on('audio.play', async (_$, e) => (played.push(e), { value: undefined }))
  return played
}

async function startSession($: Engine, on: On) {
  mock.env(on, {})
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('session.start', async (_$, e) => e)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
}

test('the games list: read at the start, every five minutes, a toast once; nothing read signed out', async ($, on) => {
  const settle = signedIn(on)
  const said = toasts(on)
  const answers = { '/api/account/playing': { status: 200, text: PLAYING_THEIRS } }
  const { calls } = lichess(on, answers)
  const reads = () => calls.filter(c => c.url.endsWith('/api/account/playing')).length
  await startSession($, on)
  await settle(() => reads() > 0)
  expect(reads()).toBe(1)
  expect(said).toEqual([])

  // Overnight, the opponent moved.
  answers['/api/account/playing'] = { status: 200, text: PLAYING }
  await settle(() => false, MINUTES_5, 1)
  expect(reads()).toBe(2)
  expect(said).toEqual(['♞ Your move against Stockfish level 1.'])
  await settle(() => false, MINUTES_5, 1)
  expect(reads()).toBe(3)
  expect(said.length).toBe(1)

  await $.command.run(command('logout'))
  await settle(() => false, MINUTES_5, 2)
  expect(reads()).toBe(3)
})

test('days per move: a seek is posted and not waited for; Stockfish is followed', async ($, on) => {
  const stored: Record<string, unknown> = {}
  const settle = signedIn(on, 'lip_good', stored)
  const { calls, streams, spawned, endAll } = lichess(on, { '/api/challenge/ai': { status: 201, text: '{"id":"cAf7Dbod"}' }, '/api/board/seek': { status: 200, text: '{"id":"kFQ8KsVV"}' } })

  expect((await $.command.run(command('play human 3d'))).text).toBe('Seek posted. The game joins your games list once someone accepts it.')
  const seek = calls.find(c => c.url.endsWith('/api/board/seek'))!
  expect(seek.method).toBe('POST')
  expect(fields(seek.body)).toEqual({ rated: 'false', days: '3', variant: 'standard' })
  expect(spawned.length).toBe(0)

  await $.command.run(command('play stockfish 2 1d'))
  expect(fields(calls.find(c => c.url.endsWith('/api/challenge/ai'))?.body)).toEqual({ level: '2', days: '1', color: 'random' })
  await settle(() => streams('/stream/cAf7Dbod').length > 0)
  expect(streams('/stream/cAf7Dbod').length).toBe(1)
  expect(stored.gameChoices).toEqual({
    ai: { kind: 'ai', level: 2, clock: '1d', color: 'random' },
    seek: { kind: 'seek', clock: '3d', rated: false },
  })
  endAll()
  await settle(() => false, 1)
})

test('a second live game is refused; a correspondence one is not, and leaves the live game shown', async ($, on) => {
  const { calls, spawned, settle, endAll } = await stockfishGame($, on)
  const challenges = () => calls.filter(c => c.url.endsWith('/api/challenge/ai')).length
  expect((await $.command.run(command('play stockfish 5+3'))).text).toBe('Finish the live game first.')
  expect(challenges()).toBe(1)
  await $.command.run(command('play stockfish 1d'))
  expect(challenges()).toBe(2)
  await settle(() => false, 1)
  // Still the one stream: the live game's.
  expect(spawned.map(s => [String(s.argv.at(-1)), s.killed.aborted])).toEqual([['https://lichess.org/api/board/game/stream/g4m3', false]])
  endAll()
  await settle(() => false, 1)
})

test('takeback: asked of Stockfish', async ($, on) => {
  const game = await stockfishGame($, on)
  expect((await $.command.run(command('takeback'))).text).toBe('Takeback asked.')
  expect(game.calls.at(-1)?.url).toBe('https://lichess.org/api/board/game/g4m3/takeback/yes')
  game.endAll()
  await game.settle(() => false, 1)
})

test('against a person: no takeback, and their requests are declined once each', async ($, on) => {
  const settle = signedIn(on)
  const { calls, streams, endAll } = lichess(on, { '/api/account/playing': { status: 200, text: PLAYING_PERSON } })
  await startSession($, on)
  await settle(() => streams('/stream/p3rs0n').length > 0)
  const curl = streams('/stream/p3rs0n')[0]!
  curl.feed.line(full('e2e4 e7e5').replace('g4m3', 'p3rs0n').replace('"aiLevel":3', '"id":"bob","name":"bob","rating":1600'))
  await settle(() => false, 1)
  expect((await $.command.run(command('takeback'))).text).toBe('Takebacks are only against Stockfish.')
  const declines = () => calls.filter(c => c.url.endsWith('/takeback/no')).length
  curl.feed.line(state('e2e4 e7e5', { btakeback: true }))
  curl.feed.line(state('e2e4 e7e5', { btakeback: true }))
  await settle(() => false, 1)
  expect(declines()).toBe(1)
  curl.feed.line(state('e2e4 e7e5'))
  curl.feed.line(state('e2e4 e7e5', { btakeback: true }))
  await settle(() => false, 1)
  expect(declines()).toBe(2)
  expect(calls.some(c => c.url.endsWith('/takeback/yes'))).toBe(false)
  endAll()
  await settle(() => false, 1)
})

test('the opponent’s move is told when the pane is hidden, with a sound only with gameSound', async ($, on) => {
  const said = toasts(on)
  const played = sounds(on)
  const { curl, settle, endAll } = await stockfishGame($, on, [{ id: 'chess-break', isShown: false, isPlaced: true }])
  curl.feed.line(state('e2e4'))
  curl.feed.line(state('e2e4 g8f6'))
  await settle(() => false, 1)
  expect(said).toEqual(['♞ Stockfish level 3 played Nf6'])
  expect(played).toEqual([])
  endAll()
  await settle(() => false, 1)
})

test('with gameSound, the toast comes with a sound', { options: { gameSound: true } }, async ($, on) => {
  toasts(on)
  const played = sounds(on)
  const { curl, settle, endAll } = await stockfishGame($, on, [{ id: 'chess-break', isShown: false, isPlaced: true }])
  curl.feed.line(state('e2e4'))
  curl.feed.line(state('e2e4 g8f6'))
  await settle(() => false, 1)
  expect(played.length).toBe(1)
  endAll()
  await settle(() => false, 1)
})

test('nothing is told while the pane is shown', async ($, on) => {
  const said = toasts(on)
  const { curl, settle, endAll } = await stockfishGame($, on, [{ id: 'chess-break', isShown: true, isPlaced: true }])
  curl.feed.line(state('e2e4 g8f6'))
  await settle(() => false, 1)
  expect(said).toEqual([])
  endAll()
  await settle(() => false, 1)
})

test('no beep at low time without game sounds', async ($, on) => {
  toasts(on)
  const played = sounds(on)
  const { curl, settle, endAll } = await stockfishGame($, on)
  curl.feed.line(JSON.stringify({ type: 'gameState', moves: 'e2e4 e7e5', wtime: 31_000, btime: 595_000, status: 'started' }))
  await settle(() => false, 1000, 6)
  expect(played.length).toBe(0)
  endAll()
  await settle(() => false, 1)
})

test('with game sounds, one beep when the person’s clock drops under 30 seconds in a live game', { options: { gameSound: true } }, async ($, on) => {
  toasts(on)
  const played = sounds(on)
  const { curl, settle, endAll } = await stockfishGame($, on)
  curl.feed.line(JSON.stringify({ type: 'gameState', moves: 'e2e4 e7e5', wtime: 31_000, btime: 595_000, status: 'started' }))
  await settle(() => false, 1000, 1)
  // The opponent's reply has its own sound; the beep comes on top of it, once.
  const before = played.length
  await settle(() => false, 1000, 5)
  expect(played.length).toBe(before + 1)
  expect(played.at(-1)).toMatchObject({ clip: { mime: 'audio/wav' } })
  await settle(() => false, 1000, 5)
  expect(played.length).toBe(before + 1)
  endAll()
  await settle(() => false, 1)
})

test('no beep in a correspondence game', { options: { gameSound: true } }, async ($, on) => {
  toasts(on)
  const played = sounds(on)
  const settle = signedIn(on)
  const { streams, endAll } = lichess(on, { '/api/challenge/ai': { status: 201, text: '{"id":"cAf7Dbod"}' } })
  await $.command.run(command('play stockfish 1 1d'))
  await settle(() => streams('/stream/cAf7Dbod').length > 0)
  streams('/stream/cAf7Dbod')[0]!.feed.line(CORRESPONDENCE_FULL.replace('86396000', '20000'))
  await settle(() => false, 1000, 5)
  expect(played.length).toBe(0)
  endAll()
  await settle(() => false, 1)
})


