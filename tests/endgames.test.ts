import { expect, test } from 'claude-code/testing'

import { legal, turnOf } from '../hooks/chess/position'
import { gameForm, readGameEvent } from '../hooks/lichess/game'
import { ENDGAMES, drillOf, drillOrder, drillSettings, recordDrill } from '../hooks/training/endgames'
import type { Game } from '../types'
import { toMove } from '../hooks/training/game'
import { AI, PANE, lichess, signedIn } from './fixtures/fake'

test('every drill is a legal position, White to move, with the game still on', () => {
  for (const e of ENDGAMES) {
    expect(turnOf(e.fen)).toBe('w')
    expect(legal(e.fen).length).toBeGreaterThan(0)
  }
})

test('the challenge carries the position, against Stockfish at its strongest', () => {
  const form = new URLSearchParams(gameForm(drillSettings(ENDGAMES[0]!)))
  expect(form.get('fen')).toBe(ENDGAMES[0]!.fen)
  expect(form.get('level')).toBe('8')
  expect(form.get('color')).toBe('white')
  expect(new URLSearchParams(gameForm({ kind: 'ai', level: 3, clock: '10+0', color: 'random' })).has('fen')).toBe(false)
})

test('a game read with its starting position; startpos is the initial one', () => {
  const full = (initialFen: string) => readGameEvent(JSON.stringify({ type: 'gameFull', id: 'g', initialFen, white: {}, black: {}, state: { type: 'gameState', moves: '' } }))
  expect(full('startpos')).not.toHaveProperty('initialFen')
  expect(full(ENDGAMES[1]!.fen)).toMatchObject({ initialFen: ENDGAMES[1]!.fen })
  // Counted from the side to move at the start.
  expect(toMove({ moves: [], initialFen: '8/8/8/4k3/8/8/8/R3K3 b - - 0 1' })).toBe('b')
  expect(toMove({ moves: ['e8d8'], initialFen: '8/8/8/4k3/8/8/8/R3K3 b - - 0 1' })).toBe('w')
  expect(toMove({ moves: ['e2e4'] })).toBe('b')
})

test('a drill from the pane: Stockfish from the position, the board on it, the setup choices kept', async ($, on) => {
  const store: Record<string, unknown> = {}
  const settle = signedIn(on, 'lip_good', store)
  const fake = lichess(on, AI)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'play-endgame' })
  expect(await ui.find({ text: /^🏆 Endgames$/ })).toBeDefined()
  await ui.press({ key: 'endgame-kr' })
  const challenge = fake.calls.find(c => c.url.endsWith('/api/challenge/ai'))
  expect(new URLSearchParams(challenge?.body).get('fen')).toBe(ENDGAMES[1]!.fen)
  expect(store.gameChoices).toBeUndefined()
  await settle(() => fake.streams('/stream/g4m3').length > 0)
  const curl = fake.streams('/stream/g4m3')[0]!
  curl.feed.line(JSON.stringify({
    type: 'gameFull', id: 'g4m3', rated: false, initialFen: ENDGAMES[1]!.fen,
    white: { id: 'magnus', name: 'magnus', rating: 1500 }, black: { aiLevel: 8 },
    clock: { initial: 900000, increment: 10000 },
    state: { type: 'gameState', moves: '', wtime: 900000, btime: 900000, status: 'started' },
  }))
  await settle(() => false, 1)
  // White's rook on a1 and king on e1, Black's king on e5: the drill's position, White to move.
  expect(JSON.stringify(await ui.find({ key: 'sq-a1' }))).toContain('♖')
  expect(JSON.stringify(await ui.find({ key: 'sq-e5' }))).toContain('♚')
  expect(await ui.find({ text: /👉 Your move/ })).toBeDefined()
  // Nothing was captured yet: the pieces the position never had are not counted as taken.
  const mine = (await ui.findAll({ type: 'Text' })).map(e => e.text).find(text => text.includes('magnus (1500)'))
  expect(mine).toMatch(/magnus \(1500\) \+5$/)
  await ui.unmount()
  fake.endAll()
  await settle(() => false, 1)
})

