import type { Game, Mistake, Puzzle } from '../../types'
import { START, line, readMove, uciOf } from '../chess/position'
import { gameUrl } from '../lichess/game'

/**
 * The person's mistakes in a game, as puzzles: from the position before each, the better move
 * Lichess gave as the one-move solution. Only that move: the rest of an engine's line is not
 * forced, and a puzzle must not refuse a good second move. A better move that doesn't read there
 * is left out.
 */
export function mistakePuzzles(game: Game, mistakes: Mistake[], title: string): Puzzle[] {
  const moves = line(START, game.moves) ?? []
  return mistakes.flatMap(m => {
    const played = moves[m.ply]
    const better = played && readMove(played.before, m.best)
    if (!played || !better) return []
    const previous = moves[m.ply - 1]
    return [{
      id: `game-${game.id}-${m.ply}`,
      source: 'game' as const,
      url: `${gameUrl(game.id)}#${m.ply}`,
      title,
      fen: played.before,
      solution: [uciOf(better)],
      themes: [],
      ...(previous ? { lastMove: { uci: uciOf(previous), san: previous.san } } : {}),
    }]
  })
}
