import { atom, update } from 'claude-code'
import type { Register } from 'claude-code'

import { restoreAccount } from './app/account'
import { openForTurn, refreshDue } from './app/actions'
import { startRefresh } from './app/games'
import { INITIAL_VIEW, PANE, asSource, messagesOf, resolveLocale, settings, storedProgress, storedSource, storedTheme } from './app/state'
import { COMMAND, registerCommands } from './commands'
import { messagesFor } from './i18n'
import type { Difficulty } from './lichess/client'
import { isStarted } from './training/attempt'
import { isOn } from './training/game'
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
  settings.gameSound = options.gameSound === true
  settings.ratedPuzzles = options.ratedPuzzles !== false

  on('session.start', async ($, e, next) => {
    const locale = await resolveLocale($)
    const t = messagesFor(locale)
    await $.command.register({ name: COMMAND, description: t.command.description, argumentHint: t.command.usage })
    const progress = await storedProgress($)
    const theme = await storedTheme($)
    const source = await storedSource($)
    // Windows Terminal ignores the text selector after ♟ and still draws the emoji.
    const hasEmojiPawn = Boolean(await $.env.get('WT_SESSION'))
    await update($, view, v => ({ ...v, locale, progress, theme, source, isRated: settings.ratedPuzzles, hasEmojiPawn }))
    await refreshDue($)
    await restoreAccount($)
    // The account's games come back, a live one on the pane; the session does not wait for them.
    void startRefresh($).catch(() => undefined)
    return next(e)
  })

  // A change in the /config menu reaches the next result; the pane's own switch is not seen here.
  on('config.set', { key: 'chess-break.ratedPuzzles' }, async ($, e, next) => {
    const result = await next(e)
    if (typeof result.value === 'boolean') {
      const isRated = result.value
      await update($, view, v => ({ ...v, isRated }))
    }
    return result
  })

  on('turn.start', async ($, e, next) => {
    await update($, view, v => ({ ...v, isClaudeWorking: true }))
    if (settings.autoOpen) void openForTurn($).catch(() => undefined)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    // A subagent finishing is not Claude being done.
    if (e.agentId) return result
    const v = await update($, view, x => ({ ...x, isClaudeWorking: false }))
    if (!(await $.ui.panes()).some(p => p.id === PANE)) return result
    // A correspondence game has no clock to lose on: it never holds the pane.
    if ((v.game && isOn(v.game) && !v.game.isCorrespondence) || v.seeking) $.ui.toast(messagesOf(v).command.gameGoesOn)
    else if (!v.game?.isCorrespondence && isStarted(v.attempt)) $.ui.toast(messagesOf(v).command.claudeDoneFinish)
    else await $.ui.close({ id: PANE })
    return result
  })

  registerCommands(on)
  registerPane(on)
  registerHint(on)
}
