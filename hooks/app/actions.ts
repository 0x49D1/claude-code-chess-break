import { atom, read, update } from 'claude-code'

import type { Attempt } from '../../types'
import { nextPuzzleUrl, puzzleByIdUrl, readAnswer } from '../lichess/client'
import { awaitsReply, isClean, reply, start } from '../training/attempt'
import { recordProgress } from '../training/progress'
import { dueIds, recordReview } from '../training/review'
import { INITIAL_VIEW, PANE, TITLE, settings, storedProgress, storedReview } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

const PANE_ROWS = 19

/** The next puzzle: one due for review first, else a new one on the theme trained. */
export async function loadNext($: $) {
  const before = await read($, view)
  if (before.isLoading) return
  await update($, view, v => ({ ...v, isLoading: true, error: undefined, typed: undefined }))
  const due = dueIds(await storedReview($), await $.clock.now()).filter(id => id !== before.attempt?.puzzle.id)
  try {
    const url = due[0] ? puzzleByIdUrl(due[0]) : nextPuzzleUrl(before.theme, settings.difficulty)
    const puzzle = readAnswer(await $.http.fetch(url, { method: 'GET', headers: { Accept: 'application/json' } }))
    await update($, view, v => ({ ...v, isLoading: false, attempt: start(puzzle, !!due[0]) }))
  } catch (err) {
    await update($, view, v => ({ ...v, isLoading: false, error: err instanceof Error ? err.message : String(err) }))
  }
}

/** Counts a finished or abandoned attempt once: progress, and the review queue. */
async function record($: $, attempt: Attempt, isWin: boolean) {
  if (attempt.isRecorded) return
  const now = await $.clock.now()
  const review = recordReview(await storedReview($), attempt.puzzle.id, isWin, now)
  const progress = recordProgress(await storedProgress($), attempt.puzzle.themes, isWin)
  await $.store.set('review', review)
  await $.store.set('progress', progress)
  await update($, view, v => ({
    ...v,
    progress,
    dueCount: dueIds(review, now).length,
    attempt: v.attempt?.puzzle.id === attempt.puzzle.id ? { ...v.attempt, isRecorded: true } : v.attempt,
  }))
}

/** Applies a change to the attempt, then plays the opponent's reply or records the end. */
export async function change($: $, fn: (a: Attempt) => Attempt) {
  const { attempt } = await update($, view, v => (v.attempt ? { ...v, attempt: fn(v.attempt) } : v))
  if (!attempt) return
  if (awaitsReply(attempt)) {
    $.clock.after(400, () => {
      void update($, view, v => (v.attempt?.puzzle.id === attempt.puzzle.id ? { ...v, attempt: reply(v.attempt) } : v))
    })
  } else if (attempt.status !== 'playing') {
    await record($, attempt, isClean(attempt))
  }
}

/** Leaving a puzzle after a mistake or some help counts it as missed, as on Lichess. */
export async function next($: $) {
  const { attempt } = await read($, view)
  if (attempt?.status === 'playing' && (attempt.hadMistake || attempt.usedHelp)) await record($, attempt, false)
  await loadNext($)
}

export async function openPane($: $, focus = false) {
  await $.ui.open({ id: PANE, title: TITLE, rows: PANE_ROWS, ...(focus ? { focus: true as const } : {}) })
  const v = await read($, view)
  if ((!v.attempt || v.attempt.status !== 'playing') && !v.isLoading) await loadNext($)
}

export async function refreshDue($: $) {
  const due = dueIds(await storedReview($), await $.clock.now()).length
  await update($, view, v => ({ ...v, dueCount: due }))
}
