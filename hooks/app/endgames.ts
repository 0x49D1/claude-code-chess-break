import { atom, update } from 'claude-code'

import type { GameNote } from '../../types'
import { ENDGAMES, drillSettings } from '../training/endgames'
import { startGame } from './game'
import { INITIAL_VIEW } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

export async function openEndgames($: $) {
  await update($, view, v => ({ ...v, isEndgamesShown: true }))
}

export async function closeEndgames($: $) {
  await update($, view, v => ({ ...v, isEndgamesShown: undefined }))
}

/** Starts a drill: a casual game against Stockfish from the endgame's position. Resolves why it did not start, if so. */
export async function startEndgame($: $, key: string): Promise<GameNote | undefined> {
  const endgame = ENDGAMES.find(e => e.key === key)
  if (!endgame) return undefined
  await closeEndgames($)
  return startGame($, drillSettings(endgame))
}
