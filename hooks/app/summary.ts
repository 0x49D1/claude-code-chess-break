import { atom, update } from 'claude-code'

import { weekOf, weekSummary } from '../training/summary'
import { INITIAL_VIEW, storedDays, storedHistory } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

/** Last week's card, when last week had puzzles: once a week on the first pane, or whenever asked; says whether it shows. */
export async function offerSummary($: $, isAsked = false) {
  const now = await $.clock.now()
  if (!isAsked && (await $.store.get('summarySeen')) === weekOf(now)) return false
  const summary = weekSummary(await storedDays($), await storedHistory($), now)
  // Asked for, the card comes before Progress, About, the openings and the endgames; a game still holds the pane.
  const shown = isAsked ? { isProgressShown: undefined, isAboutShown: undefined, isOpeningsShown: undefined, isEndgamesShown: undefined } : {}
  if (summary) await update($, view, v => ({ ...v, ...shown, summary }))
  return summary !== undefined
}

/** Closes the card for the rest of the week. */
export async function closeSummary($: $) {
  await $.store.set('summarySeen', weekOf(await $.clock.now()))
  await update($, view, v => ({ ...v, summary: undefined }))
}
