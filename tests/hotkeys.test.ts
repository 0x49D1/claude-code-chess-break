import { expect, mock, test } from 'claude-code/testing'

import { PANE, lichess } from './fixtures/fake'

/** Three plies: Nxe5, the reply Qg5, then Nxf7. */
const DEFLECT = JSON.stringify({
  game: { pgn: 'e4 e5 Nf3 Nc6 Bc4 Nd4' },
  puzzle: { id: 'deflect', themes: ['fork'], solution: ['f3e5', 'd8g5', 'e5f7'], initialPly: 5 },
})

/** Every key a typed move can hold: pieces, files, ranks, captures, castling, and the French letters. */
const MOVE_KEYS = new Set('kqrbnabcdefghxo12345678ctfd'.split(''))

type Drawn = { key?: string; props: { hotkey?: string } }
const hotkeys = (buttons: unknown[]) => (buttons as Drawn[]).filter(b => b.props.hotkey).map(b => `${b.key}:${b.props.hotkey}`)

test('while a puzzle is played, no key a move can hold is a shortcut; once over, they come back', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  const { endAll } = lichess(on, { 'difficulty=normal': { status: 200, text: DEFLECT }, '/api/account': { status: 200, text: '{"username":"Magnus"}' } })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'login' })
  await ui.input({ key: 'token', text: 'lip_good' })
  await ui.press({ key: 'retry' })
  // A piece clicked: the keyboard is on the board, where typing Nf3 would press a shortcut.
  await ui.press({ key: 'sq-f3' })
  const during = hotkeys(await ui.findAll({ type: 'Button' }))
  expect(during.filter(h => MOVE_KEYS.has(h.split(':')[1]!))).toEqual([])
  expect(during).toContain('reveal:s')
  expect(JSON.stringify(await ui.find({ key: 'rated' }))).toBeDefined()
  // Over, the shortcuts come back: n for the next puzzle, c for rated.
  await ui.input({ key: 'move-deflect', text: 'Nxe5' })
  await ui.press({ key: 'reveal' })
  const after = hotkeys(await ui.findAll({ type: 'Button' }))
  expect(after).toContain('next:n')
  expect(after).toContain('rated:c')
  await ui.unmount()
  endAll()
  // The sign-in's own work, run apart from the press, settles before the file ends.
  for (let i = 0; i < 5; i++) await clock.advance(1)
})

test('the moves a typed start can become are buttons with no hotkey; pressing one plays it', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  lichess(on, { 'difficulty=normal': { status: 200, text: DEFLECT } })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'retry' })
  await ui.input({ key: 'move-deflect', text: 'N', kind: 'change' })
  const chips = ((await ui.findAll({ type: 'Button' })) as unknown as Drawn[]).filter(b => b.key?.startsWith('suggest-deflect-'))
  expect(chips.map(b => b.key?.replace('suggest-deflect-', ''))).toEqual(expect.arrayContaining(['Nxe5', 'Nxd4', 'Ng5']))
  expect(chips.filter(b => b.props.hotkey)).toEqual([])
  // Several left: Enter's label stays the default.
  expect(JSON.stringify(await ui.find({ key: 'move-deflect' }))).not.toContain('submitLabel')
  await ui.press({ key: 'suggest-deflect-Nxe5' })
  expect(await ui.find({ key: 'suggest-deflect-Nxe5' })).toBeUndefined()
  expect(await ui.find({ text: /Nxe5/ })).toBeDefined()
  await ui.unmount()
})
