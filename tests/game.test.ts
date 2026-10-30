import { describe, expect, test } from 'claude-code/testing'

import { SCOPES, TOKEN_PAGE } from '../hooks/lichess/auth'
import { gameForm, readGameEvent, readPlaying } from '../hooks/lichess/game'
import type { GameEvent } from '../hooks/lichess/game'
import type { GameSettings, GameSummary } from '../types'
import { AFTER_TAKEBACK, CORRESPONDENCE_FULL, PLAYING, PLAYING_NONE } from './fixtures/lichess'
import { applyState, clickGame, clockLeft, endingOf, awaiting, formatClock, fromFull, gameAtPly, newlyMine, isCorrespondence, isMyTurn, material, moveRows, sanMoves, outcomeOf, playGame, readSettings, rollBack } from '../hooks/training/game'

/** A form's fields, as a plain object. */
function fields(form: string | undefined) {
  const out: Record<string, string> = {}
  new URLSearchParams(form).forEach((value, key) => (out[key] = value))
  return out
}


// Lines as Lichess's Board API streams them.
const FULL = JSON.stringify({
  type: 'gameFull', id: 'g4m3', rated: false,
  white: { id: 'magnus', name: 'magnus', rating: 1500 },
  black: { aiLevel: 3 },
  clock: { initial: 600000, increment: 0 },
  state: { type: 'gameState', moves: '', wtime: 600000, btime: 600000, winc: 0, binc: 0, status: 'started' },
})
const state = (moves: string, extra: object = {}) =>
  JSON.stringify({ type: 'gameState', moves, wtime: 590000, btime: 595000, winc: 0, binc: 0, status: 'started', ...extra })

const full = () => readGameEvent(FULL) as Extract<GameEvent, { type: 'full' }>
const stateOf = (line: string) => (readGameEvent(line) as Extract<GameEvent, { type: 'state' }>).state

describe('the Board API, read', () => {
  test('a game stream: the first line, then states', () => {
    expect(full()).toMatchObject({ type: 'full', id: 'g4m3', isRated: false, white: { name: 'magnus', rating: 1500 }, black: { aiLevel: 3 } })
    expect(stateOf(state('e2e4 e7e5', { bdraw: true }))).toEqual({ moves: ['e2e4', 'e7e5'], wtime: 590000, btime: 595000, status: 'started', winner: undefined, drawOffer: 'b' })
    expect(stateOf(state('f2f3 e7e5 g2g4 d8h4', { status: 'mate', winner: 'black' }))).toMatchObject({ status: 'mate', winner: 'b' })
  })

  test('the event stream announces a game; the rest is ignored', () => {
    expect(readGameEvent('{"type":"gameStart","game":{"gameId":"abcd1234","fullId":"abcd1234wxyz"}}')).toEqual({ type: 'start', gameId: 'abcd1234' })
    for (const line of ['', '{"type":"chatLine","text":"hi"}', '{"type":"opponentGone","gone":true}', '{"error":"Missing scope"}', 'not json']) {
      expect(readGameEvent(line)).toBeUndefined()
    }
  })

  test('the forms Lichess expects', () => {
    expect(fields(gameForm({ kind: 'ai', level: 5, clock: '5+3', color: 'black' }))).toEqual({ level: '5', 'clock.limit': '300', 'clock.increment': '3', color: 'black' })
    expect(fields(gameForm({ kind: 'seek', clock: '15+10', rated: true }))).toEqual({ rated: 'true', time: '15', increment: '10', variant: 'standard' })
    expect(fields(gameForm({ kind: 'ai', level: 4, clock: '3d', color: 'white' }))).toEqual({ level: '4', days: '3', color: 'white' })
    expect(fields(gameForm({ kind: 'seek', clock: '14d', rated: false }))).toEqual({ rated: 'false', days: '14', variant: 'standard' })
  })

  test('sign-in asks for games too', () => {
    expect(SCOPES).toContain('board:play')
    expect(TOKEN_PAGE).toContain('scopes[]=board:play')
  })
})

