import { atom, update } from 'claude-code'

import type { ThemeResult } from '../../types'
import { DASHBOARD_URL, readDashboard } from '../lichess/dashboard'
import { storedToken } from './account'
import { INITIAL_VIEW } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

/**
 * Reads Lichess's puzzle dashboard into the view, signed in only. Resolves its themes, or undefined
 * when not signed in or when it could not be read, which the view then says.
 */
export async function refreshDashboard($: $): Promise<Record<string, ThemeResult> | undefined> {
  const token = await storedToken($)
  if (!token) {
    await update($, view, v => ({ ...v, dashboard: undefined }))
    return undefined
  }
  try {
    const themes = readDashboard(await $.http.fetch(DASHBOARD_URL, { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }))
    await update($, view, v => ({ ...v, dashboard: { themes } }))
    return themes
  } catch (err) {
    const failed = err instanceof Error ? err.message : String(err)
    await update($, view, v => ({ ...v, dashboard: { failed } }))
    return undefined
  }
}

/** Opens the progress screen; Lichess's numbers follow when they arrive. */
export async function openProgress($: $) {
  await update($, view, v => ({ ...v, isProgressShown: true }))
  void refreshDashboard($).catch(() => undefined)
}

export async function closeProgress($: $) {
  await update($, view, v => ({ ...v, isProgressShown: undefined }))
}
