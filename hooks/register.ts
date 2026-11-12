import { atom, update } from 'claude-code'
import type { Register } from 'claude-code'

import { restoreAccount } from './app/account'
import { openForTurn, refreshDue } from './app/actions'
import { stepBack } from './app/back'
import { startRefresh } from './app/games'
import { INITIAL_VIEW, PANE, asSource, messagesOf, resolveLocale, settings, storedDaily, storedHistory, storedProgress, storedSource, storedTimes, storedTheme } from './app/state'
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
  settings.gamePuzzles = options.gamePuzzles !== false
  settings.dailyGoal = typeof options.dailyGoal === 'number' && options.dailyGoal >= 0 ? Math.floor(options.dailyGoal) : 5

  on('session.start', async ($, e, next) => {
    const locale = await resolveLocale($)
    const t = messagesFor(locale)
    await $.command.register({ name: COMMAND, description: t.command.description, argumentHint: t.command.usage })
    const progress = await storedProgress($)
    const theme = await storedTheme($)
    const source = await storedSource($)
    const daily = await storedDaily($)
    const history = await storedHistory($)
    const times = await storedTimes($)
    await update($, view, v => ({ ...v, locale, progress, daily, history, times, theme, source, isRated: settings.ratedPuzzles }))
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
    const pane = (await $.ui.panes()).find(p => p.id === PANE)
    if (!pane) return result
    // A correspondence game has no clock to lose on: it never holds the pane.
    if ((v.game && isOn(v.game) && !v.game.isCorrespondence) || v.seeking) $.ui.toast(messagesOf(v).command.gameGoesOn)
    else if (!v.game?.isCorrespondence && (isStarted(v.attempt) || (v.attempt?.status === 'playing' && !!v.typed))) $.ui.toast(messagesOf(v).command.claudeDoneFinish)
    // The keyboard in the pane holds it while something would be lost: a puzzle on, a sign-in or a
    // game's setup. A finished puzzle with no next one asked for closes.
    else if (!(pane.isFocused && (v.attempt?.status === 'playing' || v.signIn || v.setup))) await $.ui.close({ id: PANE })
    return result
  })

  // Esc steps back from a screen over the puzzle, and closes the pane from the puzzle.
  on('ui.close', async ($, e, next) => {
    if (e.id !== PANE || e.origin.kind !== 'person' || !(await stepBack($))) return next(e)
    // Answered here: the pane stays open.
    return { value: undefined }
  })

  registerCommands(on)
  registerPane(on)
  registerHint(on)
}
