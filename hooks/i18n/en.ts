import { humanize } from './messages'
import type { Messages } from './messages'

// Lichess's own English names for its themes.
const THEMES: Record<string, string> = {
  mix: 'Mix', fork: 'Fork', pin: 'Pin', skewer: 'Skewer', discoveredAttack: 'Discovered attack', doubleCheck: 'Double check',
  sacrifice: 'Sacrifice', deflection: 'Deflection', attraction: 'Attraction', clearance: 'Clearance', interference: 'Interference',
  intermezzo: 'Intermezzo', xRayAttack: 'X-Ray attack', capturingDefender: 'Capture the defender', hangingPiece: 'Hanging piece',
  trappedPiece: 'Trapped piece', mate: 'Checkmate', mateIn1: 'Mate in 1', mateIn2: 'Mate in 2', mateIn3: 'Mate in 3',
  mateIn4: 'Mate in 4', mateIn5: 'Mate in 5+', backRankMate: 'Back rank mate', smotheredMate: 'Smothered mate',
  arabianMate: 'Arabian mate', hookMate: 'Hook mate', anastasiaMate: 'Anastasia’s mate', bodenMate: 'Boden’s mate',
  doubleBishopMate: 'Double bishop mate', dovetailMate: 'Dovetail mate', opening: 'Opening', middlegame: 'Middlegame',
  endgame: 'Endgame', rookEndgame: 'Rook endgame', pawnEndgame: 'Pawn endgame', bishopEndgame: 'Bishop endgame',
  knightEndgame: 'Knight endgame', queenEndgame: 'Queen endgame', queenRookEndgame: 'Queen and rook', quietMove: 'Quiet move',
  defensiveMove: 'Defensive move', zugzwang: 'Zugzwang', exposedKing: 'Exposed king', kingsideAttack: 'Kingside attack',
  queensideAttack: 'Queenside attack', advancedPawn: 'Advanced pawn', promotion: 'Promotion', underPromotion: 'Underpromotion',
  enPassant: 'En passant', castling: 'Castling', oneMove: 'One-move puzzle', short: 'Short puzzle', long: 'Long puzzle',
  veryLong: 'Very long puzzle', crushing: 'Crushing', advantage: 'Advantage', equality: 'Equality', master: 'Master game',
}

const PIECES: Record<string, string> = { p: 'the pawn', n: 'the knight', b: 'the bishop', r: 'the rook', q: 'the queen', k: 'the king' }

const GROUPS: Record<string, string> = { tactics: 'Tactics', mates: 'Mates', phases: 'Game phases', ideas: 'Ideas' }

export const en: Messages = {
  side: s => (s === 'w' ? 'White' : 'Black'),
  piece: p => PIECES[p] ?? 'the piece',
  theme: key => THEMES[key] ?? humanize(key),
  group: key => GROUPS[key] ?? humanize(key),
  feedback(f, solver) {
    const me = en.side(solver)
    const them = en.side(solver === 'w' ? 'b' : 'w')
    switch (f.kind) {
      case 'start':
        return f.lastSan ? `${them} played ${f.lastSan}. Find the best move for ${me}.` : `Find the best move for ${me}.`
      case 'right':
        return `✓ ${f.san}, keep going.`
      case 'reply':
        return `${them} answers ${f.san}. Your move.`
      case 'wrong':
        return `✗ ${f.san} isn't it. Try again.`
      case 'illegal':
        return `“${f.text}” can't be played here.`
      case 'hint':
        return `Hint: move ${en.piece(f.piece)} on ${f.square}.`
      case 'solved':
        return f.isClean ? '🎉 Solved!' : 'Solved with help: it will come back for review.'
      case 'revealed':
        return `Solution: ${f.line.join(' ')}. It will come back for review.`
    }
  },
  pane: {
    review: 'review',
    dueCount: n => (n === 1 ? '1 to review' : `${n} to review`),
    streak: (streak, best) => `streak ${streak} (best ${best})`,
    hint: 'Hint',
    solution: 'Solution',
    next: 'Next',
    analyse: 'Analyse ↗',
    promoteTo: 'Promote to:',
    moveField: 'Move: e2e4 or Nf3',
    noMove: 'No legal move starts like this',
    loading: 'Loading a puzzle…',
    loadFailed: why => `Lichess can't be reached (${why}).`,
    retry: 'Retry',
  },
  command: {
    description: 'Chess tactics training: open the pane, pick a theme, see your progress',
    usage: '[next|theme <name>|themes|stats|review|lang auto|en|fr]',
    opened: 'Training pane opened.',
    next: 'New puzzle.',
    themeSet: name => `Training: ${name}. The next puzzle is on it.`,
    unknownTheme: typed => `No theme “${typed}”. /chess-break themes lists them.`,
    themes: groups =>
      ['Themes for /chess-break theme <name> (or mix):', ...groups.map(([group, names]) => `${group}: ${names.join(', ')}`)].join('\n'),
    stats: (lines, streak, best, due, weakest) =>
      [
        `Streak ${streak}, best ${best}. ${en.pane.dueCount(due)}.`,
        ...lines.map(l => `${l.name}: ${l.solved} ✓ ${l.failed} ✗ (${l.accuracy}%)`),
        ...(weakest ? [`Weakest: ${weakest}. Try /chess-break theme ${weakest}.`] : []),
      ].join('\n'),
    noStats: 'No puzzles yet. Open the pane with /chess-break.',
    reviewDue: n => `${en.pane.dueCount(n)}: the next puzzles are those.`,
    reviewNone: 'Nothing to review. Missed puzzles come back here a day later.',
    langSet: lang => `Language: ${lang}.`,
    claudeDone: 'Claude is done ✓',
    claudeDoneFinish: 'Claude is done ✓ Finish your puzzle.',
  },
}
