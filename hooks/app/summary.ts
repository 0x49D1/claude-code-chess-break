import { atom, update } from 'claude-code'

import { weekOf, weekSummary } from '../training/summary'
import { INITIAL_VIEW, storedDays, storedHistory } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

/** Last week's card, once a week: on the first pane of a week whose card was not seen, when last week had puzzles. */
export async function offerSummary($: $) {
  const now = await $.clock.now()
  if ((await $.store.get('summarySeen')) === weekOf(now)) return
  const summary = weekSummary(await storedDays($), await storedHistory($), now)
  if (summary) await update($, view, v => ({ ...v, summary }))
}

/** Closes the card for the rest of the week. */
export async function closeSummary($: $) {
  await $.store.set('summarySeen', weekOf(await $.clock.now()))
  await update($, view, v => ({ ...v, summary: undefined }))
}
