import { atom, update } from 'claude-code'

import { INITIAL_VIEW } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

export async function openAbout($: $) {
  await update($, view, v => ({ ...v, isAboutShown: true }))
}

export async function closeAbout($: $) {
  await update($, view, v => ({ ...v, isAboutShown: undefined }))
}
