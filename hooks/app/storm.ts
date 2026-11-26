import { atom, read, update } from 'claude-code'

import type { Attempt, Storm } from '../../types'
import { endIfDue, recordRun, resume, startStorm, stormChange } from '../training/storm'
import { INITIAL_VIEW, PANE, storedBest, storedRuns } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

/** Ends a started run at its time and redraws its clock every second; stops once the run ends or closes. */
let stormTick: { cancel(): void } | undefined

function stopTick() {
  stormTick?.cancel()
  stormTick = undefined
}

/** An ended run kept, for Progress; and the most solved in one run, once a run beats it. */
async function saveRun($: $, s: Storm) {
  const stormRuns = recordRun(await storedRuns($), s)
  await $.store.set('stormRuns', stormRuns)
  const stormBest = Math.max(s.best, s.solved)
  if (stormBest > s.best) await $.store.set('stormBest', stormBest)
  await update($, view, v => ({ ...v, stormRuns, stormBest }))
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
        await saveRun($, ended)
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
  const best = await storedBest($)
  const now = await $.clock.now()
  await update($, view, v => ({
    ...v,
    // Again keeps the time the screen opened: the puzzle left behind waits from then.
    storm: startStorm(best, v.storm?.openedAt ?? now),
    isProgressShown: undefined,
    isAboutShown: undefined,
    isOpeningsShown: undefined,
    isEndgamesShown: undefined,
    summary: undefined,
  }))
}

/** Back to the puzzle left behind, its clock moved on by the time in the storm. */
export async function closeStorm($: $) {
  stopTick()
  const now = await $.clock.now()
  await update($, view, v => (v.storm ? { ...v, storm: undefined, attempt: resume(v.attempt, v.storm, now) } : v))
}

/** A move or a click on the run's puzzle. */
export async function stormMove($: $, fn: (a: Attempt) => Attempt) {
  const now = await $.clock.now()
  const before = (await read($, view)).storm
  const { storm } = await update($, view, v => (v.storm ? { ...v, storm: stormChange(v.storm, fn, now) } : v))
  if (storm?.endedAt !== undefined) {
    stopTick()
    // Kept once: a run already over when the move came was kept as it ended.
    if (before?.endedAt === undefined) await saveRun($, storm)
  } else if (storm?.startedAt !== undefined) keepTicking($)
  return storm
}
