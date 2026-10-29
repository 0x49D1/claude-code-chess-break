import type { Puzzle } from '../../types'
import { legal, after, uciOf } from '../chess/position'
import { puzzleUrl } from '../lichess/client'
import { MIX } from '../training/themes'
import { PUZZLES } from './puzzles'

export const OFFLINE_COUNT = PUZZLES.length

/**
 * A puzzle from the set shipped with the mod (picked from Lichess's CC0 database), on a theme or
 * any, other than the ones to skip. Each row starts before the opponent's move, as Lichess's do.
 */
export function offlinePuzzle(theme: string, skip: string[], random = Math.random): Puzzle {
  const onTheme = PUZZLES.filter(([, , , , themes]) => theme === MIX || themes.split(' ').includes(theme))
  const pool = onTheme.filter(([id]) => !skip.includes(id))
  const rows = pool.length ? pool : onTheme.length ? onTheme : PUZZLES
  const [id, fen, moves, rating, themes] = rows[Math.floor(random() * rows.length)] ?? PUZZLES[0]!
  const [first, ...solution] = moves.split(' ')
  const opening = legal(fen).find(m => uciOf(m) === first)!
  return {
    id,
    source: 'offline',
    url: puzzleUrl(id),
    fen: after(fen, opening),
    solution,
    themes: themes.split(' '),
    rating,
    lastMove: { uci: first!, san: opening.san },
  }
}
