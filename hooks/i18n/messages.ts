import type { Feedback, Source } from '../../types'

export type Side = 'w' | 'b'

/** Every text the mod shows, in one language. Emojis are the pane's, not the language's. */
export type Messages = {
  side: (side: Side) => string
  source: (source: Source) => string
  piece: (letter: string) => string
  theme: (key: string) => string
  group: (key: string) => string
  feedback: (f: Feedback, solver: Side) => string
  pane: {
    toPlay: (side: Side) => string
    review: string
    session: string
    streak: (streak: number, best: number) => string
    dueCount: (n: number) => string
    noneDue: string
    hint: string
    show: string
    skip: string
    analyse: string
    promoteTo: string
    moveField: string
    noMove: string
    loading: string
    offlineFallback: (source: string, why: string) => string
    dailyPuzzle: string
    retry: string
    statusHint: string
  }
  command: {
    description: string
    usage: string
    opened: string
    next: string
    noPuzzle: string
    themeSet: (name: string) => string
    unknownTheme: (typed: string) => string
    themesTitle: string
    statsHead: (streak: number, best: number, due: string) => string
    weakest: (name: string, key: string) => string
    noStats: string
    reviewDue: (due: string) => string
    reviewNone: string
    langSet: (lang: string) => string
    sourceSet: (name: string) => string
    noThemesOnChesscom: string
    claudeDoneFinish: string
  }
}

/** A Lichess theme key with no name here: `queenRookEndgame` → `Queen rook endgame`. */
export function humanize(key: string): string {
  const words = key.replace(/([a-z])([A-Z0-9])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
