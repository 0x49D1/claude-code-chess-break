import { atom, read, update } from 'claude-code'
import type { HookStream, ProcessSpawnChunk, ProcessSpawnResult } from 'claude-code'

import type { Game, GameNote, GameSettings } from '../../types'
import { AI_URL, EVENT_URL, PLAYING_URL, SEEK_URL, actionUrl, drawUrl, gameForm, moveUrl, readGameEvent, readPlaying, streamUrl } from '../lichess/game'
import { applyState, canAbort, fromFull, isOn, rollBack } from '../training/game'
import { storedAccount, storedToken } from './account'
import { INITIAL_VIEW } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

type Child = HookStream<ProcessSpawnChunk, ProcessSpawnResult>

/** The curl children: the followed game's stream, and a seek with the event stream that announces its game. */
const children: { game?: Child; seek?: Child; events?: Child } = {}

/** The game whose stream is read; another id, or none, ends the reading. */
let followed: string | undefined

/** Moves the clocks on every second while a game is on. */
let tick: { cancel(): void } | undefined

const MAX_WAIT = 30_000

// The work started in the background below ends with the module too: its rejection then says nothing.

/** What a refused Lichess answer means for the person. */
function refusal(res: { ok: boolean; status: number; text: string }): GameNote | undefined {
  if (res.ok) return undefined
  if (res.status === 401 || res.status === 403) return { kind: 'renewSignIn' }
  if (res.status === 429) return { kind: 'limited' }
  let text = res.status ? `HTTP ${res.status}` : res.text
  try {
    text = (JSON.parse(res.text) as { error?: string }).error ?? text
  } catch {
    // Not JSON: the status says it.
  }
  return { kind: res.status === 400 ? 'refused' : 'failed', text }
}

async function noted($: $, note: GameNote | undefined): Promise<GameNote | undefined> {
  await update($, view, v => ({ ...v, gameNote: note }))
  return note
}

async function hasCurl($: $): Promise<boolean> {
  return $.process.run(['curl', '--version']).then(r => r.exitCode === 0, () => false)
}

/**
 * Reads a long-lived Lichess answer line by line through curl, the token on stdin so that no
 * process list shows it. `onLine` answering true ends the reading. Resolves the HTTP status once
 * the answer ends (0 when none came), or undefined when curl could not start.
 */
async function streamLines($: $, slot: keyof typeof children, url: string, token: string, onLine: (line: string) => Promise<boolean | void>, form?: string) {
  const config = [`header = "Authorization: Bearer ${token}"`, 'header = "Accept: application/x-ndjson"', ...(form ? [`data = "${form}"`] : []), ''].join('\n')
  const child = $.process.spawn({ argv: ['curl', '-sSN', '--write-out', '%{stderr}HTTP %{http_code}\\n', '--config', '-', url], input: config })
  children[slot] = child
  let buffer = ''
  let errors = ''
  try {
    reading: for await (const { stream, text } of child) {
      if (stream === 'stderr') {
        errors += text
        continue
      }
      buffer += text
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) if (line.trim() && (await onLine(line))) break reading
    }
  } catch {
    return undefined
  } finally {
    if (children[slot] === child) children[slot] = undefined
  }
  return Number(errors.match(/HTTP (\d{3})/)?.[1] ?? 0)
}

async function stop(...slots: (keyof typeof children)[]) {
  for (const slot of slots) {
    const child = children[slot]
    children[slot] = undefined
    await child?.return(undefined as never).catch(() => undefined)
  }
}

function startTick($: $) {
  tick?.cancel()
  tick = $.clock.every(1000, () => void moveClocks($).catch(() => undefined))
}

async function moveClocks($: $) {
  const now = await $.clock.now()
  await update($, view, v => (v.game && isOn(v.game) ? { ...v, game: { ...v.game, now } } : v))
}

/**
 * Follows a game's stream into the pane until it ends: a dropped stream is reopened after 1, 2,
 * 4… up to 30 seconds, a minute when Lichess asks to slow down. The stream's first line gives the
 * whole game again, so a reconnect needs nothing kept.
 */
async function follow($: $, id: string, settings?: GameSettings) {
  await stop('game')
  followed = id
  startTick($)
  const token = await storedToken($)
  const username = (await storedAccount($))?.username ?? ''
  let wait = 1000
  while (token && followed === id) {
    const status = await streamLines($, 'game', streamUrl(id), token, async line => {
      const e = readGameEvent(line)
      if (followed !== id || !e || e.type === 'start') return
      const now = await $.clock.now()
      wait = 1000
      await update($, view, v => {
        if (e.type === 'full') return { ...v, seeking: undefined, gameNote: undefined, game: fromFull(e, username, settings ?? v.game?.settings, now) }
        return v.game?.id === id ? { ...v, gameNote: undefined, game: applyState(v.game, e.state, now) } : v
      })
    })
    if (followed !== id) return
    const { game } = await read($, view)
    if (game?.id === id && !isOn(game)) break
    if (status === undefined) {
      await noted($, { kind: 'needsCurl' })
      break
    }
    // A refused token, or a game Lichess no longer has, ends it; anything else is worth another try.
    if (status === 401 || status === 403 || status === 404) {
      await noted($, refusal({ ok: false, status, text: '' }))
      break
    }
    await noted($, { kind: status === 429 ? 'limited' : 'reconnecting' })
    await $.clock.sleep(status === 429 ? 60_000 : wait)
    wait = Math.min(wait * 2, MAX_WAIT)
  }
  if (followed === id) followed = undefined
  tick?.cancel()
  tick = undefined
}