test('a drill’s result: a win converts it for good, a draw or loss is a try; not yet converted first', () => {
  let r = recordDrill({}, 'kr', false)
  expect(r).toEqual({ kr: 'tried' })
  r = recordDrill(r, 'kr', true)
  r = recordDrill(r, 'kr', false)
  expect(r).toEqual({ kr: 'converted' })
  expect(drillOrder({ kq: 'converted', kp: 'tried' }).map(e => e.key)).toEqual(['kr', 'kp', 'lucena', 'kq'])
  expect(drillOf({ initialFen: ENDGAMES[3]!.fen } as Game)?.key).toBe('lucena')
  expect(drillOf({} as Game)).toBeUndefined()
})

test('a drill won is kept as converted, and the list shows it last, marked', async ($, on) => {
  const store: Record<string, unknown> = {}
  const settle = signedIn(on, 'lip_good', store)
  const fake = lichess(on, AI)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'play-endgame' })
  await ui.press({ key: 'endgame-kr' })
  await settle(() => fake.streams('/stream/g4m3').length > 0)
  const curl = fake.streams('/stream/g4m3')[0]!
  const full = (status: string, extra: object = {}) => JSON.stringify({
    type: 'gameFull', id: 'g4m3', rated: false, initialFen: ENDGAMES[1]!.fen,
    white: { id: 'magnus', name: 'magnus', rating: 1500 }, black: { aiLevel: 8 },
    clock: { initial: 900000, increment: 10000 },
    state: { type: 'gameState', moves: '', wtime: 900000, btime: 900000, status, ...extra },
  })
  curl.feed.line(full('started'))
  await settle(() => false, 1)
  curl.feed.line(JSON.stringify({ type: 'gameState', moves: 'a1a7', wtime: 890000, btime: 900000, status: 'mate', winner: 'white' }))
  curl.feed.end()
  await settle(() => false, 1)
  expect(store.drills).toEqual({ kr: 'converted' })
  await ui.press({ key: 'puzzles-top' })
  await ui.press({ key: 'play-endgame' })
  const drills = (await ui.findAll({ type: 'Button' })).map(b => (b as unknown as { key?: string; text: string })).filter(b => b.key?.startsWith('endgame-'))
  expect(drills.at(-1)).toMatchObject({ key: 'endgame-kr', text: expect.stringMatching(/^✅ King and rook against king$/) })
  expect(drills[0]?.text).toMatch(/^· /)
  await ui.unmount()
  fake.endAll()
  await settle(() => false, 1)
})

test('a drill that ended while the stream was down is kept when the whole game comes back', async ($, on) => {
  const store: Record<string, unknown> = {}
  const settle = signedIn(on, 'lip_good', store)
  const fake = lichess(on, AI)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'play-endgame' })
  await ui.press({ key: 'endgame-kq' })
  await settle(() => fake.streams('/stream/g4m3').length > 0)
  const curl = fake.streams('/stream/g4m3')[0]!
  const full = (state: object) => JSON.stringify({
    type: 'gameFull', id: 'g4m3', rated: false, initialFen: ENDGAMES[0]!.fen,
    white: { id: 'magnus', name: 'magnus', rating: 1500 }, black: { aiLevel: 8 },
    clock: { initial: 900000, increment: 10000 },
    state: { type: 'gameState', wtime: 900000, btime: 900000, ...state },
  })
  curl.feed.line(full({ moves: '', status: 'started' }))
  await settle(() => false, 1)
  // The game's first line again, as after a reconnect, and over: drawn by stalemate.
  curl.feed.line(full({ moves: 'd1d7', status: 'stalemate' }))
  curl.feed.end()
  await settle(() => false, 1)
  expect(store.drills).toEqual({ kq: 'tried' })
  await ui.unmount()
  fake.endAll()
  await settle(() => false, 1)
})
