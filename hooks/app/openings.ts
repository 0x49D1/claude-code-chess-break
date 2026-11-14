import { atom, read, update } from 'claude-code'

import { start } from '../training/attempt'
import { OPENINGS, findOpening, nextInSet, openingPuzzle } from '../training/openings'
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

/** Adds an opening to the set, or takes it out; the set keeps the openings' own order. */
export async function toggleInSet($: $, key: string) {
  const { openingSet } = await update($, view, v => {
    const set = v.openingSet.includes(key) ? v.openingSet.filter(k => k !== key) : [...v.openingSet, key]
    return { ...v, openingSet: OPENINGS.map(o => o.key).filter(k => set.includes(k)) }
  })
  await $.store.set('openingSet', openingSet)
}

/** Starts the set's next opening, after the one drilled last; resolves its key, or undefined with an empty set. */
export async function drillSet($: $): Promise<string | undefined> {
  const { openingSet } = await read($, view)
  const last = await $.store.get('openingLast')
  const key = nextInSet(openingSet, typeof last === 'string' ? last : undefined)
  if (!key) return undefined
  await $.store.set('openingLast', key)
  await startOpening($, key)
  return key
}
