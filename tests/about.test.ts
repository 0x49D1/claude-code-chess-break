import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'

import { readChangelog } from '../hooks/training/changelog'
import { PANE, lichess } from './fixtures/fake'

const CHANGELOG = `# Changelog

Some words first.

## 0.6.0 (2026-11-10)

- ℹ About in the pane.

## 0.5.0 (2026-11-10)

- 🔍 Review after a game.
- With **bold** and \`code\`.

## 0.4.0

- 📊 Progress.

## 0.3.0 (2026-11-10)

- 🎯 Daily goal.
`

const MANIFEST = JSON.stringify({ name: 'chess-break', version: '0.6.0', homepage: 'https://github.com/0x49D1/claude-code-chess-break' })

test('the changelog read by version, its date and lines in plain text', () => {
  expect(readChangelog(CHANGELOG)).toEqual([
    { version: '0.6.0', date: '2026-11-10', changes: ['ℹ About in the pane.'] },
    { version: '0.5.0', date: '2026-11-10', changes: ['🔍 Review after a game.', 'With bold and code.'] },
    { version: '0.4.0', date: undefined, changes: ['📊 Progress.'] },
    { version: '0.3.0', date: '2026-11-10', changes: ['🎯 Daily goal.'] },
  ])
  expect(readChangelog('no versions here')).toEqual([])
})

/** A session started with the mod's files as given; a file missing from them can't be read. */
async function started($: Engine, on: On, files: Record<string, string>) {
  mock.store(on)
  mock.clock(on)
  mock.env(on, {})
  lichess(on)
  on('fs.read', async (_$, e) => {
    const name = Object.keys(files).find(f => e.path.endsWith(`/${f}`))
    if (!name) throw new Error('ENOENT')
    return { value: files[name]! }
  })
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('session.start', async (_$, e) => e)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  return $.ui.mount({ ...PANE, surface: 'terminal' })
}

test('the version in the sidebar opens what’s new, with GitHub, and back', async ($, on) => {
  const ui = await started($, on, { '.claude-plugin/plugin.json': MANIFEST, 'CHANGELOG.md': CHANGELOG })
  expect(JSON.stringify(await ui.find({ key: 'about' }))).toContain('ℹ chess-break 0.6.0')
  await ui.press({ key: 'about' })
  expect(await ui.find({ text: /^ℹ chess-break 0\.6\.0$/ })).toBeDefined()
  expect(await ui.find({ text: /^✨ What’s new$/ })).toBeDefined()
  expect(await ui.find({ text: /^0\.6\.0  2026-11-10$/ })).toBeDefined()
  expect(await ui.find({ text: /^  • 🔍 Review after a game\.$/ })).toBeDefined()
  // The 3 latest versions only.
  expect(await ui.find({ text: /^0\.4\.0$/ })).toBeDefined()
  expect(await ui.find({ text: /Daily goal/ })).toBeUndefined()
  const links = JSON.stringify(await ui.findAll({ type: 'Link' }))
  expect(links).toContain('https://github.com/0x49D1/claude-code-chess-break"')
  expect(links).toContain('https://github.com/0x49D1/claude-code-chess-break/blob/main/CHANGELOG.md')
  await ui.press({ key: 'about-back' })
  expect(await ui.find({ text: /What’s new/ })).toBeUndefined()
  await ui.unmount()
})

test('without its files, About still opens and says the changes could not be read', async ($, on) => {
  const ui = await started($, on, {})
  expect(JSON.stringify(await ui.find({ key: 'about' }))).toContain('ℹ About')
  await ui.press({ key: 'about' })
  expect(await ui.find({ text: /^ℹ chess-break$/ })).toBeDefined()
  expect(await ui.find({ text: /^The list of changes could not be read\.$/ })).toBeDefined()
  expect(await ui.findAll({ type: 'Link' })).toEqual([])
  await ui.unmount()
})
