import { expect, mock, test } from 'claude-code/testing'

import { lastWeek, recordDay, weekOf, weekSummary } from '../hooks/training/summary'
import { PANE, command, lichess } from './fixtures/fake'

/** Noon on a local day of November 2026. */
const noon = (date: number) => new Date(2026, 10, date, 12).getTime()

test('the week starts on Monday; last week is the Monday to Sunday before', () => {
  // 18 November 2026 is a Wednesday.
  expect(weekOf(noon(18))).toBe('2026-11-16')
  expect(weekOf(noon(16))).toBe('2026-11-16')
  expect(weekOf(noon(22))).toBe('2026-11-16')
  expect(lastWeek(noon(18))).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'])
  // Across a month: Monday 2 November's last week ends on 1 November.
  expect(lastWeek(noon(2)).at(-1)).toBe('2026-11-01')
})

test('each puzzle is counted under its day; days past the kept ones go', () => {
  let t = recordDay({}, noon(10), true, 84)
  t = recordDay(t, noon(10), false, 84)
  expect(t).toEqual({ '2026-11-10': { solved: 1, failed: 1 } })
  expect(Object.keys(recordDay({ '2026-01-01': { solved: 1, failed: 0 } }, noon(10), true, 84))).toEqual(['2026-11-10'])
})

test('last week in numbers, the best and weakest of the themes played enough', () => {
  const totals = { '2026-11-09': { solved: 3, failed: 1 }, '2026-11-15': { solved: 2, failed: 2 }, '2026-11-16': { solved: 9, failed: 0 } }
  const history = {
    '2026-11-09': { fork: { solved: 3, failed: 0 }, pin: { solved: 0, failed: 1 } },
    '2026-11-15': { fork: { solved: 1, failed: 0 }, pin: { solved: 1, failed: 2 }, mate: { solved: 1, failed: 0 } },
  }
  expect(weekSummary(totals, history, noon(18))).toEqual({
    from: '2026-11-09', to: '2026-11-15', played: 8, solved: 5,
    best: { theme: 'fork', accuracy: 100 }, weakest: { theme: 'pin', accuracy: 25 },
    themes: [{ theme: 'fork', accuracy: 100 }, { theme: 'pin', accuracy: 25 }, { theme: 'mate', accuracy: 100 }],
  })
  expect(weekSummary({ '2026-11-16': { solved: 1, failed: 0 } }, {}, noon(18))).toBeUndefined()
})

test('each theme is set against the week before, when it was played then', () => {
  const totals = { '2026-11-03': { solved: 1, failed: 1 }, '2026-11-10': { solved: 2, failed: 1 } }
  const history = {
    '2026-11-03': { fork: { solved: 1, failed: 1 } },
    '2026-11-10': { fork: { solved: 2, failed: 0 }, pin: { solved: 0, failed: 1 } },
  }
  expect(weekSummary(totals, history, noon(18))?.themes).toEqual([
    { theme: 'fork', accuracy: 100, before: 50 },
    { theme: 'pin', accuracy: 0 },
  ])
})

/** Scholar's mate to find: Qxf7#. */
const SCHOLAR = JSON.stringify({
  game: { pgn: 'e4 e5 Bc4 Nc6 Qf3 d6' },
  puzzle: { id: 'abc12', themes: ['mateIn1'], solution: ['f3f7'], initialPly: 5 },
})

test('a week later, the card shows once; Got it closes it for the week', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  lichess(on, { 'difficulty=normal': { status: 200, text: SCHOLAR } })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await $.command.run(command(''))
  expect(await ui.find({ key: 'summary-close' })).toBeUndefined()
  await ui.input({ key: 'move-abc12', text: 'Qxf7#' })
  await clock.advance(8 * 86_400_000)
  await $.command.run(command(''))
  expect(await ui.find({ text: /^🗓 Last week, / })).toBeDefined()
  expect(await ui.find({ text: /^🧩 1 puzzle, 1 solved cleanly \(100%\)$/ })).toBeDefined()
  await ui.press({ key: 'summary-close' })
  expect(await ui.find({ key: 'summary-close' })).toBeUndefined()
  await $.command.run(command(''))
  expect(await ui.find({ key: 'summary-close' })).toBeUndefined()
  await ui.unmount()
})

test('/chess-break week shows the card again, or says there is none', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  lichess(on, { 'difficulty=normal': { status: 200, text: SCHOLAR } })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await $.command.run(command('week'))).text).toBe('No puzzles last week, so no card.')
  await $.command.run(command(''))
  await ui.input({ key: 'move-abc12', text: 'Qxf7#' })
  await clock.advance(8 * 86_400_000)
  await $.command.run(command(''))
  await ui.press({ key: 'summary-close' })
  expect((await $.command.run(command('week'))).text).toBe('Last week’s card is in the pane.')
  expect(await ui.find({ key: 'summary-close' })).toBeDefined()
  expect(await ui.find({ text: /^· Mate in 1: 100% · new$/ })).toBeDefined()
  await ui.unmount()
})
