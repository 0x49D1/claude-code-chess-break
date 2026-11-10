import { atom, read, update } from 'claude-code'

import { screenOf } from '../training/screen'
import { closeAbout } from './about'
import { cancelSignIn } from './account'
import { backToPuzzles } from './actions'
import { closeProgress } from './progress'
import { INITIAL_VIEW } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

/**
 * Esc on the pane: leaves the screen shown over the puzzle and resolves true, so the pane stays.
 * A live game or seek stays as it is; from the puzzle itself, false: the pane closes.
 */
export async function stepBack($: $): Promise<boolean> {
  switch (screenOf(await read($, view))) {
    case 'signIn': await cancelSignIn($); return true
    case 'setup': await update($, view, x => ({ ...x, setup: undefined, isConfirming: undefined })); return true
    case 'liveGame': return true
    case 'game': await backToPuzzles($); return true
    case 'progress': await closeProgress($); return true
    case 'about': await closeAbout($); return true
    case 'puzzle': return false
  }
}
