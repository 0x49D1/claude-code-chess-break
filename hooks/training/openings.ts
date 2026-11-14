import type { Puzzle } from '../../types'
import { START, line, uciOf } from '../chess/position'

/** An opening to drill: its main line as SAN, played as one side; it ends on that side's move. */
export type Opening = { key: string; name: string; side: 'w' | 'b'; moves: string[] }

// Names in English, as Lichess and most books give them.
export const OPENINGS: Opening[] = [
  { key: 'italian', name: 'Italian Game', side: 'w', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O'.split(' ') },
  { key: 'ruy-lopez', name: 'Ruy Lopez', side: 'w', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3'.split(' ') },
  { key: 'queens-gambit-declined', name: "Queen's Gambit Declined", side: 'w', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3'.split(' ') },
  { key: 'london', name: 'London System', side: 'w', moves: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3'.split(' ') },
  { key: 'najdorf', name: 'Sicilian Najdorf', side: 'b', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'.split(' ') },
  { key: 'french-winawer', name: 'French Winawer', side: 'b', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7'.split(' ') },
  { key: 'caro-kann', name: 'Caro-Kann', side: 'b', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7'.split(' ') },
  { key: 'kings-indian', name: "King's Indian", side: 'b', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5'.split(' ') },
]

/** The opening a typed name means: its key, or its name in any case, with spaces or hyphens. */
export function findOpening(text: string): Opening | undefined {
  const typed = text.trim().toLowerCase().replace(/['’]/g, '').replace(/\s+/g, '-')
  return OPENINGS.find(o => o.key === typed || o.name.toLowerCase().replace(/['’]/g, '').replace(/\s+/g, '-') === typed)
}

/** The opening of the set to drill after `last`, in the set's order and round again; the first when `last` is gone from it. */
export function nextInSet(set: string[], last: string | undefined): string | undefined {
  const at = last === undefined ? -1 : set.indexOf(last)
  return set[(at + 1) % Math.max(1, set.length)]
}

/**
 * An opening as a puzzle: as White from the start, as Black from after White's first move, the
 * rest of the line its solution, so replies, mistakes, help and review work as for any puzzle.
 */
export function openingPuzzle(opening: Opening): Puzzle {
  const moves = line(START, opening.moves) ?? []
  const first = opening.side === 'b' ? moves[0] : undefined
  const solution = (first ? moves.slice(1) : moves).map(uciOf)
  return {
    id: `opening-${opening.key}`,
    source: 'opening',
    title: opening.name,
    fen: first ? first.after : START,
    solution,
    themes: ['opening'],
    ...(first ? { lastMove: { uci: uciOf(first), san: first.san } } : {}),
  }
}
