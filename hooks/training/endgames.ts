import type { GameSettings } from '../../types'

export type EndgameKey = 'kq' | 'kr' | 'kp' | 'lucena'

/** A position to convert against Stockfish: White to move, and winning. */
export type Endgame = { key: EndgameKey; fen: string }

export const ENDGAMES: Endgame[] = [
  { key: 'kq', fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1' },
  { key: 'kr', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1' },
  // The king on the sixth rank in front of its pawn wins, whoever is to move.
  { key: 'kp', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1' },
  // Won by building a bridge: Rd1+, then Rd4.
  { key: 'lucena', fen: '1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1' },
]

/** Stockfish at its strongest, with time to think: a drill is won by technique, not by the clock. */
export const drillSettings = (e: Endgame): GameSettings => ({ kind: 'ai', level: 8, clock: '15+10', color: 'white', fen: e.fen })
