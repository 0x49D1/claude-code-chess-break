import { atom, read, update } from 'claude-code'

import type { Attempt, Puzzle, Source } from '../../types'
import { RANDOM_DAILY_URL, USER_AGENT, readDaily } from '../chesscom/client'
import { nextPuzzleUrl, readAnswer } from '../lichess/client'
import { offlinePuzzle } from '../offline'
import { sendResult, storedToken } from './account'
import { leaveGame } from './game'
import { explainRequest } from '../training/explain'
import { awaitsReply, isClean, reply, start } from '../training/attempt'
import { recordProgress } from '../training/progress'
import { dueIds, recordReview } from '../training/review'
import { INITIAL_VIEW, PANE, TITLE, settings, storedProgress, storedReview } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

// Title, framed board, feedback, moves, themes, an explanation, field, suggestions, buttons.
const PANE_ROWS = 24

/** A new puzzle from Lichess or Chess.com. */
async function fetchPuzzle($: $, source: Source, theme: string): Promise<Puzzle> {
  if (source === 'chesscom') {
    const res = await $.http.fetch(RANDOM_DAILY_URL, { method: 'GET', headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } })
    return readDaily(res)
  }
  // Signed in, puzzles come from the account: ones not yet seen, at its rating.
  const token = await storedToken($)
  const headers: Record<string, string> = token ? { Accept: 'application/json', Authorization: `Bearer ${token}` } : { Accept: 'application/json' }
  return readAnswer(await $.http.fetch(nextPuzzleUrl(theme, settings.difficulty), { method: 'GET', headers }))
}

/**
 * The next puzzle: one due for review first, kept whole; else a new one from the chosen source.
 * When Lichess or Chess.com cannot be reached, the offline set keeps the training going.
 */
export async function loadNext($: $) {
  const before = await read($, view)
  if (before.isLoading) return
  await update($, view, v => ({ ...v, isLoading: true, typed: undefined, replayPly: undefined }))
  const review = await storedReview($)
  const current = before.attempt?.puzzle.id
  const dueId = dueIds(review, await $.clock.now()).find(id => id !== current && review[id]?.puzzle)
  const card = dueId ? review[dueId] : undefined
  if (card) {
    await update($, view, v => ({ ...v, isLoading: false, attempt: start(card.puzzle, true) }))
    return
  }
  const skip = current ? [current] : []
  if (before.source === 'offline') {
    await update($, view, v => ({ ...v, isLoading: false, fallback: undefined, attempt: start(offlinePuzzle(v.theme, skip), false) }))
    return
  }
  try {
    const puzzle = await fetchPuzzle($, before.source, before.theme)
    await update($, view, v => ({ ...v, isLoading: false, fallback: undefined, attempt: start(puzzle, false) }))
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err)
    await update($, view, v => ({ ...v, isLoading: false, fallback: why, attempt: start(offlinePuzzle(v.theme, skip), false) }))
  }
}

/** Counts a finished or abandoned attempt once: progress, and the review queue. */
async function record($: $, attempt: Attempt, isWin: boolean) {
  if (attempt.isRecorded) return
  const now = await $.clock.now()
  const review = recordReview(await storedReview($), attempt.puzzle, isWin, now)
  const progress = recordProgress(await storedProgress($), attempt.puzzle.themes, isWin)
  await $.store.set('review', review)
  await $.store.set('progress', progress)
  await update($, view, v => ({
    ...v,
    progress,
    session: [...v.session, isWin ? ('clean' as const) : ('missed' as const)],
    dueCount: dueIds(review, now).length,
    attempt: v.attempt?.puzzle.id === attempt.puzzle.id ? { ...v.attempt, isRecorded: true } : v.attempt,
  }))
  await sendResult($, attempt, isWin, (await read($, view)).theme)
}

/** Applies a change to the attempt, then plays the opponent's reply or records the end. */
export async function change($: $, fn: (a: Attempt) => Attempt): Promise<Attempt | undefined> {
  const { attempt } = await update($, view, v => (v.attempt ? { ...v, attempt: fn(v.attempt) } : v))
  if (!attempt) return undefined
  if (awaitsReply(attempt)) {
    $.clock.after(400, () => {
      void update($, view, v => (v.attempt?.puzzle.id === attempt.puzzle.id ? { ...v, attempt: reply(v.attempt) } : v))
    })
  } else if (attempt.status !== 'playing') {
    await record($, attempt, isClean(attempt))
  }
  return attempt
}

/**
 * Asks Claude why a finished puzzle's solution works, once per puzzle, in the person's language.
 * Resolves the explanation, or undefined with no finished puzzle or no answer.
 */
export async function explain($: $): Promise<string | undefined> {
  const v = await read($, view)
  const a = v.attempt
  if (!a || a.status === 'playing') return undefined
  if (v.explanation?.puzzleId === a.puzzle.id && (v.explanation.text || !v.explanation.failed)) return v.explanation.text
  const puzzleId = a.puzzle.id
  await update($, view, x => ({ ...x, explanation: { puzzleId } }))
  const ask = explainRequest(a, v.locale)
  const r = await $.model.complete({ model: 'sonnet', system: ask.system, prompt: ask.prompt, maxTokens: 600, effort: 'low' })
  const explanation = r.isAnswered ? { puzzleId, text: r.text.trim() } : { puzzleId, failed: r.reason }
  await update($, view, x => ({ ...x, explanation }))
  return explanation.text
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
  // A game or a seek holds the pane: puzzles wait behind it.
  if (v.game || v.seeking) return
  if ((!v.attempt || v.attempt.status !== 'playing') && !v.isLoading) await loadNext($)
}

/** From a game back to the puzzle left behind, or a new one. */
export async function backToPuzzles($: $) {
  await leaveGame($)
  if (!(await read($, view)).attempt) await loadNext($)
}

export async function refreshDue($: $) {
  const due = dueIds(await storedReview($), await $.clock.now()).length
  await update($, view, v => ({ ...v, dueCount: due }))
}
