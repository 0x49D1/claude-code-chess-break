import type { Elements } from 'claude-code'

import type { Attempt } from '../../types'
import { checkedKing, legal, pieceAt } from '../chess/position'

/**
 * A printed diagram: one ink for every piece, white ones outlined and black ones solid, on cream
 * and sage squares. The same on dark and light terminals, as a page is.
 */
const DIAGRAM = {
  ink: '#1d1d1d',
  cream: '#efece4',
  sage: '#b9c2b0',
  /** The last move, a wash of straw over either square. */
  lastCream: '#e6dcaa',
  lastSage: '#c5bd86',
  selected: '#9cc3d5',
  hint: '#c9b6e4',
  capture: '#d9a99f',
  dot: '#2b6f8a',
  check: '#e05a4f',
}

const SOLID: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
const OUTLINE: Record<string, string> = { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' }

/** A piece as the diagram draws it: `N` an outlined knight, `n` a solid one. */
export const glyphOf = (piece: string) => (piece === piece.toUpperCase() ? OUTLINE : SOLID)[piece.toLowerCase()] ?? piece

export const BOARD_COLUMNS = 2 + 8 * 2

/** The diagram, the solver's side down, two columns a square, each square a button. */
export function board(els: Elements[keyof Elements], attempt: Attempt, onSquare: (square: string) => void) {
  const { Box, Text, Button } = els
  const isWhiteDown = attempt.puzzle.fen.split(' ')[1] !== 'b'
  const ranks = isWhiteDown ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]
  const files = isWhiteDown ? 'abcdefgh'.split('') : 'hgfedcba'.split('')
  const last = attempt.lastMove ? [attempt.lastMove.slice(0, 2), attempt.lastMove.slice(2, 4)] : []
  const targets = attempt.selected && attempt.status === 'playing' ? legal(attempt.fen).filter(m => m.from === attempt.selected) : []
  const checked = checkedKing(attempt.fen)

  const square = (file: string, rank: number) => {
    const name = `${file}${rank}`
    const isCream = ('abcdefgh'.indexOf(file) + rank) % 2 === 0
    const piece = pieceAt(attempt.fen, name)
    const isTarget = targets.some(m => m.to === name)
    const bg =
      attempt.selected === name ? DIAGRAM.selected
        : attempt.hint === name ? DIAGRAM.hint
        : checked === name ? DIAGRAM.check
        : isTarget && piece ? DIAGRAM.capture
        : last.includes(name) ? (isCream ? DIAGRAM.lastCream : DIAGRAM.lastSage)
        : isCream ? DIAGRAM.cream : DIAGRAM.sage
    const mark = piece ? glyphOf(piece) : isTarget ? '·' : ' '
    return (
      <Button key={`sq-${name}`} plain onPress={() => onSquare(name)}>
        <Text backgroundColor={bg} color={!piece && isTarget ? DIAGRAM.dot : DIAGRAM.ink} bold={!piece}>{`${mark} `}</Text>
      </Button>
    )
  }

  return (
    <Box flexDirection="column">
      {ranks.map(rank => (
        <Box key={`rank-${rank}`} flexDirection="row">
          <Text dimColor>{`${rank} `}</Text>
          {files.map(file => square(file, rank))}
        </Box>
      ))}
      <Text dimColor>{`  ${files.map(f => `${f} `).join('')}`}</Text>
    </Box>
  )
}
