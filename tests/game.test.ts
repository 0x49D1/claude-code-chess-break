import { describe, expect, test } from 'claude-code/testing'

import { SCOPES, TOKEN_PAGE } from '../hooks/lichess/auth'
import { gameForm, readGameEvent, readPlaying } from '../hooks/lichess/game'
import type { GameEvent } from '../hooks/lichess/game'
import { applyState, clickGame, clockLeft, endingOf, formatClock, fromFull, isMyTurn, outcomeOf, playGame, readSettings, rollBack } from '../hooks/training/game'

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
    expect(readPlaying('{"nowPlaying":[{"gameId":"g4m3","fullId":"g4m3abcd"}]}')).toBe('g4m3')
    expect(readPlaying('{"nowPlaying":[]}')).toBeUndefined()
  })

  test('the forms Lichess expects', () => {
    expect(fields(gameForm({ kind: 'ai', level: 5, clock: '5+3', color: 'black' }))).toEqual({ level: '5', 'clock.limit': '300', 'clock.increment': '3', color: 'black' })
    expect(fields(gameForm({ kind: 'seek', clock: '15+10', rated: true }))).toEqual({ rated: 'true', time: '15', increment: '10', variant: 'standard' })
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

  test('what is refused', () => {
    expect(readSettings(['stockfish', '9'])).toBe('level')
    expect(readSettings(['stockfish', '1+0'])).toBe('aiClock')
    expect(readSettings(['human', '3+2'])).toBe('seekClock')
    expect(readSettings([])).toBe('usage')
    expect(readSettings(['chess960'])).toBe('usage')
  })
})
