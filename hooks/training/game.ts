import type { Game, GameNote, GameSettings } from '../../types'
import { START, completions, legal, pieceAt, readMove, replay, turnOf, uciOf } from '../chess/position'
import { AI_CLOCKS, SEEK_CLOCKS } from '../lichess/game'
import type { GameEvent, GameState } from '../lichess/game'

/** A game that Lichess still plays: created, or started. */
export const isOn = (g: Game) => g.status === 'started' || g.status === 'created'

export const isMyTurn = (g: Game) => isOn(g) && !g.pending && turnOf(g.fen) === g.side

/** Abort is Lichess's only before both sides have moved. */
export const canAbort = (g: Game) => isOn(g) && g.moves.length < 2

/** A game from the first line of its stream; the person's side found by their account's id. */
export function fromFull(e: Extract<GameEvent, { type: 'full' }>, username: string, settings: GameSettings | undefined, now: number): Game {
  const side = e.black.id === username.toLowerCase() ? 'b' : 'w'
  const game: Game = {
    id: e.id,
    settings,
    side,
    white: { name: e.white.name, rating: e.white.rating, aiLevel: e.white.aiLevel },
    black: { name: e.black.name, rating: e.black.rating, aiLevel: e.black.aiLevel },
    isRated: e.isRated,
    moves: [],
    fen: START,
    clock: { white: 0, black: 0, at: now },
    now,
    status: 'started',
  }
  return applyState(game, e.state, now)
}

/** Lichess's word on the game: its moves and clocks replace whatever the pane guessed. */
export function applyState(g: Game, s: GameState, now: number): Game {
  const played = replay(s.moves)
  return {
    ...g,
    moves: s.moves,
    fen: played?.fen ?? g.fen,
    lastMove: played?.last ? uciOf(played.last) : undefined,
    clock: { white: s.wtime, black: s.btime, at: now },
    now,
    status: s.status,
    winner: s.winner,
    drawOffer: s.drawOffer,
    pending: undefined,
    selected: undefined,
    promoting: undefined,
  }
}

/** A move Lichess refused: the board goes back to its moves. */
export function rollBack(g: Game): Game {
  const played = replay(g.moves)
  return { ...g, fen: played?.fen ?? START, lastMove: played?.last ? uciOf(played.last) : undefined, pending: undefined, selected: undefined, promoting: undefined }
}

/** Each side's time left at `g.now`, in ms: the side to move's runs once both sides have moved, as on Lichess. */
export function clockLeft(g: Game): { white: number; black: number } {
  const { white, black, at } = g.clock
  if (!isOn(g) || g.moves.length < 2) return { white, black }
  const spent = Math.max(0, g.now - at)
  // The clock of the side to move by Lichess's moves, not by a pending move of the person's.
  return g.moves.length % 2 === 0 ? { white: Math.max(0, white - spent), black } : { white, black: Math.max(0, black - spent) }
}

/** `4:05`; under ten seconds `0:07.3`. */
export function formatClock(ms: number): string {
  const tenths = Math.floor(ms / 100)
  const seconds = Math.floor(tenths / 10)
  const text = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  return ms < 10_000 ? `${text}.${tenths % 10}` : text
}

/** The person's move played on the board, waiting for Lichess; or why it cannot be. */
export function playGame(g: Game, text: string): { game: Game; uci?: string; note?: GameNote } {
  if (!isMyTurn(g)) return { game: g, note: { kind: 'notYourTurn' } }
  const move = readMove(g.fen, text)
  if (!move) return { game: g, note: { kind: 'illegal', text: text.trim() } }
  const played = replay([...g.moves, uciOf(move)])
  return {
    game: { ...g, fen: played?.fen ?? g.fen, lastMove: uciOf(move), pending: uciOf(move), selected: undefined, promoting: undefined },
    uci: uciOf(move),
  }
}

/** What is typed, or the one legal move it can still become, as the puzzles read it. */
export function playTyped(g: Game, text: string) {
  const options = completions(g.fen, text)
  return playGame(g, options.length === 1 ? options[0]! : text)
}

/** A click: selects a piece of the person's, moves the selected one, asks for a promotion, or lets go. */
export function clickGame(g: Game, square: string): { game: Game; uci?: string; note?: GameNote } {
  if (!isMyTurn(g)) return { game: g }
  const piece = pieceAt(g.fen, square)
  const isOwn = !!piece && (piece === piece.toUpperCase() ? 'w' : 'b') === g.side
  if (g.selected === square) return { game: { ...g, selected: undefined, promoting: undefined } }
  if (isOwn) return { game: { ...g, selected: square, promoting: undefined } }
  const moves = legal(g.fen).filter(m => m.from === g.selected && m.to === square)
  if (!g.selected || !moves.length) return { game: { ...g, selected: undefined, promoting: undefined } }
  return moves.some(m => m.promotion) ? { game: { ...g, promoting: g.selected + square } } : playGame(g, g.selected + square)
}

/** Why a game ended, in the few words the pane has for it. */
export type Ending = 'mate' | 'resign' | 'time' | 'left' | 'stalemate' | 'draw' | 'aborted' | 'other'

export function endingOf(status: string): Ending {
  switch (status) {
    case 'mate': return 'mate'
    case 'resign': return 'resign'
    case 'outoftime': return 'time'
    case 'timeout': return 'left'
    case 'stalemate': return 'stalemate'
    case 'draw': return 'draw'
    case 'aborted':
    case 'noStart': return 'aborted'
    default: return 'other'
  }
}

/** The ended game from the person's side. */
export const outcomeOf = (g: Game): 'win' | 'loss' | 'draw' => (!g.winner ? 'draw' : g.winner === g.side ? 'win' : 'loss')

export type SettingsError = 'usage' | 'level' | 'aiClock' | 'seekClock'

/**
 * The words after `play`: `stockfish [1-8] [clock] [white|black|random]` or `human [clock] [rated]`,
 * in any order after the first. Defaults: level 3, 10+0, a random colour, casual.
 */
export function readSettings(words: string[]): GameSettings | SettingsError {
  const [kind, ...rest] = words.map(w => w.toLowerCase())
  const clock = rest.find(w => /^\d+\+\d+$/.test(w)) ?? '10+0'
  if (kind === 'stockfish' || kind === 'ai' || kind === 'computer') {
    const number = rest.find(w => /^\d+$/.test(w))
    const level = number === undefined ? 3 : Number(number)
    if (level < 1 || level > 8) return 'level'
    if (!AI_CLOCKS.includes(clock)) return 'aiClock'
    const color = rest.find((w): w is 'white' | 'black' | 'random' => w === 'white' || w === 'black' || w === 'random') ?? 'random'
    return { kind: 'ai', level, clock, color }
  }
  if (kind === 'human' || kind === 'person') {
    if (!SEEK_CLOCKS.includes(clock)) return 'seekClock'
    return { kind: 'seek', clock, rated: rest.includes('rated') }
  }
  return 'usage'
}
