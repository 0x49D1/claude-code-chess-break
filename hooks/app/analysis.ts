import { atom, read, update } from 'claude-code'

import { exportUrl, readAnalysis } from '../lichess/analysis'
import { INITIAL_VIEW } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

const POLL_MS = 5000
/** 3 minutes of reading every 5 seconds. */
const POLLS = 36

/** Reads the reviewed game's export every few seconds while Lichess's analysis is awaited. */
let poller: { cancel(): void } | undefined

function stopPolling() {
  poller?.cancel()
  poller = undefined
}

/**
 * Reads the shown game's export once and puts what it says in the view. Resolves true when that
 * settles the review: analysed, failed, or the game no longer shown.
 */
export async function checkAnalysis($: $, id: string): Promise<boolean> {
  const { game } = await read($, view)
  if (game?.id !== id) return true
  try {
    const mistakes = readAnalysis(await $.http.fetch(exportUrl(id), { method: 'GET', headers: { Accept: 'application/json' } }), game.side)
    if (!mistakes) return false
    await update($, view, v => (v.game?.id === id ? { ...v, analysis: { gameId: id, state: 'ready', mistakes } } : v))
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err)
    await update($, view, v => (v.game?.id === id ? { ...v, analysis: { gameId: id, state: 'failed', why } } : v))
  }
  return true
}

/** Waits for Lichess's analysis of the finished game shown: reads it now, then every 5 seconds for 3 minutes. */
export async function reviewGame($: $) {
  const { game } = await read($, view)
  if (!game) return
  const id = game.id
  stopPolling()
  await update($, view, v => ({ ...v, analysis: { gameId: id, state: 'waiting' } }))
  if (await checkAnalysis($, id)) return
  let left = POLLS
  poller = $.clock.every(POLL_MS, () => {
    void (async () => {
      left -= 1
      if (await checkAnalysis($, id)) return stopPolling()
      if (left > 0) return
      stopPolling()
      await update($, view, v => (v.game?.id === id ? { ...v, analysis: { gameId: id, state: 'gaveUp' } } : v))
    })().catch(() => undefined)
  })
}
