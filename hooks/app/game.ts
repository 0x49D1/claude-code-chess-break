import { atom, read, update } from 'claude-code'

import type { Game, GameNote, GameSettings } from '../../types'
import { START, line } from '../chess/position'
import { playerName } from '../i18n'
import { AI_URL, EVENT_URL, SEEK_URL, actionUrl, drawUrl, gameForm, moveUrl, readGameEvent, streamUrl, takebackUrl } from '../lichess/game'
import { beep } from '../training/beep'
import { GAME_DEFAULTS, applyState, canAbort, clockLeft, fromFull, isCorrespondence, isMyTurn, isOn, rollBack } from '../training/game'
import { storedAccount, storedToken } from './account'
import { hasCurl, stop, streamLines } from './curl'
import { INITIAL_VIEW, PANE, messagesOf, settings as options } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

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

function startTick($: $) {
  tick?.cancel()
  tick = $.clock.every(1000, () => void moveClocks($).catch(() => undefined))
}

const LOW_TIME = 30_000

/** Moves the clocks on, and beeps once a live game when the person's clock drops under 30 s. */
async function moveClocks($: $) {
  const now = await $.clock.now()
  const v = await update($, view, x => (x.game && isOn(x.game) ? { ...x, game: { ...x.game, now } } : x))
  const g = v.game
  if (!g || !isOn(g) || g.isCorrespondence || g.isLowTimeWarned) return
  const left = clockLeft(g)
  if ((g.side === 'w' ? left.white : left.black) >= LOW_TIME) return
  await update($, view, x => (x.game?.id === g.id ? { ...x, game: { ...x.game, isLowTimeWarned: true } } : x))
  void sound($, 880)
}

/** A beep where the host plays sounds; a host that cannot is no error. */
function sound($: $, frequency: number) {
  return $.audio.play({ base64: beep(frequency, 150), mime: 'audio/wav' }).catch(() => undefined)
}

/**
 * What a new state of the game shown asks of the mod: the opponent's move told when the pane is
 * hidden, and a person's takeback request declined, once per request.
 */
async function answerState($: $, before: Game, after: Game) {
  const opponent = before.side === 'w' ? 'b' : 'w'
  const theirs = after.side === 'w' ? after.black : after.white
  if (after.takebackOffer === opponent && before.takebackOffer !== opponent && !theirs.aiLevel) await send($, takebackUrl(after.id, false))
  const moved = after.moves.length > before.moves.length && (after.moves.length % 2 === 1 ? 'w' : 'b') === opponent
  if (!moved || (await $.ui.panes()).some(p => p.id === PANE && p.isShown)) return
  const san = line(START, after.moves)?.at(-1)?.san ?? after.moves.at(-1) ?? ''
  const v = await read($, view)
  $.ui.toast(`♞ ${messagesOf(v).game.opponentPlayed(playerName(messagesOf(v), theirs), san)}`)
  if (options.gameSound) void sound($, 660)
}

/**
 * Follows a game's stream into the pane until it ends: a dropped stream is reopened after 1, 2,
 * 4… up to 30 seconds, a minute when Lichess asks to slow down. The stream's first line gives the
 * whole game again, so a reconnect needs nothing kept.
 */
export async function follow($: $, id: string, settings?: GameSettings) {
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
      const before = (await read($, view)).game
      const v = await update($, view, x => {
        if (e.type === 'full') return { ...x, seeking: undefined, gameNote: undefined, game: fromFull(e, username, settings ?? x.game?.settings, now) }
        if (x.game?.id !== id) return x
        const game = applyState(x.game, e.state, now)
        // The list knows the move is made before its next read.
        return { ...x, gameNote: undefined, game, games: x.games?.map(s => (s.id === id ? { ...s, isMyTurn: isMyTurn(game) } : s)) }
      })
      if (e.type === 'state' && before?.id === id && v.game?.id === id) await answerState($, before, v.game)
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

/** The choices a game was last started with, one set per kind, for the setup screen. */
export type GameChoices = { ai?: Extract<GameSettings, { kind: 'ai' }>; seek?: Extract<GameSettings, { kind: 'seek' }> }

export async function storedChoices($: $): Promise<GameChoices> {
  const stored = (await $.store.get('gameChoices')) as GameChoices | undefined
  return { ai: stored?.ai?.kind === 'ai' ? stored.ai : undefined, seek: stored?.seek?.kind === 'seek' ? stored.seek : undefined }
}

async function post($: $, url: string, token: string, form: string) {
  return $.http
    .fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: form,
    })
    .catch(err => ({ ok: false, status: 0, text: err instanceof Error ? err.message : String(err) }))
}

