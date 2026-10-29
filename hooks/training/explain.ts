import type { Attempt, Locale } from '../../types'
import { after, legal, uciOf } from '../chess/position'

const LANGUAGES: Record<Locale, string> = { en: 'English', fr: 'French', ru: 'Russian', ka: 'Georgian' }

/** The whole solution as SAN, from the puzzle's start. */
export function solutionSan(a: Attempt): string[] {
  let fen = a.puzzle.fen
  const sans: string[] = []
  for (const uci of a.puzzle.solution) {
    const move = legal(fen).find(m => uciOf(m) === uci)
    if (!move) break
    sans.push(move.san)
    fen = after(fen, move)
  }
  return sans
}

/**
 * What Claude is asked to explain a finished puzzle. It is handed the line rather than asked to
 * find it: a language model reads a board less surely than it explains a line it is given. Its
 * answer comes in three tagged parts; links are the mod's own, never the model's.
 */
export function explainRequest(a: Attempt, locale: Locale) {
  const side = a.puzzle.fen.split(' ')[1] === 'b' ? 'Black' : 'White'
  const facts = [
    `Position (FEN), ${side} to move: ${a.puzzle.fen}`,
    ...(a.puzzle.lastMove ? [`The opponent's last move: ${a.puzzle.lastMove.san}`] : []),
    `The solution, both sides' moves: ${solutionSan(a).join(' ')}`,
    ...(a.puzzle.themes.length ? [`Lichess themes: ${a.puzzle.themes.join(', ')}`] : []),
    ...(a.tried.length ? [`Moves the player tried that were wrong: ${a.tried.join(', ')}`] : []),
  ]
  return {
    system:
      'You are a friendly chess coach. Trust the solution you are given; do not propose other lines. ' +
      'Write plain text: no Markdown, no links, no move numbers.',
    prompt: [
      ...facts,
      '',
      `Answer in ${LANGUAGES[locale]}, in exactly these lines, each tag kept in English:`,
      'WHY: in 2 or 3 short sentences, the idea behind the first move and why the best defence fails; ' +
        'if the player tried a wrong move, why it fails.',
      'TIP: one practical rule to remember for positions like this one.',
      'FACT: one true, interesting fact about this tactic or pattern (its name, its history, a famous game). ' +
        'Leave this line out if you are not sure of it.',
    ].join('\n'),
  }
}

export type Explanation = { why: string; tip?: string; fact?: string }

/** The tagged parts of Claude's answer; an answer without tags is all `why`. */
export function readExplanation(text: string): Explanation {
  const part = (tag: string) => text.match(new RegExp(`^\\s*${tag}:\\s*(.+)$`, 'm'))?.[1]?.trim()
  const why = part('WHY')
  return why ? { why, tip: part('TIP'), fact: part('FACT') } : { why: text.trim() }
}

/** Themes that say how long a puzzle is or how it ends, with no lesson page of their own. */
const NOT_LESSONS = new Set(['oneMove', 'short', 'long', 'veryLong', 'crushing', 'advantage', 'equality', 'master', 'mate'])

// English Wikipedia's article for a theme, where it has one.
const WIKIPEDIA: Record<string, string> = {
  fork: 'Fork_(chess)', pin: 'Pin_(chess)', skewer: 'Skewer_(chess)', discoveredAttack: 'Discovered_attack',
  doubleCheck: 'Double_check', sacrifice: 'Sacrifice_(chess)', deflection: 'Deflection_(chess)', attraction: 'Decoy_(chess)',
  clearance: 'Clearance_sacrifice', interference: 'Interference_(chess)', intermezzo: 'Zwischenzug', xRayAttack: 'X-ray_(chess)',
  capturingDefender: 'Undermining_(chess)', backRankMate: 'Back-rank_checkmate', smotheredMate: 'Smothered_mate',
  arabianMate: 'Arabian_mate', bodenMate: "Boden's_Mate", anastasiaMate: "Anastasia's_mate", dovetailMate: 'Dovetail_mate',
  zugzwang: 'Zugzwang', promotion: 'Promotion_(chess)', underPromotion: 'Promotion_(chess)#Underpromotion',
  enPassant: 'En_passant', castling: 'Castling', opening: 'Chess_opening', middlegame: 'Middlegame', endgame: 'Chess_endgame',
  pawnEndgame: 'King_and_pawn_versus_king_endgame', rookEndgame: 'Rook_and_pawn_versus_rook_endgame',
}

export type LearnLink = { kind: 'practise' | 'wikipedia'; theme: string; url: string }

/** Where to learn more: Lichess's training on the puzzle's main theme, and Wikipedia's article on it. */
export function learnLinks(themes: string[]): LearnLink[] {
  const lessons = themes.filter(t => !NOT_LESSONS.has(t))
  const main = lessons[0]
  const article = lessons.find(t => WIKIPEDIA[t])
  return [
    ...(main ? [{ kind: 'practise' as const, theme: main, url: `https://lichess.org/training/${main}` }] : []),
    ...(article ? [{ kind: 'wikipedia' as const, theme: article, url: `https://en.wikipedia.org/wiki/${WIKIPEDIA[article]}` }] : []),
  ]
}
