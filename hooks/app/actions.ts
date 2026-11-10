import { atom, read, update } from 'claude-code'

import type { Attempt, Puzzle, Source, View } from '../../types'
import { RANDOM_DAILY_URL, USER_AGENT, readDaily } from '../chesscom/client'
import { nextPuzzleUrl, readAnswer } from '../lichess/client'
import { offlinePuzzle } from '../offline'
import { sendResult, storedToken } from './account'
import { leaveGame, showGame } from './game'
import { refreshGames } from './games'
import { explainFailure, explainRequest } from '../training/explain'
import { awaitsReply, isClean, reply, start } from '../training/attempt'
import { awaiting, isOn } from '../training/game'
import { recordDaily } from '../training/daily'
import { recordHistory } from '../training/history'
import { recordProgress } from '../training/progress'
import { recordSolved } from '../training/solved'
import { recordTime } from '../training/timing'
import { dueIds, recordReview } from '../training/review'
import { INITIAL_VIEW, PANE, TITLE, settings, storedDaily, storedHistory, storedProgress, storedReview, storedSolved, storedTimes } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

/** Redraws the pane every second while a puzzle is played in it and it is shown, so its clock moves. */
let puzzleTick: { cancel(): void } | undefined

// Title, framed board, feedback, moves, themes, an explanation, field, suggestions, buttons.
const PANE_ROWS = 24

/** Tries for a puzzle not solved yet, before taking a solved one again. */
const FRESH_TRIES = 3

/** A new puzzle from Lichess or Chess.com, one not solved yet when it can find one. */
async function fetchFresh($: $, source: Source, theme: string, solved: Set<string>): Promise<Puzzle> {
  let puzzle = await fetchPuzzle($, source, theme)
  for (let tries = 1; tries < FRESH_TRIES && solved.has(puzzle.id); tries++) puzzle = await fetchPuzzle($, source, theme)
  return puzzle
}

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
 * Keeps the pane redrawn every second while a puzzle's clock runs and the pane is shown; stops
 * itself otherwise, and opening the pane or a first move starts it again.
 */
async function keepTicking($: $) {
  const { attempt } = await read($, view)
  if (puzzleTick || attempt?.status !== 'playing' || attempt.startedAt === undefined) return
  puzzleTick = $.clock.every(1000, () => {
    void (async () => {
      const v = await read($, view)
      // A host with no surface for panes has none shown.
      const panes = await $.ui.panes().catch(() => [])
      const isShown = panes.some(p => p.id === PANE && p.isShown)
      if (isShown && v.attempt?.status === 'playing' && !v.game && !v.seeking) return $.ui.invalidate('ui.render')
      puzzleTick?.cancel()
      puzzleTick = undefined
    })().catch(() => undefined)
  })
}

/**
 * The next puzzle: one due for review first, kept whole; else a new one from the chosen source,
 * not one solved cleanly before. When Lichess or Chess.com cannot be reached, the offline set
 * keeps the training going.
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
  // Missed puzzles stay out of it: they may come again, as well as for review.
  const solved = await storedSolved($)
  const skip = current ? [current, ...solved] : solved
  if (before.source === 'offline') {
    await update($, view, v => ({ ...v, isLoading: false, fallback: undefined, attempt: start(offlinePuzzle(v.theme, skip), false) }))
    return
  }
  try {
    const puzzle = await fetchFresh($, before.source, before.theme, new Set(skip))
    await update($, view, v => ({ ...v, isLoading: false, fallback: undefined, attempt: start(puzzle, false) }))
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err)
    await update($, view, v => ({ ...v, isLoading: false, fallback: why, attempt: start(offlinePuzzle(v.theme, skip), false) }))
  }
}

/** Counts a finished or abandoned attempt once: progress, its day in the history, the review queue, the day's goal, and a clean solve as solved, with its time. */
async function record($: $, attempt: Attempt, isWin: boolean) {
  if (attempt.isRecorded) return
  const now = await $.clock.now()
  const review = recordReview(await storedReview($), attempt.puzzle, isWin, now)
  const progress = recordProgress(await storedProgress($), attempt.puzzle.themes, isWin)
  const daily = recordDaily(await storedDaily($), now, settings.dailyGoal)
  await $.store.set('review', review)
  await $.store.set('progress', progress)
  await $.store.set('daily', daily)
  const history = recordHistory(await storedHistory($), now, attempt.puzzle.themes, isWin)
  await $.store.set('history', history)
  const elapsedMs = attempt.startedAt === undefined ? undefined : now - attempt.startedAt
  const before = await storedTimes($)
  const times = isWin && elapsedMs !== undefined ? recordTime(before, attempt.puzzle.themes, elapsedMs) : before
  if (times !== before) await $.store.set('times', times)
  if (isWin) await $.store.set('solved', recordSolved(await storedSolved($), attempt.puzzle.id))
  await update($, view, v => ({
    ...v,
    progress,
    daily,
    history,
    times,
    session: [...v.session, isWin ? ('clean' as const) : ('missed' as const)],
    dueCount: dueIds(review, now).length,
    attempt: v.attempt?.puzzle.id === attempt.puzzle.id ? { ...v.attempt, isRecorded: true, ...(elapsedMs === undefined ? {} : { elapsedMs }) } : v.attempt,
  }))
  await sendResult($, attempt, isWin, (await read($, view)).theme)
}

/**
 * Applies a change to the attempt, then plays the opponent's reply or records the end. The first
 * move tried, right or wrong, starts the puzzle's clock: the pane may sit open unwatched until then.
 * A puzzle that ends with that move has no time.
 */
export async function change($: $, fn: (a: Attempt) => Attempt): Promise<Attempt | undefined> {
  const now = await $.clock.now()
  const { attempt } = await update($, view, v => {
    if (!v.attempt) return v
    const a = fn(v.attempt)
    const isFirstMove = a.startedAt === undefined && a.status === 'playing' && (a.played.length > 0 || a.tried.length > 0)
    return { ...v, attempt: isFirstMove ? { ...a, startedAt: now } : a }
  })
  if (!attempt) return undefined
  await keepTicking($)
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
  const explanation: NonNullable<View['explanation']> = await $.model
    .complete({ model: 'sonnet', system: ask.system, prompt: ask.prompt, maxTokens: 600, effort: 'low' })
    .then(r => (r.isAnswered ? { puzzleId, text: r.text.trim() } : { puzzleId, failed: explainFailure(r) }))
    .catch(() => ({ puzzleId, failed: 'refused' as const }))
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
  await $.ui.open({ id: PANE, title: TITLE, rows: PANE_ROWS, closeOnEscape: true, ...(focus ? { focus: true as const } : {}) })
  // The list read as the pane opens: a live game on comes to the pane.
  await refreshGames($)
  const v = await read($, view)
  // A game or a seek holds the pane: puzzles wait behind it.
  if (v.game || v.seeking) return
  if ((!v.attempt || v.attempt.status !== 'playing') && !v.isLoading) await loadNext($)
  else await keepTicking($)
}

/**
 * The pane as Claude starts working: a live game or a seek holds it, else a correspondence game
 * awaiting the person's move comes before puzzles, the least time left first.
 */
export async function openForTurn($: $) {
  await openPane($)
  const v = await read($, view)
  if ((v.game && isOn(v.game) && !v.game.isCorrespondence) || v.seeking) return
  const waiting = awaiting(v.games ?? []).find(g => g.isCorrespondence)
  if (waiting && v.game?.id !== waiting.id) await showGame($, waiting.id)
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