describe('a game, step by step', () => {
  test('the side comes from the account; the opponent moves; my move waits for Lichess', () => {
    let g = fromFull(full(), 'Magnus', undefined, 1000)
    expect(g.side).toBe('w')
    expect(isMyTurn(g)).toBe(true)
    const sent = playGame(g, 'e4')
    expect(sent.uci).toBe('e2e4')
    g = sent.game
    expect(g.pending).toBe('e2e4')
    expect(isMyTurn(g)).toBe(false)
    expect(playGame(g, 'd4').note).toEqual({ kind: 'notYourTurn' })
    // Lichess confirms it, then Black answers.
    g = applyState(g, stateOf(state('e2e4')), 2000)
    expect(g.pending).toBeUndefined()
    g = applyState(g, stateOf(state('e2e4 e7e5')), 3000)
    expect(g.lastMove).toBe('e7e5')
    expect(isMyTurn(g)).toBe(true)
    expect(playGame(g, 'Ke3').note).toEqual({ kind: 'illegal', text: 'Ke3' })
  })

  test('a refused move goes back to Lichess’s position', () => {
    const g = applyState(fromFull(full(), 'magnus', undefined, 0), stateOf(state('e2e4 e7e5')), 0)
    const sent = playGame(g, 'Nf3').game
    expect(sent.fen).not.toBe(g.fen)
    expect(rollBack(sent).fen).toBe(g.fen)
    expect(rollBack(sent).lastMove).toBe('e7e5')
  })

  test('clicks: a piece, then its square; a pawn to the last rank asks first', () => {
    const g = fromFull(full(), 'magnus', undefined, 0)
    const selected = clickGame(g, 'g1').game
    expect(selected.selected).toBe('g1')
    expect(clickGame(selected, 'f3').uci).toBe('g1f3')
    const promoting = applyState(g, stateOf(state('a2a4 h7h5 a4a5 h5h4 a5a6 h4h3 a6b7 h3g2')), 0)
    expect(clickGame(clickGame(promoting, 'b7').game, 'a8').game.promoting).toBe('b7a8')
  })

  test('the clock of the side to move runs, from the second move on', () => {
    let g = fromFull(full(), 'magnus', undefined, 0)
    g = applyState(g, stateOf(state('e2e4')), 1000)
    expect(clockLeft({ ...g, now: 6000 })).toEqual({ white: 590000, black: 595000 })
    g = applyState(g, stateOf(state('e2e4 e7e5')), 1000)
    expect(clockLeft({ ...g, now: 6000 })).toEqual({ white: 585000, black: 595000 })
    expect(formatClock(585000)).toBe('9:45')
    expect(formatClock(7340)).toBe('0:07.3')
  })

  test('a correspondence clock reads in days, hours and minutes', () => {
    const minute = 60_000
    expect(formatClock((2 * 24 + 12) * 60 * minute, true)).toBe('2d 12h')
    expect(formatClock((5 * 60 + 3) * minute, true)).toBe('5h 03m')
    expect(formatClock(42 * minute + 5000, true)).toBe('42m')
    expect(formatClock(4 * minute + 5000)).toBe('4:05')
    expect(formatClock(30 * minute)).toBe('30:00')
  })

  test('the end: a draw offer, mate, and who won', () => {
    let g = fromFull(full(), 'magnus', undefined, 0)
    expect(applyState(g, stateOf(state('e2e4', { bdraw: true })), 0).drawOffer).toBe('b')
    g = applyState(g, stateOf(state('f2f3 e7e5 g2g4 d8h4', { status: 'mate', winner: 'black' })), 0)
    expect(isMyTurn(g)).toBe(false)
    expect(endingOf(g.status)).toBe('mate')
    expect(outcomeOf(g)).toBe('loss')
    expect(clockLeft({ ...g, now: 99999 })).toEqual({ white: 590000, black: 595000 })
  })
})

describe('/chess-break play …', () => {
  test('defaults, then every argument', () => {
    expect(readSettings(['stockfish'])).toEqual({ kind: 'ai', level: 3, clock: '10+0', color: 'random' })
    expect(readSettings(['stockfish', '5', '5+3', 'black'])).toEqual({ kind: 'ai', level: 5, clock: '5+3', color: 'black' })
    expect(readSettings(['human'])).toEqual({ kind: 'seek', clock: '10+0', rated: false })
    expect(readSettings(['Human', '15+10', 'rated'])).toEqual({ kind: 'seek', clock: '15+10', rated: true })
  })

  test('days per move', () => {
    const ai = readSettings(['stockfish', '4', '3d'])
    expect(ai).toEqual({ kind: 'ai', level: 4, clock: '3d', color: 'random' })
    expect(readSettings(['human', '3d'])).toEqual({ kind: 'seek', clock: '3d', rated: false })
    expect(isCorrespondence(ai as GameSettings)).toBe(true)
    expect(isCorrespondence({ kind: 'seek', clock: '10+0', rated: false })).toBe(false)
  })

  test('what is refused', () => {
    expect(readSettings(['stockfish', '9'])).toBe('level')
    expect(readSettings(['stockfish', '1+0'])).toBe('aiClock')
    expect(readSettings(['human', '3+2'])).toBe('seekClock')
    expect(readSettings(['stockfish', '9d'])).toBe('aiClock')
    expect(readSettings(['human', '9d'])).toBe('seekClock')
    expect(readSettings([])).toBe('usage')
    expect(readSettings(['chess960'])).toBe('usage')
  })
})

