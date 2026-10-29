import { atom, read } from 'claude-code'
import type { Register } from 'claude-code'

import type { View } from '../../types'
import { INITIAL_VIEW, PANE, messagesOf, settings } from '../app/state'
import { solverOf } from '../training/attempt'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

/** The puzzle in a few words, for the end of the line under the prompt; undefined with none under way. */
export function hintTail(v: View): string | undefined {
  const a = v.attempt
  if (!a || a.status !== 'playing') return undefined
  const t = messagesOf(v)
  const last = a.played.at(-1) ?? a.puzzle.lastMove?.san
  return [
    `♞ ${a.puzzle.source === 'chesscom' ? a.puzzle.title ?? t.pane.dailyPuzzle : t.theme(v.theme)}`,
    t.pane.toPlay(solverOf(a)),
    ...(last ? [`⏮ ${last}`] : []),
    ...(v.progress.streak ? [`🔥 ${v.progress.streak}`] : []),
    t.pane.statusHint,
  ].join(' · ')
}

/** While the pane is hidden, the puzzle stays in view at the end of the hint line, dim. */
export const registerHint = (on: Parameters<Register>[0]) => {
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    if (!settings.promptLine) return next(e)
    // A host with no surface for panes has none shown.
    const panes = await $.ui.panes().catch(() => [])
    if (panes.some(p => p.id === PANE && p.isShown && p.isPlaced)) return next(e)
    const tail = hintTail(await read($, view))
    return tail === undefined ? next(e) : next({ ...e, props: { ...e.props, tail } })
  })
}
