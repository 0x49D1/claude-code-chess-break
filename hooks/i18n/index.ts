import type { Locale } from '../../types'
import { en } from './en'
import { fr } from './fr'
import type { Messages } from './messages'

export type { Messages }

export const LOCALES: Locale[] = ['en', 'fr']

const MESSAGES: Record<Locale, Messages> = { en, fr }

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
    return /^(fr|fran[cç])/.test(value) ? 'fr' : 'en'
  }
  return 'en'
}
