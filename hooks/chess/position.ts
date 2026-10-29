import { Chess } from '../vendor/chess.js'
import type { Move } from '../vendor/chess.js'

export type { Move }
export type Color = 'w' | 'b'

export const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/** French piece letters, read when the English reading finds nothing. */
const FRENCH: Record<string, string> = { c: 'n', f: 'b', t: 'r', d: 'q', r: 'k' }

/** SAN without what two spellings of one move may differ in: case, x, +, #, =, dashes. */
const bare = (s: string) => s.toLowerCase().replace(/[x+#!?=\s-]/g, '').replace(/0/g, 'o')

export const legal = (fen: string): Move[] => new Chess(fen).moves({ verbose: true })

export const uciOf = (m: Move) => m.from + m.to + (m.promotion ?? '')

export const turnOf = (fen: string): Color => (fen.split(' ')[1] === 'b' ? 'b' : 'w')

/** The position after a legal move; the move is trusted. */
export function after(fen: string, m: Move): string {
  const chess = new Chess(fen)
  chess.move({ from: m.from, to: m.to, promotion: m.promotion })
  return chess.fen()
}

export const isCheck = (fen: string) => new Chess(fen).isCheck()
export const isMate = (fen: string) => new Chess(fen).isCheckmate()

/** The piece on a square, as FEN letter (`N` white knight, `n` black), or undefined. */
export function pieceAt(fen: string, square: string): string | undefined {
  const p = new Chess(fen).get(square as Parameters<Chess['get']>[0])
  if (!p) return undefined
  return p.color === 'w' ? p.type.toUpperCase() : p.type
}

/** The square of the king of the side to move, when it is in check. */
export function checkedKing(fen: string): string | undefined {
  const chess = new Chess(fen)
  if (!chess.isCheck()) return undefined
  for (const row of chess.board()) {
    for (const cell of row) if (cell?.type === 'k' && cell.color === chess.turn()) return cell.square
  }
  return undefined
}

/**
 * Reads a typed move: UCI (`e2e4`, `e7e8q`), SAN (`Nf3`, `O-O`), French SAN (`Cf3`), in any case.
 * A spelling that two moves share is refused rather than guessed.
 */
export function readMove(fen: string, text: string): Move | undefined {
  const typed = text.trim()
  if (!typed) return undefined
  const moves = legal(fen)
  const uci = moves.find(m => uciOf(m) === typed.toLowerCase() || (m.promotion === 'q' && m.from + m.to === typed.toLowerCase()))
  if (uci) return uci
  const exact = moves.find(m => m.san.replace(/[+#]/g, '') === typed.replace(/[+#]/g, ''))
  if (exact) return exact
  for (const spelling of [typed, frenchToEnglish(typed)]) {
    const found = moves.filter(m => bare(m.san) === bare(spelling))
    if (found.length === 1) return found[0]
  }
  return undefined
}

/** The legal moves, as SAN, that what is typed so far can still become. */
export function completions(fen: string, text: string): string[] {
  const typed = text.trim().toLowerCase()
  if (!typed) return []
  const starts = [...new Set([typed, frenchToEnglish(typed)])].map(s => s.replace(/[+#!?=\s-]/g, ''))
  return legal(fen)
    .filter(m => {
      const san = m.san.toLowerCase().replace(/[+#=-]/g, '')
      // `Qf` finds `Qxf7` too, while `Qxf` keeps to captures.
      return uciOf(m).startsWith(typed) || starts.some(s => san.startsWith(s) || san.replace('x', '').startsWith(s))
    })
    .map(m => m.san)
}

function frenchToEnglish(s: string): string {
  return s.replace(/^[cftdr]/i, c => {
    const english = FRENCH[c.toLowerCase()] ?? c
    return c === c.toUpperCase() ? english.toUpperCase() : english
  }).replace(/=([cftd])$/i, (_, c: string) => '=' + (FRENCH[c.toLowerCase()] ?? c).toUpperCase())
}

/** Replays a game given as SAN tokens; undefined when one does not read. */
export function replay(tokens: string[], from = START): { fen: string; last?: Move } | undefined {
  const chess = new Chess(from)
  let last: Move | undefined
  for (const token of tokens) {
    try {
      last = chess.move(token, { strict: false })
    } catch {
      return undefined
    }
  }
  return { fen: chess.fen(), last }
}
