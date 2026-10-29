import type { Feedback } from '../../types'

export type Side = 'w' | 'b'

/** Every text the mod shows, in one language. */
export type Messages = {
  side: (side: Side) => string
  piece: (letter: string) => string
  theme: (key: string) => string
  feedback: (f: Feedback, solver: Side) => string
  group: (key: string) => string
  pane: {
    review: string
    dueCount: (n: number) => string
    streak: (streak: number, best: number) => string
    hint: string
    solution: string
    next: string
    analyse: string
    promoteTo: string
    moveField: string
    noMove: string
    loading: string
    loadFailed: (why: string) => string
    retry: string
  }
  command: {
    description: string
    usage: string
    opened: string
    next: string
    themeSet: (name: string) => string
    unknownTheme: (typed: string) => string
    themes: (groups: [string, string[]][]) => string
    stats: (lines: { name: string; solved: number; failed: number; accuracy: number }[], streak: number, best: number, due: number, weakest?: string) => string
    noStats: string
    reviewDue: (n: number) => string
    reviewNone: string
    langSet: (lang: string) => string
    claudeDone: string
    claudeDoneFinish: string
  }
}

/** A Lichess theme key Lichess gives no name for here: `queenRookEndgame` → `Queen rook endgame`. */
export function humanize(key: string): string {
  const words = key.replace(/([a-z])([A-Z0-9])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
