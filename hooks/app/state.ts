import type { EngineInterface } from 'claude-code'

import type { Progress, Review, Source, View } from '../../types'
import { asLocale, messagesFor, pickLocale } from '../i18n'
import type { Difficulty } from '../lichess/client'
import { NO_PROGRESS } from '../training/progress'
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
  session: [],
  isClaudeWorking: false,
  isRated: true,
  hasEmojiPawn: false,
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
  /** In Windows Terminal, the black pawn outlined in its own ink. */
  outlinedPawn: true,
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
