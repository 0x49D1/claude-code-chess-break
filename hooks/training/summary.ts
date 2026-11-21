import type { History, Tally, WeekSummary } from '../../types'
import { lastDays } from './daily'

/** A theme counts as best or weakest only with this many puzzles in the week. */
const AT_LEAST = 3

/** Days since this week's Monday: 0 on a Monday, 6 on a Sunday. */
const sinceMonday = (now: number) => (new Date(now).getDay() + 6) % 7

/** This week's Monday, as a local day: the key of the week the summary was last seen in. */
export const weekOf = (now: number) => lastDays(now, sinceMonday(now) + 1).at(-1)!

/** Last week's days, Monday to Sunday, counted by the calendar so a summer-time change skips none. */
export const lastWeek = (now: number) => lastDays(now, sinceMonday(now) + 8).slice(sinceMonday(now) + 1).reverse()

const accuracyOf = (t: Tally) => Math.round((100 * t.solved) / Math.max(1, t.solved + t.failed))

/** Every finished puzzle counted under its local day, solved cleanly or not; days past the history's are dropped. */
export function recordDay(totals: Record<string, Tally>, now: number, isClean: boolean, kept: number): Record<string, Tally> {
  const days = lastDays(now, kept)
  const today = days[0]!
  const { solved, failed } = totals[today] ?? { solved: 0, failed: 0 }
  const next = Object.fromEntries(Object.entries(totals).filter(([d]) => d >= days.at(-1)!))
  next[today] = isClean ? { solved: solved + 1, failed } : { solved, failed: failed + 1 }
  return next
}

/** Last week in numbers: puzzles played and solved, and the best and weakest theme; undefined for a week with none. */
export function weekSummary(totals: Record<string, Tally>, history: History, now: number): WeekSummary | undefined {
  const days = lastWeek(now)
  const themes: Record<string, Tally> = {}
  let played = 0
  let solved = 0
  for (const day of days) {
    const total = totals[day]
    played += total ? total.solved + total.failed : 0
    solved += total?.solved ?? 0
    for (const [theme, t] of Object.entries(history[day] ?? {})) {
      const sum = themes[theme] ?? { solved: 0, failed: 0 }
      themes[theme] = { solved: sum.solved + t.solved, failed: sum.failed + t.failed }
    }
  }
  if (!played) return undefined
  const ranked = Object.entries(themes)
    .filter(([, t]) => t.solved + t.failed >= AT_LEAST)
    .map(([theme, t]) => ({ theme, accuracy: accuracyOf(t) }))
    .sort((a, b) => b.accuracy - a.accuracy || a.theme.localeCompare(b.theme))
  const best = ranked[0]
  const weakest = ranked.length > 1 ? ranked.at(-1) : undefined
  return { from: days[0]!, to: days.at(-1)!, played, solved, ...(best ? { best } : {}), ...(weakest ? { weakest } : {}) }
}
