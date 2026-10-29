import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { change, loadNext, next, openPane, refreshDue } from './app/actions'
import { INITIAL_VIEW, SOURCES, asSource, messagesOf, resolveLocale, storedProgress, storedReview } from './app/state'
import { completions } from './chess/position'
import { LOCALES, asLocale, messagesFor } from './i18n'
import { hint, play, reveal, solverOf } from './training/attempt'
import { themeLines, weakest } from './training/progress'
import { dueIds } from './training/review'
import { THEME_GROUPS, findTheme } from './training/themes'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

export const COMMAND = 'chess-break'

export const registerCommands = (on: Parameters<Register>[0]) => {
  on('command.run', { command: COMMAND }, async ($, e) => {
    const [verb, arg] = e.args.trim().split(/\s+/).filter(Boolean)
    const t = messagesOf(await read($, view))
    /** What the attempt says after a change made from the prompt. */
    const said = async (fn: Parameters<typeof change>[1]) => {
      const a = await change($, fn)
      return { text: a ? t.feedback(a.feedback, solverOf(a)) : t.command.noPuzzle }
    }
    switch (verb?.toLowerCase()) {
      case undefined:
        await openPane($, true)
        return { text: t.command.opened }
      case 'next':
      case 'skip':
        await next($)
        return { text: t.command.next }
      case 'hint':
        return said(hint)
      case 'solution':
        return said(reveal)
      case 'theme': {
        const theme = findTheme(arg ?? '')
        if (!theme) return { text: t.command.unknownTheme(arg ?? '') }
        await $.store.set('theme', theme)
        await update($, view, v => ({ ...v, theme }))
        // A puzzle not yet started makes way for one on the new theme.
        const { attempt } = await read($, view)
        if (!attempt || (attempt.played.length === 0 && !attempt.hadMistake && !attempt.usedHelp)) await loadNext($)
        const { source } = await read($, view)
        const note = source === 'chesscom' ? `\n${t.command.noThemesOnChesscom}` : ''
        return { text: t.command.themeSet(t.theme(theme)) + note }
      }
      case 'themes':
        return {
          text: [t.command.themesTitle, ...Object.entries(THEME_GROUPS).map(([group, keys]) => `${t.group(group)}: ${keys.join(', ')}`)].join('\n'),
        }
      case 'stats': {
        const progress = await storedProgress($)
        const lines = themeLines(progress)
        if (!lines.length) return { text: t.command.noStats }
        const due = dueIds(await storedReview($), await $.clock.now()).length
        const weak = weakest(progress)
        return {
          text: [
            t.command.statsHead(progress.streak, progress.best, due ? t.pane.dueCount(due) : t.pane.noneDue),
            ...lines.map(l => `${t.theme(l.theme)}: ${l.solved} ✓ ${l.failed} ✗ (${l.accuracy}%)`),
            ...(weak ? [t.command.weakest(t.theme(weak.theme), weak.theme)] : []),
          ].join('\n'),
        }
      }
      case 'review': {
        await refreshDue($)
        const { dueCount } = await read($, view)
        if (!dueCount) return { text: t.command.reviewNone }
        await openPane($, true)
        const { attempt } = await read($, view)
        if (!attempt?.isReview) await next($)
        return { text: t.command.reviewDue(t.pane.dueCount(dueCount)) }
      }
      case 'source': {
        const source = asSource(arg?.toLowerCase())
        if (!source) return { text: `/${COMMAND} source ${SOURCES.join('|')}` }
        await $.store.set('source', source)
        await update($, view, v => ({ ...v, source, fallback: undefined }))
        const { attempt } = await read($, view)
        if (!attempt || (attempt.played.length === 0 && !attempt.hadMistake && !attempt.usedHelp)) await loadNext($)
        return { text: t.command.sourceSet(t.source(source)) }
      }
      case 'lang': {
        const lang = arg?.toLowerCase()
        if (lang !== 'auto' && !asLocale(lang)) return { text: `/${COMMAND} lang auto|${LOCALES.join('|')}` }
        if (lang === 'auto') await $.store.delete('lang')
        else await $.store.set('lang', lang)
        const locale = await resolveLocale($)
        await update($, view, v => ({ ...v, locale }))
        return { text: messagesFor(locale).command.langSet(locale) }
      }
      default: {
        // Anything else is a move: `/chess-break Qxf7`, `/chess-break e2e4`, `/chess-break cf3`.
        const typed = e.args.trim()
        const { attempt } = await read($, view)
        if (!attempt || attempt.status !== 'playing') return { text: `/${COMMAND} ${t.command.usage}` }
        return said(a => {
          const options = completions(a.fen, typed)
          return play(a, options.length === 1 ? options[0]! : typed)
        })
      }
    }
  })
}
