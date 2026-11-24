import { atom, read, update } from 'claude-code'

import type { Attempt, Storm } from '../../types'
import { endIfDue, startStorm, stormChange } from '../training/storm'
import { INITIAL_VIEW, PANE } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

/** Ends a started run at its time and redraws its clock every second; stops once the run ends or closes. */
let stormTick: { cancel(): void } | undefined

function stopTick() {
  stormTick?.cancel()
  stormTick = undefined
}

/** The most solved in one run, kept once a run beats it. */
async function saveBest($: $, s: Storm | undefined) {
  if (s?.endedAt !== undefined && s.solved > s.best) await $.store.set('stormBest', s.solved)
}

function keepTicking($: $) {
  if (stormTick) return
  stormTick = $.clock.every(1000, () => {
    void (async () => {
      const now = await $.clock.now()
      const { storm } = await read($, view)
      if (!storm || storm.endedAt !== undefined) return stopTick()
      const ended = endIfDue(storm, now)
      if (ended !== storm) {
        await update($, view, v => (v.storm ? { ...v, storm: endIfDue(v.storm, now) } : v))
        await saveBest($, ended)
        stopTick()
      }
      const panes = await $.ui.panes().catch(() => [])
      if (panes.some(p => p.id === PANE && p.isShown)) $.ui.invalidate('ui.render')
    })().catch(() => undefined)
  })
}

/** A new run, over whatever side screen is open; its clock waits for the first move. */
export async function openStorm($: $) {
  stopTick()
  const stored = await $.store.get('stormBest')
  const best = typeof stored === 'number' ? stored : 0
  await update($, view, v => ({
    ...v,
    storm: startStorm(best),
    isProgressShown: undefined,
    isAboutShown: undefined,
    isOpeningsShown: undefined,
    isEndgamesShown: undefined,
    summary: undefined,
  }))
}

export async function closeStorm($: $) {
  stopTick()
  await update($, view, v => ({ ...v, storm: undefined }))
}

/** A move or a click on the run's puzzle. */
export async function stormMove($: $, fn: (a: Attempt) => Attempt) {
  const now = await $.clock.now()
  const { storm } = await update($, view, v => (v.storm ? { ...v, storm: stormChange(v.storm, fn, now) } : v))
  if (storm?.endedAt !== undefined) {
    stopTick()
    await saveBest($, storm)
  } else if (storm?.startedAt !== undefined) keepTicking($)
  return storm
}
