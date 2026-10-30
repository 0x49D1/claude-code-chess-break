import type { GameSummary, Locale, Player } from '../../types'
import { formatClock } from '../training/game'
import { en } from './en'
import { fr } from './fr'
import { ka } from './ka'
import type { Messages } from './messages'
import { ru } from './ru'

export type { Messages }

export const LOCALES: Locale[] = ['en', 'fr', 'ru', 'ka']

const MESSAGES: Record<Locale, Messages> = { en, fr, ru, ka }

export const messagesFor = (locale: Locale): Messages => MESSAGES[locale]

export const asLocale = (x: unknown): Locale | undefined => (LOCALES.includes(x as Locale) ? (x as Locale) : undefined)

/**
 * The first hint naming a language, in order of precedence: the person's choice, the setting,
 * Claude Code's language, the locale variables. A hint naming a language we lack means English.
 */
export function pickLocale(hints: (string | undefined)[]): Locale {
  for (const hint of hints) {
    const value = hint?.trim().toLowerCase()
    if (!value || value === 'auto' || value === 'c' || value === 'posix') continue
    if (/^(fr|fran[cç])/.test(value)) return 'fr'
    if (/^(ru|рус|russ)/.test(value)) return 'ru'
    if (/^(ka|ქართ|georg)/.test(value)) return 'ka'
    return 'en'
  }
  return 'en'
}

/** A player by name: Stockfish by its level, a person by name. */
export const playerName = (t: Messages, p: Player) => (p.aiLevel ? t.game.stockfish(p.aiLevel) : p.name ?? t.game.anonymous)

/** A game of the list in one line: whose move, the opponent, the time left or `live`. */
export const gameLine = (t: Messages, g: GameSummary) =>
  `${g.isMyTurn ? '👉' : '⏳'} ${playerName(t, g.opponent)} · ${g.isCorrespondence ? formatClock((g.secondsLeft ?? 0) * 1000, true) : t.game.live}`
