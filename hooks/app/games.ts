import { atom, read, update } from 'claude-code'

import { playerName } from '../i18n'
import { PLAYING_URL, readPlaying } from '../lichess/game'
import { isOn, newlyMine } from '../training/game'
import { storedToken } from './account'
import { follow } from './game'
import { INITIAL_VIEW, messagesOf } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

/** Reads the games list every five minutes. */
let refresher: { cancel(): void } | undefined

/** Lichess asked to slow down: the next timed read is skipped. */
let isSlowedDown = false

const EVERY = 300_000

/**
 * Reads the account's games from Lichess into the list, follows a live game when none is shown,
 * and toasts the games not shown that became the person's to move since the last read.
 */
export async function refreshGames($: $) {
  const token = await storedToken($)
  if (!token) return
  try {
    const res = await $.http.fetch(PLAYING_URL, { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
    isSlowedDown = res.status === 429
    if (!res.ok) return
    const games = readPlaying(res.text)
    const before = await read($, view)
    const v = await update($, view, x => ({ ...x, games }))
    // The first read of a session tells nothing new: the list marks what awaits.
    const t = messagesOf(v)
    if (before.games) for (const g of newlyMine(before.games, games)) if (g.id !== v.game?.id) $.ui.toast(`♞ ${t.game.yourMoveAgainst(playerName(t, g.opponent))}`)
    const live = games.find(g => !g.isCorrespondence)
    if (live && !(v.game && isOn(v.game) && !v.game.isCorrespondence)) void follow($, live.id).catch(() => undefined)
  } catch (err) {
    $.ui.log(`chess-break: games list not read (${err instanceof Error ? err.message : String(err)})`, { to: 'debug' })
  }
}

/**
 * Reads the list now, then every five minutes for the session. A read while signed out asks
 * Lichess nothing, so signing out stops the reads and signing in starts them.
 */
export async function startRefresh($: $) {
  refresher?.cancel()
  refresher = $.clock.every(EVERY, () => {
    if (isSlowedDown) isSlowedDown = false
    else void refreshGames($).catch(() => undefined)
  })
  await refreshGames($)
}
