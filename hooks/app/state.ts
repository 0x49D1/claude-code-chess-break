import type { EngineInterface } from 'claude-code'

import type { Daily, History, Progress, Review, Source, Tally, Times, Timing, View } from '../../types'
import { asLocale, messagesFor, pickLocale } from '../i18n'
import type { Difficulty } from '../lichess/client'
import { NO_DAILY } from '../training/daily'
import { NO_PROGRESS } from '../training/progress'
import { OPENINGS } from '../training/openings'
import { NO_TIMES } from '../training/timing'
import { MIX } from '../training/themes'

export type $ = EngineInterface

export const PANE = 'chess-break'
export const TITLE = '♞ chess-break'

/** The pane's state before anything happens; each file using it declares the atom itself, for the state scan. */
export const INITIAL_VIEW: View = {
  isLoading: false,
  locale: 'en',
  theme: MIX,
  source: 'lichess',
  dueCount: 0,
  progress: NO_PROGRESS,
  daily: NO_DAILY,
  history: {},
  times: NO_TIMES,
  openingSet: [],
  session: [],
  isClaudeWorking: false,
  isRated: true,
}

/** The person's settings, as the module was last loaded with them. */
export const settings = {
  autoOpen: true,
  difficulty: 'normal' as Difficulty,
  language: 'auto',
  source: 'lichess' as Source,
  promptLine: true,
  /** Sounds in a game: the opponent's move when the pane is hidden, and low time. */
  gameSound: false,
  ratedPuzzles: true,
  /** A reviewed game's costliest moves come back as puzzles. */
  gamePuzzles: true,
  /** Puzzles a day for the daily goal; 0 turns it off. */
  dailyGoal: 5,
}

export const SOURCES: Source[] = ['lichess', 'chesscom', 'offline']
export const asSource = (x: unknown): Source | undefined => (SOURCES.includes(x as Source) ? (x as Source) : undefined)

// What is kept across sessions.
export async function storedReview($: $): Promise<Review> {
  return ((await $.store.get('review')) as Review | undefined) ?? {}
}

export async function storedProgress($: $): Promise<Progress> {
  return ((await $.store.get('progress')) as Progress | undefined) ?? NO_PROGRESS
}

const isTally = (x: unknown): x is Tally =>
  typeof x === 'object' && x !== null && typeof (x as Partial<Tally>).solved === 'number' && typeof (x as Partial<Tally>).failed === 'number'

/** Puzzles by day and theme; a day or tally that isn't one is left out. */
export async function storedHistory($: $): Promise<History> {
  const x = (await $.store.get('history')) as Record<string, Record<string, unknown> | undefined> | undefined
  const history: History = {}
  for (const [day, themes] of Object.entries(typeof x === 'object' && x !== null ? x : {})) {
    if (typeof themes !== 'object' || themes === null) continue
    history[day] = Object.fromEntries(Object.entries(themes).filter((e): e is [string, Tally] => isTally(e[1])))
  }
  return history
}

/** The openings chosen to drill, by key; a key no opening has any more is left out. */
export async function storedOpeningSet($: $): Promise<string[]> {
  const x = await $.store.get('openingSet')
  return Array.isArray(x) ? x.filter((key): key is string => typeof key === 'string' && OPENINGS.some(o => o.key === key)) : []
}

/** The ids of puzzles solved cleanly, oldest first; anything else in the store is left out. */
export async function storedSolved($: $): Promise<string[]> {
  const x = await $.store.get('solved')
  return Array.isArray(x) ? x.filter((id): id is string => typeof id === 'string') : []
}

/** The daily goal's record, each field checked; a missing or broken one starts afresh. */
export async function storedDaily($: $): Promise<Daily> {
  const x = (await $.store.get('daily')) as Partial<Record<keyof Daily, unknown>> | undefined
  if (!x || typeof x.day !== 'string' || typeof x.done !== 'number' || typeof x.streak !== 'number' || typeof x.best !== 'number') return NO_DAILY
  return { day: x.day, done: x.done, streak: x.streak, best: x.best, ...(typeof x.metOn === 'string' ? { metOn: x.metOn } : {}) }
}

const asTiming = (x: unknown): Timing | undefined => {
  const t = x as Partial<Record<keyof Timing, unknown>> | undefined
  return typeof t?.count === 'number' && typeof t.totalMs === 'number' && typeof t.fastestMs === 'number' ? { count: t.count, totalMs: t.totalMs, fastestMs: t.fastestMs } : undefined
}

/** Solve times, each timing checked; a broken one is left out. */
export async function storedTimes($: $): Promise<Times> {
  const x = (await $.store.get('times')) as { all?: unknown; themes?: Record<string, unknown> } | undefined
  const themes: Record<string, Timing> = {}
  for (const [theme, t] of Object.entries(typeof x?.themes === 'object' && x.themes !== null ? x.themes : {})) {
    const timing = asTiming(t)
    if (timing) themes[theme] = timing
  }
  return { all: asTiming(x?.all) ?? NO_TIMES.all, themes }
}

/** /chess-break source, else the setting. */
export async function storedSource($: $): Promise<Source> {
  return asSource(await $.store.get('source')) ?? settings.source
}

export async function storedTheme($: $): Promise<string> {
  const theme = await $.store.get('theme')
  return typeof theme === 'string' ? theme : MIX
}

/** /chess-break lang, the setting, Claude Code's language setting, then the locale variables. */
export async function resolveLocale($: $) {
  const language = await $.settings.read({ key: 'language' }).catch(() => undefined)
  return pickLocale([
    asLocale(await $.store.get('lang')),
    settings.language,
    typeof language === 'string' ? language : undefined,
    await $.env.get('LC_ALL'),
    await $.env.get('LC_MESSAGES'),
    await $.env.get('LANG'),
  ])
}

export const messagesOf = (v: View) => messagesFor(v.locale)