/**
 * Starts a game against Stockfish, or seeks a person: the event stream says when Lichess paired
 * the seek. Resolves why it could not start, or undefined once it is on its way.
 */
export async function startGame($: $, settings: GameSettings): Promise<GameNote | undefined> {
  const token = await storedToken($)
  if (!token) return noted($, { kind: 'signIn' })
  if (!(await hasCurl($))) return noted($, { kind: 'needsCurl' })
  await leaveGame($)
  if (settings.kind === 'ai') {
    const res = await $.http
      .fetch(AI_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: gameForm(settings),
      })
      .catch(err => ({ ok: false, status: 0, text: err instanceof Error ? err.message : String(err) }))
    const note = refusal(res)
    if (note) return noted($, note)
    const id = (JSON.parse(res.text) as { id?: string }).id
    if (!id) return noted($, { kind: 'failed', text: 'no game' })
    void follow($, id, settings).catch(() => undefined)
    return undefined
  }
  await update($, view, v => ({ ...v, seeking: settings, gameNote: undefined }))
  void streamLines($, 'events', EVENT_URL, token, async line => {
    const e = readGameEvent(line)
    if (e?.type !== 'start') return false
    await stop('seek')
    void follow($, e.gameId, settings).catch(() => undefined)
    return true
  }).catch(() => undefined)
  void (async () => {
    const status = await streamLines($, 'seek', SEEK_URL, token, async () => undefined, gameForm(settings))
    const note = status === undefined ? { kind: 'needsCurl' as const } : refusal({ ok: status < 400, status, text: '' })
    if (!note || !(await read($, view)).seeking) return
    await stop('events')
    await update($, view, v => ({ ...v, seeking: undefined, gameNote: note }))
  })().catch(() => undefined)
  return undefined
}

/** Withdraws a seek: closing its request is how Lichess hears it. */
export async function cancelSeek($: $) {
  // Not seeking first, so that the seek's end reads as cancelled and not as a failure.
  await update($, view, v => ({ ...v, seeking: undefined, gameNote: undefined }))
  await stop('seek', 'events')
}

/** Leaves the game for the puzzles, and stops reading it. */
export async function leaveGame($: $) {
  followed = undefined
  tick?.cancel()
  tick = undefined
  await stop('game', 'seek', 'events')
  await update($, view, v => ({ ...v, game: undefined, seeking: undefined, gameNote: undefined }))
}

/** Another game with the same settings: the same Stockfish, or a new seek. */
export async function playAgain($: $): Promise<GameNote | undefined> {
  const { game } = await read($, view)
  return game?.settings ? startGame($, game.settings) : undefined
}

/** A game of the account still on at Lichess, followed again; at the start of a session. */
export async function resumeGame($: $) {
  const token = await storedToken($)
  if (!token || (await read($, view)).game) return
  try {
    const res = await $.http.fetch(PLAYING_URL, { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
    const id = res.ok ? readPlaying(res.text) : undefined
    if (id) void follow($, id).catch(() => undefined)
  } catch (err) {
    $.ui.log(`chess-break: no game to resume (${err instanceof Error ? err.message : String(err)})`, { to: 'debug' })
  }
}

async function send($: $, url: string): Promise<GameNote | undefined> {
  const token = await storedToken($)
  if (!token) return { kind: 'signIn' }
  const res = await $.http
    .fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
    .catch(err => ({ ok: false, status: 0, text: err instanceof Error ? err.message : String(err) }))
  return refusal(res)
}

/**
 * Applies a click or a typed move to the game, and sends the move it makes. A move Lichess
 * refuses goes back off the board. Resolves why nothing was played, or undefined.
 */
export async function gameMove($: $, step: (g: Game) => { game: Game; uci?: string; note?: GameNote }): Promise<GameNote | undefined> {
  const { game } = await read($, view)
  if (!game) return undefined
  const r = step(game)
  await update($, view, v => (v.game?.id === game.id ? { ...v, game: r.game, gameNote: r.note } : v))
  if (!r.uci) return r.note
  const note = await send($, moveUrl(game.id, r.uci))
  if (note) await update($, view, v => (v.game?.id === game.id && v.game.pending === r.uci ? { ...v, game: rollBack(v.game), gameNote: note } : v))
  return note
}

/** Resigns on the second press within three seconds; the first one asks. */
export async function resign($: $): Promise<GameNote | undefined> {
  const { game } = await read($, view)
  if (!game || !isOn(game)) return undefined
  const now = await $.clock.now()
  if (!game.resignAsked || now - game.resignAsked > 3000) {
    await update($, view, v => (v.game?.id === game.id ? { ...v, game: { ...v.game, resignAsked: now }, gameNote: { kind: 'confirmResign' as const } } : v))
    return { kind: 'confirmResign' }
  }
  return noted($, await send($, actionUrl(game.id, 'resign')))
}

/** Offers a draw or accepts the opponent's (yes), or declines it. */
export async function draw($: $, yes: boolean): Promise<GameNote | undefined> {
  const { game } = await read($, view)
  if (!game || !isOn(game)) return undefined
  return noted($, await send($, drawUrl(game.id, yes)))
}

export async function abort($: $): Promise<GameNote | undefined> {
  const { game } = await read($, view)
  if (!game || !isOn(game)) return undefined
  if (!canAbort(game)) return noted($, { kind: 'cannotAbort' })
  return noted($, await send($, actionUrl(game.id, 'abort')))
}
