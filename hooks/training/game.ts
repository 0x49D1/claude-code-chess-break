import type { Game, GameNote, GameSettings, GameSummary } from '../../types'
import { START, completions, legal, line, pieceAt, readMove, replay, turnOf, uciOf } from '../chess/position'
import { AI_CLOCKS, DAYS, SEEK_CLOCKS } from '../lichess/game'
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
    isCorrespondence: e.isCorrespondence,
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
    takebackOffer: s.takebackOffer,
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

/** A game with days per move rather than a clock. */
export const isCorrespondence = (settings: GameSettings) => settings.clock.endsWith('d')

/**
 * `4:05`; under ten seconds `0:07.3`. A correspondence game's time, `slow`, reads `2d 12h`, `5h 03m`
 * or `42m`, and as a live clock under a minute.
 */
export function formatClock(ms: number, slow = false): string {
  const minutes = Math.floor(ms / 60_000)
  if (slow && minutes >= 24 * 60) return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`
  if (slow && minutes >= 60) return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
  if (slow && minutes >= 1) return `${minutes}m`
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

/** A game's settings before any choice: level 3, 10+0, a random colour, casual. */
export const GAME_DEFAULTS = {
  ai: { kind: 'ai', level: 3, clock: '10+0', color: 'random' },
  seek: { kind: 'seek', clock: '10+0', rated: false },
} as const satisfies { ai: GameSettings; seek: GameSettings }

export type SettingsError = 'usage' | 'level' | 'aiClock' | 'seekClock'

/**
 * The words after `play`: `stockfish [1-8] [clock|days] [white|black|random]` or `human [clock|days] [rated]`,
 * in any order after the first. Defaults: level 3, 10+0, a random colour, casual.
 */
export function readSettings(words: string[]): GameSettings | SettingsError {
  const [kind, ...rest] = words.map(w => w.toLowerCase())
  const clock = rest.find(w => /^\d+(\+\d+|d)$/.test(w)) ?? GAME_DEFAULTS.ai.clock
  if (kind === 'stockfish' || kind === 'ai' || kind === 'computer') {
    const number = rest.find(w => /^\d+$/.test(w))
    const level = number === undefined ? GAME_DEFAULTS.ai.level : Number(number)
    if (level < 1 || level > 8) return 'level'
    if (![...AI_CLOCKS, ...DAYS].includes(clock)) return 'aiClock'
    const color = rest.find((w): w is 'white' | 'black' | 'random' => w === 'white' || w === 'black' || w === 'random') ?? GAME_DEFAULTS.ai.color
    return { kind: 'ai', level, clock, color }
  }
  if (kind === 'human' || kind === 'person') {
    if (![...SEEK_CLOCKS, ...DAYS].includes(clock)) return 'seekClock'
    return { kind: 'seek', clock, rated: rest.includes('rated') }
  }
  return 'usage'
}

/** The game's moves as SAN, from the start. */
export const sanMoves = (g: Game) => (line(START, g.moves) ?? []).map(m => m.san)

/** A row of the move list: its number, the ply of its first move, and one or two moves. */
export type MoveRow = { number: number; ply: number; sans: string[] }

/** One move pair a row; past `max` rows, the first is cut (`isCut`, drawn `…`) and the latest follow. */
export function moveRows(sans: string[], max = 8): { isCut: boolean; rows: MoveRow[] } {
  const rows: MoveRow[] = []
  for (let ply = 0; ply < sans.length; ply += 2) rows.push({ number: ply / 2 + 1, ply, sans: sans.slice(ply, ply + 2) })
  return rows.length > max ? { isCut: true, rows: rows.slice(-(max - 1)) } : { isCut: false, rows }
}

/** The game as it stood after `ply` of its moves, to replay it once ended. */
export function gameAtPly(g: Game, ply: number): Game {
  const played = replay(g.moves.slice(0, Math.max(0, ply)))
  return { ...g, fen: played?.fen ?? START, lastMove: played?.last ? uciOf(played.last) : undefined, selected: undefined, promoting: undefined }
}

const VALUES: Record<string, number> = { q: 9, r: 5, b: 3, n: 3, p: 1 }
const FULL_SET: Record<string, number> = { q: 1, r: 2, b: 2, n: 2, p: 8 }

/**
 * Each side's captures, as piece letters (`q r b n p`), and its material lead, from the position.
 * shortcut: a promoted piece counts as an extra and its pawn as captured, clamped at none; fine for a sidebar.
 */
export function material(fen: string): Record<'w' | 'b', { captured: string[]; lead: number }> {
  const board = fen.split(' ')[0] ?? ''
  const count = (letter: string) => [...board].filter(c => c === letter).length
  const missing = (upper: boolean) =>
    Object.keys(FULL_SET).flatMap(p => Array<string>(Math.max(0, FULL_SET[p]! - count(upper ? p.toUpperCase() : p))).fill(p))
  const worth = (upper: boolean) => Object.keys(VALUES).reduce((sum, p) => sum + VALUES[p]! * count(upper ? p.toUpperCase() : p), 0)
  const lead = worth(true) - worth(false)
  return { w: { captured: missing(false), lead: Math.max(0, lead) }, b: { captured: missing(true), lead: Math.max(0, -lead) } }
}

/** The games awaiting the person's move, the least time left first. */
export const awaiting = (games: GameSummary[]) =>
  games.filter(g => g.isMyTurn).sort((a, b) => (a.secondsLeft ?? Infinity) - (b.secondsLeft ?? Infinity))

/** The games awaiting the person's move now that did not before, for the toast. */
export function newlyMine(before: GameSummary[], after: GameSummary[]): GameSummary[] {
  const mine = new Set(before.filter(g => g.isMyTurn).map(g => g.id))
  return after.filter(g => g.isMyTurn && !mine.has(g.id))
}
