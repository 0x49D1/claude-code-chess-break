import type { Attempt, Puzzle } from '../../types'
import { after, isMate, legal, line, pieceAt, readMove, turnOf, uciOf } from '../chess/position'

export function start(puzzle: Puzzle, isReview: boolean): Attempt {
  return {
    puzzle,
    fen: puzzle.fen,
    ply: 0,
    played: [],
    tried: [],
    lastMove: puzzle.lastMove?.uci,
    status: 'playing',
    hadMistake: false,
    usedHelp: false,
    feedback: { kind: 'start', lastSan: puzzle.lastMove?.san },
    isReview,
    isRecorded: false,
  }
}

export const solverOf = (a: Attempt) => turnOf(a.puzzle.fen)

/** The opponent still has to answer the solver's last move. */
export const awaitsReply = (a: Attempt) => a.status === 'playing' && turnOf(a.fen) !== solverOf(a)

/** Started: a move, a mistake or some help. */
export const isStarted = (a: Attempt | undefined) =>
  !!a && a.status === 'playing' && (a.played.length > 0 || a.hadMistake || a.usedHelp)

/** Solved with no mistake and no help: what moves a puzzle up the review boxes. */
export const isClean = (a: Attempt) => a.status === 'solved' && !a.hadMistake && !a.usedHelp

/** The solver's move, typed or clicked. Mate in another way than the solution counts, as on Lichess. */
export function play(a: Attempt, text: string): Attempt {
  if (a.status !== 'playing' || awaitsReply(a)) return a
  const base = { ...a, selected: undefined, promoting: undefined }
  if (text.trim().startsWith('/')) return { ...base, feedback: { kind: 'command', text: text.trim() } }
  const move = readMove(a.fen, text)
  if (!move) return { ...base, feedback: { kind: 'illegal', text } }
  const fen = after(a.fen, move)
  const isMating = isMate(fen)
  if (uciOf(move) !== a.puzzle.solution[a.ply] && !isMating) {
    return { ...base, hadMistake: true, tried: [...a.tried, move.san], feedback: { kind: 'wrong', san: move.san } }
  }
  const next: Attempt = {
    ...base,
    fen,
    ply: a.ply + 1,
    played: [...a.played, move.san],
    lastMove: uciOf(move),
    hint: undefined,
    feedback: { kind: 'right', san: move.san },
  }
  if (isMating || next.ply >= a.puzzle.solution.length) {
    return { ...next, status: 'solved', feedback: { kind: 'solved', isClean: !a.hadMistake && !a.usedHelp } }
  }
  return next
}

/** The opponent's answer, from the solution. */
export function reply(a: Attempt): Attempt {
  if (!awaitsReply(a)) return a
  const uci = a.puzzle.solution[a.ply]
  const move = legal(a.fen).find(m => uciOf(m) === uci)
  if (!move) return { ...a, status: 'revealed', feedback: { kind: 'revealed', line: [] } }
  return {
    ...a,
    fen: after(a.fen, move),
    ply: a.ply + 1,
    played: [...a.played, move.san],
    lastMove: uci,
    feedback: { kind: 'reply', san: move.san },
  }
}

/** Names the piece to move and lights its square. */
export function hint(a: Attempt): Attempt {
  if (a.status !== 'playing' || awaitsReply(a)) return a
  const from = a.puzzle.solution[a.ply]?.slice(0, 2)
  if (!from) return a
  const piece = (pieceAt(a.fen, from) ?? 'p').toLowerCase()
  return { ...a, hint: from, usedHelp: true, feedback: { kind: 'hint', piece, square: from } }
}

/** Plays out the rest of the solution. */
export function reveal(a: Attempt): Attempt {
  if (a.status !== 'playing') return a
  let fen = a.fen
  const line: string[] = []
  let last = a.lastMove
  for (const uci of a.puzzle.solution.slice(a.ply)) {
    const move = legal(fen).find(m => uciOf(m) === uci)
    if (!move) break
    line.push(move.san)
    fen = after(fen, move)
    last = uci
  }
  return {
    ...a,
    fen,
    ply: a.puzzle.solution.length,
    played: [...a.played, ...line],
    lastMove: last,
    status: 'revealed',
    usedHelp: true,
    selected: undefined,
    promoting: undefined,
    hint: undefined,
    feedback: { kind: 'revealed', line },
  }
}

/** A click: selects a piece of the solver's, moves the selected one, asks for a promotion, or lets go. */
export function click(a: Attempt, square: string): Attempt {
  if (a.status !== 'playing' || awaitsReply(a)) return a
  const piece = pieceAt(a.fen, square)
  const isOwn = !!piece && (piece === piece.toUpperCase() ? 'w' : 'b') === turnOf(a.fen)
  if (a.selected === square) return { ...a, selected: undefined, promoting: undefined }
  if (isOwn) return { ...a, selected: square, promoting: undefined }
  const moves = legal(a.fen).filter(m => m.from === a.selected && m.to === square)
  if (!a.selected || !moves.length) return { ...a, selected: undefined, promoting: undefined }
  return moves.some(m => m.promotion) ? { ...a, promoting: a.selected + square } : play(a, a.selected + square)
}

/** Plays the waiting promotion as q, r, b or n. */
export function promote(a: Attempt, piece: string): Attempt {
  return a.promoting ? play(a, a.promoting + piece) : a
}

/** Each move since the puzzle started, numbered from its position: `12… Qe8+`, `13. Rxe8`, `Rxe8#`. */
export function moveLabels(a: Attempt): string[] {
  const [, turn, , , , full] = a.puzzle.fen.split(' ')
  const first = Number(full) || 1
  const offset = turn === 'b' ? 1 : 0
  return a.played.map((san, i) => {
    const ply = i + offset
    const number = first + Math.floor(ply / 2)
    if (ply % 2 === 0) return `${number}. ${san}`
    return i === 0 ? `${number}… ${san}` : san
  })
}

/** The moves since the puzzle started, on one line: `12… Qe8+ 13. Rxe8 Rxe8#`. */
export const moveLine = (a: Attempt) => moveLabels(a).join(' ')

/**
 * The attempt as it stood after `ply` of its moves, to replay a finished puzzle: 0 is its start,
 * `played.length` its end.
 */
export function atPly(a: Attempt, ply: number): Attempt {
  const moves = line(a.puzzle.fen, a.played) ?? []
  const n = Math.max(0, Math.min(ply, moves.length))
  const last = moves[n - 1]
  return {
    ...a,
    fen: last ? last.after : a.puzzle.fen,
    lastMove: last ? uciOf(last) : a.puzzle.lastMove?.uci,
    selected: undefined,
    hint: undefined,
    promoting: undefined,
  }
}
