import { expect, mock, test } from 'claude-code/testing'

import { HOMEPAGE, RELEASES, VERSION } from '../hooks/release'
import { PANE, lichess } from './fixtures/fake'

test('the built-in changes start with the built-in version, each with its lines', () => {
  expect(RELEASES[0]?.version).toBe(VERSION)
  for (const r of RELEASES) expect(r.changes.length).toBeGreaterThan(0)
  // Plain text: the markdown marks are gone.
  expect(RELEASES.flatMap(r => r.changes).some(c => /\*\*|`/.test(c))).toBe(false)
})

test('the version in the sidebar opens what’s new, with GitHub, and back', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  lichess(on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(JSON.stringify(await ui.find({ key: 'about' }))).toContain(`ℹ chess-break ${VERSION}`)
  await ui.press({ key: 'about' })
  expect(await ui.find({ text: new RegExp(`^ℹ chess-break ${VERSION.replace(/\./g, '\\.')}$`) })).toBeDefined()
  expect(await ui.find({ text: /^✨ What’s new$/ })).toBeDefined()
  expect(await ui.find({ text: `  • ${RELEASES[0]!.changes[0]}` })).toBeDefined()
  // The 3 latest versions only.
  if (RELEASES[3]) expect(await ui.find({ key: `release-${RELEASES[3].version}` })).toBeUndefined()
  const links = JSON.stringify(await ui.findAll({ type: 'Link' }))
  expect(links).toContain(`${HOMEPAGE}"`)
  expect(links).toContain(`${HOMEPAGE}/blob/main/CHANGELOG.md`)
  await ui.press({ key: 'about-back' })
  expect(await ui.find({ text: /What’s new/ })).toBeUndefined()
  await ui.unmount()
})
