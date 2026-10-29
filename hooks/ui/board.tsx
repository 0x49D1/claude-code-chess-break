import type { Elements } from 'claude-code'

import type { Attempt } from '../../types'
import { checkedKing, legal, pieceAt } from '../chess/position'

export type Palette = {
  light: string
  dark: string
  lastLight: string
  lastDark: string
  selected: string
  hint: string
  capture: string
  dot: string
  check: string
  /** White pieces as dark outlines, where white would fade into the squares. */
  isWhiteOutlined: boolean
}

export const PALETTES: Record<'dark' | 'light', Palette> = {
  // Slate squares that sit quietly on a dark terminal.
  dark: {
    light: '#7b8794', dark: '#55606d', lastLight: '#8f915a', lastDark: '#6f7243', selected: '#5e8a62',
    hint: '#4d7d8c', capture: '#6f8a5f', dot: '#a8e0a0', check: '#b04848', isWhiteOutlined: false,
  },
  // Lichess's brown board with its overlays blended in.
  light: {
    light: '#f0d9b5', dark: '#b58863', lastLight: '#cdd26b', lastDark: '#aaa23a', selected: '#829769',
    hint: '#6ea3b0', capture: '#aeb17f', dot: '#208530', check: '#e70000', isWhiteOutlined: true,
  },
}

const FILLED: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
const OUTLINED: Record<string, string> = { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' }

export const glyphOf = (letter: string) => FILLED[letter] ?? letter

/** The board, the solver's side down, each square a button. */
export function board(els: Elements[keyof Elements], attempt: Attempt, colors: Palette, onSquare: (square: string) => void) {
  const { Box, Text, Button } = els
  const isWhiteDown = attempt.puzzle.fen.split(' ')[1] !== 'b'
  const ranks = isWhiteDown ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]
  const files = isWhiteDown ? 'abcdefgh'.split('') : 'hgfedcba'.split('')
  const last = attempt.lastMove ? [attempt.lastMove.slice(0, 2), attempt.lastMove.slice(2, 4)] : []
  const targets = attempt.selected && attempt.status === 'playing' ? legal(attempt.fen).filter(m => m.from === attempt.selected) : []
  const checked = checkedKing(attempt.fen)

  const square = (file: string, rank: number) => {
    const name = `${file}${rank}`
    const isLight = ('abcdefgh'.indexOf(file) + rank) % 2 === 0
    const piece = pieceAt(attempt.fen, name)
    const isTarget = targets.some(m => m.to === name)
    const bg =
      attempt.selected === name ? colors.selected
        : attempt.hint === name ? colors.hint
        : checked === name ? colors.check
        : isTarget && piece ? colors.capture
        : last.includes(name) ? (isLight ? colors.lastLight : colors.lastDark)
        : isLight ? colors.light : colors.dark
    const isWhite = !!piece && piece === piece.toUpperCase()
    const isOutlined = isWhite && colors.isWhiteOutlined
    const glyph = isTarget && !piece ? '•' : piece ? (isOutlined ? OUTLINED : FILLED)[piece.toLowerCase()] : ' '
    const color = isTarget && !piece ? colors.dot : isWhite && !isOutlined ? '#ffffff' : '#000000'
    return (
      <Button key={`sq-${name}`} plain onPress={() => onSquare(name)}>
        <Text backgroundColor={bg} color={color} bold>{` ${glyph} `}</Text>
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
      <Text dimColor>{`  ${files.map(f => ` ${f} `).join('')}`}</Text>
    </Box>
  )
}
