import type { Progress, Tally } from '../../types'

export const NO_PROGRESS: Progress = { themes: {}, streak: 0, best: 0 }

/** Themes that say how long a puzzle is or how it ends, not what it trains. */
const NOT_SKILLS = new Set(['oneMove', 'short', 'long', 'veryLong', 'crushing', 'advantage', 'equality', 'master', 'masterVsMaster', 'superGM'])

export function recordProgress(progress: Progress, themes: string[], isClean: boolean): Progress {
  const tallies = { ...progress.themes }
  for (const theme of themes.filter(t => !NOT_SKILLS.has(t))) {
    const { solved, failed } = tallies[theme] ?? { solved: 0, failed: 0 }
    tallies[theme] = isClean ? { solved: solved + 1, failed } : { solved, failed: failed + 1 }
  }
  const streak = isClean ? progress.streak + 1 : 0
  return { themes: tallies, streak, best: Math.max(progress.best, streak) }
}

export type ThemeLine = Tally & { theme: string; accuracy: number }

/** The themes tried, the most tried first. */
export function themeLines(progress: Progress): ThemeLine[] {
  return Object.entries(progress.themes)
    .map(([theme, t]) => ({ theme, ...t, accuracy: Math.round((100 * t.solved) / Math.max(1, t.solved + t.failed)) }))
    .sort((a, b) => b.solved + b.failed - (a.solved + a.failed) || a.theme.localeCompare(b.theme))
}

/** The weakest theme tried at least a few times: what to train next. */
export function weakest(progress: Progress, atLeast = 3): ThemeLine | undefined {
  return themeLines(progress)
    .filter(l => l.solved + l.failed >= atLeast)
    .sort((a, b) => a.accuracy - b.accuracy)[0]
}