describe('the move list, the replay and the material', () => {
  const played = (moves: string) => applyState(fromFull(full(), 'magnus', undefined, 0), stateOf(state(moves)), 0)

  test('a short game: one pair a row', () => {
    const sans = sanMoves(played('e2e4 e7e5 g1f3'))
    expect(sans).toEqual(['e4', 'e5', 'Nf3'])
    expect(moveRows(sans)).toEqual({ isCut: false, rows: [{ number: 1, ply: 0, sans: ['e4', 'e5'] }, { number: 2, ply: 2, sans: ['Nf3'] }] })
  })

  test('a long game: the oldest moves go behind …', () => {
    const sans = Array.from({ length: 60 }, (_, i) => `m${i}`)
    const { isCut, rows } = moveRows(sans)
    expect(isCut).toBe(true)
    expect(rows.length).toBe(7)
    expect(rows[0]).toEqual({ number: 24, ply: 46, sans: ['m46', 'm47'] })
    expect(rows[6]).toEqual({ number: 30, ply: 58, sans: ['m58', 'm59'] })
  })

  test('the board after any move', () => {
    const g = played('e2e4 e7e5 g1f3 b8c6')
    expect(gameAtPly(g, 3).fen).toBe(played('e2e4 e7e5 g1f3').fen)
    expect(gameAtPly(g, 3).lastMove).toBe('g1f3')
    expect(gameAtPly(g, 0).fen).toBe(fromFull(full(), 'magnus', undefined, 0).fen)
    expect(gameAtPly(g, 0).lastMove).toBeUndefined()
  })

  test('captures and the lead', () => {
    expect(material('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toEqual({ w: { captured: [], lead: 0 }, b: { captured: [], lead: 0 } })
    expect(material('r1bqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toEqual({ w: { captured: ['n'], lead: 3 }, b: { captured: [], lead: 0 } })
    // White promoted a pawn to a second queen: no count goes below zero.
    const promoted = material('rnbqkbnQ/ppppppp1/8/8/8/8/1PPPPPPP/RNBQKBNR b KQq - 0 1')
    expect(promoted.w).toEqual({ captured: ['r', 'p'], lead: 14 })
    expect(promoted.b).toEqual({ captured: ['p'], lead: 0 })
  })
})

describe('the account\u2019s games, as Lichess answered them', () => {
  test('the list of games on', () => {
    expect(readPlaying(PLAYING)).toEqual([{
      id: 'cAf7Dbod', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', side: 'w',
      opponent: { aiLevel: 1 }, isMyTurn: true, secondsLeft: 86392, isCorrespondence: true, isRated: false,
    }])
    expect(readPlaying(PLAYING_NONE)).toEqual([])
  })

  test('a correspondence stream: clocks in ms; a takeback empties the moves', () => {
    const g = fromFull(readGameEvent(CORRESPONDENCE_FULL) as Extract<GameEvent, { type: 'full' }>, 'magnus', undefined, 0)
    expect(g.moves).toEqual(['e2e4', 'e7e5'])
    expect(formatClock(clockLeft(g).white, true)).toBe('23h 59m')
    expect(applyState(g, stateOf(AFTER_TAKEBACK), 0).moves).toEqual([])
  })

  test('a takeback offer is read', () => {
    expect(stateOf(state('e2e4 e7e5', { btakeback: true })).takebackOffer).toBe('b')
    expect(stateOf(state('e2e4')).takebackOffer).toBeUndefined()
  })

  const game = (id: string, isMyTurn: boolean, secondsLeft?: number): GameSummary =>
    ({ id, fen: '', side: 'w', opponent: {}, isMyTurn, secondsLeft, isCorrespondence: true, isRated: false })

  test('the games awaiting, the least time left first', () => {
    expect(awaiting([game('a', true, 9000), game('b', false, 10), game('c', true, 300), game('d', true)]).map(g => g.id)).toEqual(['c', 'a', 'd'])
  })

  test('only games newly awaiting are told', () => {
    const before = [game('a', true), game('b', false)]
    expect(newlyMine(before, [game('a', true), game('b', true), game('c', true), game('d', false)]).map(g => g.id)).toEqual(['b', 'c'])
    expect(newlyMine(before, before)).toEqual([])
  })
})
