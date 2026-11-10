import type { Daily } from '../../types'

export const NO_DAILY: Daily = { day: '', done: 0, streak: 0, best: 0 }

const pad = (n: number) => String(n).padStart(2, '0')

/** The local calendar day of a time, as `2026-11-10`. */
export function dayOf(time: number) {
  const d = new Date(time)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** The calendar day before, found from noon, so a summer-time change never skips or doubles a day. */
function dayBefore(day: string) {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number)
  return dayOf(new Date(year, month - 1, date - 1, 12).getTime())
}

/** Counts one finished puzzle for today; reaching the goal meets the day, after yesterday's streak or anew. */
export function recordDaily(daily: Daily, now: number, goal: number): Daily {
  const today = dayOf(now)
  const done = (daily.day === today ? daily.done : 0) + 1
  // At least the goal, not exactly it: a goal lowered during the day is met with the next puzzle.
  if (goal <= 0 || done < goal || daily.metOn === today) return { ...daily, day: today, done }
  const streak = daily.metOn === dayBefore(today) ? daily.streak + 1 : 1
  return { day: today, done, metOn: today, streak, best: Math.max(daily.best, streak) }
}

/** Today as the pane shows it: its count, whether it is met, and the streak if it ended today or yesterday. */
export function todayOf(daily: Daily, now: number) {
  const today = dayOf(now)
  const isAlive = daily.metOn === today || daily.metOn === dayBefore(today)
  return { done: daily.day === today ? daily.done : 0, isMet: daily.metOn === today, streak: isAlive ? daily.streak : 0 }
}
