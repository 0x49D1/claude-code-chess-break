import { atom, update } from 'claude-code'
import type { Register } from 'claude-code'

import { openPane, refreshDue } from './app/actions'
import { INITIAL_VIEW, PANE, asSource, messagesOf, resolveLocale, settings, storedProgress, storedSource, storedTheme } from './app/state'
import { COMMAND, registerCommands } from './commands'
import { messagesFor } from './i18n'
import type { Difficulty } from './lichess/client'
import { isStarted } from './training/attempt'
import { registerHint } from './ui/hint'
import { registerPane } from './ui/pane'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

const DIFFICULTIES: Difficulty[] = ['easiest', 'easier', 'normal', 'harder', 'hardest']

export const register: Register = (on, options) => {
  settings.autoOpen = options.autoOpen !== false
  settings.difficulty = DIFFICULTIES.find(d => d === options.difficulty) ?? 'normal'
  settings.language = String(options.language ?? 'auto')
  settings.source = asSource(options.source) ?? 'lichess'
  settings.promptLine = options.promptLine !== false

  on('session.start', async ($, e, next) => {
    const locale = await resolveLocale($)
    const t = messagesFor(locale)
    await $.command.register({ name: COMMAND, description: t.command.description, argumentHint: t.command.usage })
    const progress = await storedProgress($)
    const theme = await storedTheme($)
    const source = await storedSource($)
    await update($, view, v => ({ ...v, locale, progress, theme, source }))
    await refreshDue($)
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await update($, view, v => ({ ...v, isClaudeWorking: true }))
    if (settings.autoOpen) void openPane($).catch(() => undefined)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    // A subagent finishing is not Claude being done.
    if (e.agentId) return result
    const v = await update($, view, x => ({ ...x, isClaudeWorking: false }))
    if (!(await $.ui.panes()).some(p => p.id === PANE)) return result
    if (isStarted(v.attempt)) $.ui.toast(messagesOf(v).command.claudeDoneFinish)
    else await $.ui.close({ id: PANE })
    return result
  })

  registerCommands(on)
  registerPane(on)
  registerHint(on)
}
