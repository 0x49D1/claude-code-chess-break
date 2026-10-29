import type { Puzzle } from '../../types'
import { legal, replay, uciOf } from '../chess/position'

const LICHESS = 'https://lichess.org'

export type Difficulty = 'easiest' | 'easier' | 'normal' | 'harder' | 'hardest'

export const puzzleUrl = (id: string) => `${LICHESS}/training/${id}`

/** Lichess's analysis board at a position, the given side down. */
export const analysisUrl = (fen: string, side: 'w' | 'b') =>
  `${LICHESS}/analysis/${fen.replace(/ /g, '_')}?color=${side === 'w' ? 'white' : 'black'}`

/** Where a new puzzle on a theme (`mix` for any) comes from, at a difficulty relative to the anonymous rating. */
export const nextPuzzleUrl = (theme: string, difficulty: Difficulty) =>
  `${LICHESS}/api/puzzle/next?angle=${encodeURIComponent(theme || 'mix')}&difficulty=${difficulty}`

/** Where a puzzle comes from again, by its id: how a missed one comes back. */
export const puzzleByIdUrl = (id: string) => `${LICHESS}/api/puzzle/${encodeURIComponent(id)}`

/** The puzzle in an answer of either address. */
export function readAnswer(res: { ok: boolean; status: number; text: string }): Puzzle {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return parsePuzzle(JSON.parse(res.text) as unknown)
}

type Answer = {
  game?: { pgn?: string }
  puzzle?: { id?: string; rating?: number; themes?: string[]; solution?: string[]; initialPly?: number }
}

/**
 * Turns Lichess's answer into a puzzle: the game's moves replayed to the position where the
 * solution's first move is legal. The PGN usually stops there; some answers carry a move more.
 */
export function parsePuzzle(json: unknown): Puzzle {
  const { game, puzzle } = json as Answer
  if (!puzzle?.id || !puzzle.solution?.length) throw new Error('unexpected answer')
  const tokens = String(game?.pgn ?? '').split(/\s+/).filter(t => t && !/^\d+\.+$/.test(t))
  const counts = [tokens.length, (puzzle.initialPly ?? -1) + 1].filter(n => n > 0 && n <= tokens.length)
  for (const count of new Set(counts)) {
    const game = replay(tokens.slice(0, count))
    if (!game || !legal(game.fen).some(m => uciOf(m) === puzzle.solution![0])) continue
    return {
      id: puzzle.id,
      fen: game.fen,
      solution: puzzle.solution,
      themes: puzzle.themes ?? [],
      rating: puzzle.rating,
      lastMove: game.last ? { uci: uciOf(game.last), san: game.last.san } : undefined,
    }
  }
  throw new Error(`cannot replay puzzle ${puzzle.id}`)
}
