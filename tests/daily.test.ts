import { expect, test } from 'claude-code/testing'

import { NO_DAILY, dayOf, recordDaily, todayOf } from '../hooks/training/daily'

/** Noon on a local day of November 2026, so no time zone moves it to another day. */
const noon = (date: number) => new Date(2026, 10, date, 12).getTime()

/** `n` finished puzzles on one day. */
const finish = (daily: typeof NO_DAILY, date: number, n: number, goal = 5) => {
  for (let i = 0; i < n; i++) daily = recordDaily(daily, noon(date), goal)
  return daily
}

test('days are local calendar days', () => {
  expect(dayOf(noon(10))).toBe('2026-11-10')
  expect(dayOf(new Date(2026, 10, 10, 23, 59).getTime())).toBe('2026-11-10')
  expect(dayOf(new Date(2026, 10, 11, 0, 1).getTime())).toBe('2026-11-11')
})

test('solved or missed, every puzzle counts; the goal meets the day once', () => {
  let d = finish(NO_DAILY, 10, 4)
  expect(todayOf(d, noon(10))).toEqual({ done: 4, isMet: false, streak: 0 })
  d = finish(d, 10, 1)
  expect(todayOf(d, noon(10))).toEqual({ done: 5, isMet: true, streak: 1 })
  d = finish(d, 10, 3)
  expect(todayOf(d, noon(10))).toEqual({ done: 8, isMet: true, streak: 1 })
  expect(d.best).toBe(1)
})

test('two days in a row, then a day missed', () => {
  let d = finish(finish(NO_DAILY, 10, 5), 11, 5)
  expect(todayOf(d, noon(11)).streak).toBe(2)
  // Not yet met today: yesterday's streak still shows, and the count starts again.
  expect(todayOf(d, noon(12))).toEqual({ done: 0, isMet: false, streak: 2 })
  // A whole day missed ends it.
  expect(todayOf(d, noon(13)).streak).toBe(0)
  d = finish(d, 13, 5)
  expect(todayOf(d, noon(13)).streak).toBe(1)
  expect(d.best).toBe(2)
})

test('the month changes without breaking the streak', () => {
  const d = finish(finish(NO_DAILY, 30, 5), 31, 5)
  expect(dayOf(noon(31))).toBe('2026-12-01')
  expect(todayOf(d, noon(31)).streak).toBe(2)
})

test('goal 0 meets no day; a goal lowered during the day is met with the next puzzle', () => {
  expect(todayOf(finish(NO_DAILY, 10, 9, 0), noon(10))).toEqual({ done: 9, isMet: false, streak: 0 })
  const d = finish(finish(NO_DAILY, 10, 3), 10, 1, 3)
  expect(todayOf(d, noon(10))).toEqual({ done: 4, isMet: true, streak: 1 })
})
