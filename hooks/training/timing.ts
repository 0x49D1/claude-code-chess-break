import type { Times, Timing } from '../../types'
import { skills } from './progress'

export const NO_TIMES: Times = { all: { count: 0, totalMs: 0, fastestMs: 0 }, themes: {} }

/** A solve slower than this was probably left open while away: it is not counted. */
export const COUNTED_MS = 10 * 60 * 1000

const add = (t: Timing | undefined, ms: number): Timing =>
  t && t.count ? { count: t.count + 1, totalMs: t.totalMs + ms, fastestMs: Math.min(t.fastestMs, ms) } : { count: 1, totalMs: ms, fastestMs: ms }

/** Counts a clean solve's time, overall and under each trained theme; one past the counted time is left out. */
export function recordTime(times: Times, themes: string[], ms: number): Times {
  if (ms < 0 || ms > COUNTED_MS) return times
  const byTheme = { ...times.themes }
  for (const theme of skills(themes)) byTheme[theme] = add(byTheme[theme], ms)
  return { all: add(times.all, ms), themes: byTheme }
}

export const averageMs = (t: Timing) => (t.count ? Math.round(t.totalMs / t.count) : 0)

/** `0:42`, `12:05`: minutes and seconds, the seconds rounded down. */
export function formatTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
