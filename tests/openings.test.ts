import { expect, mock, test } from 'claude-code/testing'

import { START, line, turnOf } from '../hooks/chess/position'
import { OPENINGS, findOpening, openingPuzzle } from '../hooks/training/openings'
import { PANE, command, lichess } from './fixtures/fake'

test('every line is legal and ends on the side played', () => {
  for (const o of OPENINGS) {
    const moves = line(START, o.moves)
    expect(moves?.length).toBe(o.moves.length)
    expect(turnOf(moves!.at(-1)!.before)).toBe(o.side)
  }
})

test('as Black, the puzzle starts after White’s first move', () => {
  const p = openingPuzzle(findOpening('Sicilian Najdorf')!)
  expect(p).toMatchObject({ id: 'opening-najdorf', source: 'opening', title: 'Sicilian Najdorf', themes: ['opening'], lastMove: { uci: 'e2e4', san: 'e4' } })
  expect(turnOf(p.fen)).toBe('b')
  expect(p.solution[0]).toBe('c7c5')
  expect(openingPuzzle(findOpening('italian')!)).toMatchObject({ fen: START, solution: expect.arrayContaining(['e2e4']) })
  expect(findOpening("king's indian")?.key).toBe('kings-indian')
  expect(findOpening('dragon')).toBeUndefined()
})

test('picked in the pane, an opening plays as a puzzle from the person’s side', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  lichess(on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'openings' })
  expect(await ui.find({ key: 'opening-najdorf' })).toBeDefined()
  await ui.press({ key: 'opening-najdorf' })
  const title = (await ui.findAll({ type: 'Text' })).map(e => e.text).find(text => text.startsWith('🧩 '))
  expect(title).toMatch(/^🧩 Sicilian Najdorf  ·  Black to play/)
  expect(await ui.find({ text: /White played e4\. Find the best move for Black\./ })).toBeDefined()
  await ui.input({ key: 'move-opening-najdorf', text: 'c5' })
  await clock.advance(400)
  // White's reply came by itself: Black to play d6.
  expect(await ui.find({ text: /White answers Nf3\. Your move\./ })).toBeDefined()
  await ui.input({ key: 'move-opening-najdorf', text: 'd6' })
  expect(await ui.find({ text: /d6, keep going\./ })).toBeDefined()
  await ui.unmount()
})

test('a wrong move brings the opening back the next day; the command lists, starts and refuses', async ($, on) => {
  // A store the test can read: the review queue lands in it.
  const store: Record<string, unknown> = {}
  on('store.get', async (_$, e) => ({ value: store[e.key] }))
  on('store.set', async (_$, e) => ((store[e.key] = e.value), { value: undefined }))
  on('store.delete', async (_$, e) => (delete store[e.key], { value: undefined }))
  on('store.keys', async () => ({ value: Object.keys(store) }))
  const clock = mock.clock(on)
  const { calls } = lichess(on)
  expect((await $.command.run(command('opening'))).text).toMatch(/^Openings: \/chess-break opening <name>.*\nitalian: Italian Game · White\n/)
  expect((await $.command.run(command('opening dragon'))).text).toMatch(/^No opening “dragon”\.\n/)
  expect((await $.command.run(command('opening italian'))).text).toBe('Italian Game · White: in the pane.')
  // The pane opened on the opening: no puzzle fetched.
  expect(calls.some(c => c.url.includes('/api/puzzle/next'))).toBe(false)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.input({ key: 'move-opening-italian', text: 'e4' })
  await clock.advance(400)
  await ui.input({ key: 'move-opening-italian', text: 'Nf3' })
  await clock.advance(400)
  await ui.input({ key: 'move-opening-italian', text: 'Bb5' })
  await ui.press({ key: 'reveal' })
  expect(Object.keys(store.review as object)).toEqual(['opening-italian'])
  await ui.unmount()
})
