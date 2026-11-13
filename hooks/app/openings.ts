import { atom, update } from 'claude-code'

import { start } from '../training/attempt'
import { findOpening, openingPuzzle } from '../training/openings'
import { INITIAL_VIEW } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

export async function openOpenings($: $) {
  await update($, view, v => ({ ...v, isOpeningsShown: true }))
}

export async function closeOpenings($: $) {
  await update($, view, v => ({ ...v, isOpeningsShown: undefined }))
}

/** Starts drilling an opening in the pane, in place of the puzzle shown; resolves whether the name was one. */
export async function startOpening($: $, name: string): Promise<boolean> {
  const opening = findOpening(name)
  if (!opening) return false
  const attempt = start(openingPuzzle(opening), false)
  await update($, view, v => ({ ...v, isOpeningsShown: undefined, typed: undefined, replayPly: undefined, attempt }))
  return true
}