/**
 * Starts a game against Stockfish, or seeks a person: the event stream says when Lichess paired
 * a live seek, and a correspondence seek waits in Lichess's lobby on its own. A second live game
 * is refused; correspondence games are not, and leave a live game on the pane. Resolves why it
 * could not start or what became of it, or undefined once it is on its way.
 */
export async function startGame($: $, settings: GameSettings): Promise<GameNote | undefined> {
  const token = await storedToken($)
  if (!token) return noted($, { kind: 'signIn' })
  const slow = isCorrespondence(settings)
  const { game } = await read($, view)
  const isLiveOn = !!game && isOn(game) && !game.isCorrespondence
  if (isLiveOn && !slow) return noted($, { kind: 'finishLiveFirst' })
  if (!slow && !(await hasCurl($))) return noted($, { kind: 'needsCurl' })
  await $.store.set('gameChoices', { ...(await storedChoices($)), [settings.kind]: settings })
  if (settings.kind === 'seek' && slow) {
    const note = refusal(await post($, SEEK_URL, token, gameForm(settings)))
    return noted($, note ?? { kind: 'seekPosted' })
  }
  if (!isLiveOn) await leaveGame($)
  if (settings.kind === 'ai') {
    const res = await post($, AI_URL, token, gameForm(settings))
    const note = refusal(res)
    if (note) return noted($, note)
    const id = (JSON.parse(res.text) as { id?: string }).id
    if (!id) return noted($, { kind: 'failed', text: 'no game' })
    if (!isLiveOn) void follow($, id, settings).catch(() => undefined)
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
  await update($, view, v => ({ ...v, game: undefined, seeking: undefined, gameNote: undefined, replayPly: undefined }))
}

/** Shows a game of the list, its stream followed in place of the game shown. */
export async function showGame($: $, id: string) {
  await leaveGame($)
  void follow($, id).catch(() => undefined)
}

/** Opens the setup screen for a kind of game, filled with the choices it was last started with. */
export async function openSetup($: $, kind: GameSettings['kind']) {
  const setup = (await storedChoices($))[kind] ?? GAME_DEFAULTS[kind]
  await update($, view, v => ({ ...v, setup, gameNote: undefined }))
}

// A live seek pairs a real person, whose clock starts at once: the pane asks before it is sent.
const needsConfirming = (s: GameSettings) => s.kind === 'seek' && !isCorrespondence(s)

/** ▶ Play on the setup screen, and its confirmation for a live game against a person. */
export async function playSetup($: $): Promise<GameNote | undefined> {
  const { setup, isConfirming } = await read($, view)
  if (!setup) return undefined
  if (needsConfirming(setup) && !isConfirming) {
    await update($, view, v => ({ ...v, isConfirming: true }))
    return undefined
  }
  await update($, view, v => ({ ...v, setup: undefined, isConfirming: undefined }))
  return startGame($, setup)
}

/** Another game with the same settings: the same Stockfish, or a new seek once confirmed. */
export async function playAgain($: $): Promise<GameNote | undefined> {
  const { game } = await read($, view)
  if (!game?.settings) return undefined
  const settings = game.settings
  if (!needsConfirming(settings)) return startGame($, settings)
  await update($, view, v => ({ ...v, setup: settings, isConfirming: true }))
  return undefined
}

export async function send($: $, url: string): Promise<GameNote | undefined> {
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

/** Takes the last move back, against Stockfish only. */
export async function takeback($: $): Promise<GameNote | undefined> {
  const { game } = await read($, view)
  if (!game || !isOn(game)) return undefined
  const opponent = game.side === 'w' ? game.black : game.white
  if (!opponent.aiLevel) return noted($, { kind: 'takebackStockfishOnly' })
  return noted($, await send($, takebackUrl(game.id, true)))
}
