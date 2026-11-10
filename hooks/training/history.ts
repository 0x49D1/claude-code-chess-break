import type { History, Tally, ThemeResult } from '../../types'
import { lastDays } from './daily'
import { skills } from './progress'

/** Days kept: the 4 weeks shown, with room to show more later. */
const KEPT_DAYS = 84
const WEEKS = 4

/** Counts a finished puzzle under its day and trained themes, and drops days past the kept ones. */
export function recordHistory(history: History, now: number, themes: string[], isClean: boolean): History {
  const kept = lastDays(now, KEPT_DAYS)
  const today = kept[0]!
  const day = { ...history[today] }
  for (const theme of skills(themes)) {
    const { solved, failed } = day[theme] ?? { solved: 0, failed: 0 }
    day[theme] = isClean ? { solved: solved + 1, failed } : { solved, failed: failed + 1 }
  }
  const next: History = { [today]: day }
  for (const d of kept.slice(1)) if (history[d]) next[d] = history[d]
  return next
}

const accuracyOf = (t: Tally) => (t.solved + t.failed ? Math.round((100 * t.solved) / (t.solved + t.failed)) : undefined)

const add = (a: Tally, b: Tally | undefined): Tally => ({ solved: a.solved + (b?.solved ?? 0), failed: a.failed + (b?.failed ?? 0) })

export type ProgressRow = {
  theme: string
  /** Accuracy in each of the last 4 weeks, oldest first; undefined for a week with none. */
  weeks: (number | undefined)[]
  /** Accuracy over the 4 weeks, when the theme was played in them. */
  accuracy?: number
  lichess?: ThemeResult
}

/** One row per theme played in the last 4 weeks, here or on Lichess, the weakest first. */
export function progressRows(history: History, now: number, lichess: Record<string, ThemeResult> = {}): ProgressRow[] {
  const days = lastDays(now, 7 * WEEKS).reverse()
  const weekTallies = (theme: string) =>
    Array.from({ length: WEEKS }, (_, w) => days.slice(7 * w, 7 * w + 7).reduce((sum, d) => add(sum, history[d]?.[theme]), { solved: 0, failed: 0 }))
  const local = new Set(days.flatMap(d => Object.keys(history[d] ?? {})))
  const themes = new Set([...local, ...skills(Object.keys(lichess))])
  const rows = [...themes].map(theme => {
    const weeks = weekTallies(theme)
    const accuracy = accuracyOf(weeks.reduce(add, { solved: 0, failed: 0 }))
    return { theme, weeks: weeks.map(accuracyOf), ...(accuracy === undefined ? {} : { accuracy }), ...(lichess[theme] ? { lichess: lichess[theme] } : {}) }
  })
  // Weakest first, by the local weeks, then by Lichess; a theme with neither last.
  const rank = (r: ProgressRow) => r.accuracy ?? r.lichess?.accuracy ?? 101
  return rows.sort((a, b) => rank(a) - rank(b) || a.theme.localeCompare(b.theme))
}

const BARS = '▁▂▃▄▅▆▇█'

/** The weeks as small bars by eighths of accuracy, `·` for a week with none. */
export const spark = (weeks: (number | undefined)[]) =>
  weeks.map(a => (a === undefined ? '·' : BARS[Math.min(7, Math.floor((a / 100) * 8))])).join('')
