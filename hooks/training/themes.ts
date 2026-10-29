/** The Lichess themes offered for training, by group; any other Lichess theme key works too. */
export const THEME_GROUPS: Record<string, string[]> = {
  tactics: ['fork', 'pin', 'skewer', 'discoveredAttack', 'doubleCheck', 'sacrifice', 'deflection', 'attraction', 'clearance', 'interference', 'intermezzo', 'xRayAttack', 'capturingDefender', 'hangingPiece', 'trappedPiece'],
  mates: ['mateIn1', 'mateIn2', 'mateIn3', 'backRankMate', 'smotheredMate', 'arabianMate', 'hookMate', 'anastasiaMate', 'bodenMate', 'doubleBishopMate', 'dovetailMate'],
  phases: ['opening', 'middlegame', 'endgame', 'rookEndgame', 'pawnEndgame', 'bishopEndgame', 'knightEndgame', 'queenEndgame'],
  ideas: ['quietMove', 'defensiveMove', 'zugzwang', 'exposedKing', 'kingsideAttack', 'queensideAttack', 'advancedPawn', 'promotion', 'underPromotion', 'enPassant', 'castling'],
}

export const MIX = 'mix'

export const ALL_THEMES = Object.values(THEME_GROUPS).flat()

/** A theme key from what is typed: `fork`, `Fork`, `back-rank-mate`, `backrankmate`. */
export function findTheme(text: string): string | undefined {
  const typed = text.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (typed === MIX) return MIX
  return ALL_THEMES.find(t => t.toLowerCase() === typed)
}
