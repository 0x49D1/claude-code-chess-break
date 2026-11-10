import { atom, update } from 'claude-code'

import { readChangelog } from '../training/changelog'
import { INITIAL_VIEW } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

/** Opens the About screen with CHANGELOG.md's versions; a file that can't be read shows none. */
export async function openAbout($: $) {
  const releases = await $.fs.read(`${$.plugin.root}/CHANGELOG.md`).then(readChangelog, () => [])
  await update($, view, v => ({ ...v, about: { releases } }))
}

export async function closeAbout($: $) {
  await update($, view, v => ({ ...v, about: undefined }))
}
