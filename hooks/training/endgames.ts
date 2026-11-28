import type { DrillResult, Game, GameSettings } from '../../types'

export type EndgameKey = 'kq' | 'kr' | 'kp' | 'lucena' | 'kbb' | 'kbn' | 'kqkr' | 'philidor' | 'kpdraw' | 'qpawn'

/**
 * A position to play out against Stockfish: won for White, to convert; or, with `isHeld`, drawn
 * for Black, to hold. Every position was checked against Lichess's tablebase.
 */
export type Endgame = { key: EndgameKey; fen: string; isHeld?: true }

export const ENDGAMES: Endgame[] = [
  { key: 'kq', fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1' },
  { key: 'kr', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1' },
  // The king on the sixth rank in front of its pawn wins, whoever is to move.
  { key: 'kp', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1' },
  // Won by building a bridge: Rd1+, then Rd4.
  { key: 'lucena', fen: '1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1' },
  { key: 'kbb', fen: '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1' },
  // The hardest basic mate: the king is driven to a corner of the bishop's colour, within fifty moves.
  { key: 'kbn', fen: '8/8/8/4k3/8/8/8/2B1KN2 w - - 0 1' },
  // Won in theory, and famously hard against a computer's defence.
  { key: 'kqkr', fen: '8/8/8/4k3/8/8/r7/3QK3 w - - 0 1' },
  // Drawn for Black: the rook on the sixth rank until the pawn comes, then checks from behind.
  { key: 'philidor', fen: '4k3/1R6/7r/3KP3/8/8/8/8 b - - 0 1', isHeld: true },
  // Drawn for Black, White to move: keep the opposition in front of the pawn.
  { key: 'kpdraw', fen: '8/8/8/4k3/8/4K3/4P3/8 w - - 0 1', isHeld: true },
  // Drawn for Black, White to move: a rook's pawn on the seventh, the queen's king too far, stalemate saves it.
  { key: 'qpawn', fen: '8/6Q1/8/8/8/8/p7/1k4K1 w - - 0 1', isHeld: true },
]

/** Stockfish at its strongest, with time to think: a drill is won or held by technique, not by the clock. */
export const drillSettings = (e: Endgame): GameSettings => ({ kind: 'ai', level: 8, clock: '15+10', color: e.isHeld ? 'black' : 'white', fen: e.fen })

/** A drill's game reached its goal: a win, or for one to hold, a draw too. */
export const isConverted = (e: Endgame, outcome: 'win' | 'loss' | 'draw') => outcome === 'win' || (!!e.isHeld && outcome === 'draw')

/** The drill a game is, from the position it started in; undefined for any other game. */
export const drillOf = (game: Game): Endgame | undefined => ENDGAMES.find(e => e.fen === game.initialFen)

/** A drill's result kept: converted stays converted; short of its goal, it is a try. */
export function recordDrill(results: Record<string, DrillResult>, key: string, isDone: boolean): Record<string, DrillResult> {
  return { ...results, [key]: isDone || results[key] === 'converted' ? 'converted' : 'tried' }
}

/** The drills as the list shows them: the ones not yet converted first, each in its own order. */
export const drillOrder = (results: Record<string, DrillResult>) =>
  [...ENDGAMES].sort((a, b) => Number(results[a.key] === 'converted') - Number(results[b.key] === 'converted'))
