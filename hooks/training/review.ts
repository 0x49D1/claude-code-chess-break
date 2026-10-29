import type { Review } from '../../types'

const DAY = 24 * 60 * 60 * 1000

/** Days until a card in each box is due again: a puzzle solved cleanly from the last box is learned. */
const WAIT_DAYS = [1, 3, 7]

/**
 * Records how a puzzle went. A miss puts it in the first box, due tomorrow; a clean solve of a
 * puzzle under review moves it up a box, and out of the queue past the last one.
 */
export function recordReview(review: Review, id: string, isClean: boolean, now: number): Review {
  const card = review[id]
  if (!isClean) return { ...review, [id]: { box: 0, due: now + WAIT_DAYS[0]! * DAY } }
  if (!card) return review
  const box = card.box + 1
  const { [id]: _learned, ...rest } = review
  const wait = WAIT_DAYS[box]
  return wait === undefined ? rest : { ...rest, [id]: { box, due: now + wait * DAY } }
}

/** The puzzles due again, the longest waiting first. */
export const dueIds = (review: Review, now: number) =>
  Object.entries(review)
    .filter(([, card]) => card.due <= now)
    .sort(([, a], [, b]) => a.due - b.due)
    .map(([id]) => id)
