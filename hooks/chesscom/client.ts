import type { Puzzle } from '../../types'
import { line, sanTokens, uciOf } from '../chess/position'

/** A random puzzle from Chess.com's daily puzzle archive: the only puzzles its public API gives. */
export const RANDOM_DAILY_URL = 'https://api.chess.com/pub/puzzle/random'

/** Chess.com asks API users to say who they are, so a blocked client can be reached. */
export const USER_AGENT = 'chess-break (Claude Code mod; https://github.com/0x49D1/claude-code-chess-break)'

type Answer = { title?: string; url?: string; publish_time?: number; fen?: string; pgn?: string }

/**
 * Turns Chess.com's answer into a puzzle. Its FEN is the solver's position and its PGN the
 * whole solution from there; it has no themes and no rating.
 */
export function parseDaily(json: unknown): Puzzle {
  const { title, url, publish_time, fen, pgn } = json as Answer
  if (!fen || !pgn || !publish_time) throw new Error('unexpected answer')
  const moves = line(fen, sanTokens(pgn))
  if (!moves?.length) throw new Error('unreadable solution')
  return {
    id: `chesscom-${publish_time}`,
    source: 'chesscom',
    url,
    title,
    fen,
    solution: moves.map(uciOf),
    themes: [],
  }
}

export function readDaily(res: { ok: boolean; status: number; text: string }): Puzzle {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return parseDaily(JSON.parse(res.text) as unknown)
}
