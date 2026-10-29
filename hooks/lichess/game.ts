import type { GameSettings, Player } from '../../types'

const LICHESS = 'https://lichess.org'

/** The clocks offered against Stockfish, as `minutes+increment`. */
export const AI_CLOCKS = ['3+2', '5+3', '10+0', '10+5', '15+10', '30+0']

/** The clocks a seek may have: Lichess pairs apps like this one at rapid and classical only. */
export const SEEK_CLOCKS = ['10+0', '10+5', '15+10', '30+0', '30+20']

export const AI_URL = `${LICHESS}/api/challenge/ai`
export const SEEK_URL = `${LICHESS}/api/board/seek`
export const EVENT_URL = `${LICHESS}/api/stream/event`
export const PLAYING_URL = `${LICHESS}/api/account/playing`
export const gameUrl = (id: string) => `${LICHESS}/${id}`
export const streamUrl = (id: string) => `${LICHESS}/api/board/game/stream/${id}`
export const moveUrl = (id: string, uci: string) => `${LICHESS}/api/board/game/${id}/move/${uci}`
export const actionUrl = (id: string, action: 'resign' | 'abort') => `${LICHESS}/api/board/game/${id}/${action}`
export const drawUrl = (id: string, yes: boolean) => `${LICHESS}/api/board/game/${id}/draw/${yes ? 'yes' : 'no'}`

/** `5+3` → 5 minutes and 3 seconds a move. */
export function readClock(clock: string): { minutes: number; increment: number } {
  const [minutes, increment] = clock.split('+').map(Number)
  return { minutes: minutes ?? 0, increment: increment ?? 0 }
}

/** The form of a challenge to Stockfish, or of a seek. */
export function gameForm(settings: GameSettings): string {
  const { minutes, increment } = readClock(settings.clock)
  if (settings.kind === 'ai') {
    return new URLSearchParams({
      level: String(settings.level),
      'clock.limit': String(minutes * 60),
      'clock.increment': String(increment),
      color: settings.color,
    }).toString()
  }
  return new URLSearchParams({ rated: String(settings.rated), time: String(minutes), increment: String(increment), variant: 'standard' }).toString()
}

/** The moves, clocks and outcome of a game, as one of its stream's lines gives them. */
export type GameState = {
  moves: string[]
  wtime: number
  btime: number
  status: string
  winner?: 'w' | 'b'
  /** Who offers a draw, when someone does. */
  drawOffer?: 'w' | 'b'
}

export type GameEvent =
  | { type: 'full'; id: string; white: Player & { id?: string }; black: Player & { id?: string }; isRated: boolean; state: GameState }
  | { type: 'state'; state: GameState }
  | { type: 'start'; gameId: string }

type RawPlayer = { id?: string; name?: string; rating?: number; aiLevel?: number }
type RawState = { moves?: string; wtime?: number; btime?: number; status?: string; winner?: string; wdraw?: boolean; bdraw?: boolean }

const readPlayer = (p: RawPlayer | undefined): Player & { id?: string } => ({ id: p?.id, name: p?.name, rating: p?.rating, aiLevel: p?.aiLevel })

function readState(s: RawState): GameState {
  return {
    moves: String(s.moves ?? '').split(' ').filter(Boolean),
    wtime: s.wtime ?? 0,
    btime: s.btime ?? 0,
    status: s.status ?? 'started',
    winner: s.winner === 'white' ? 'w' : s.winner === 'black' ? 'b' : undefined,
    drawOffer: s.wdraw ? 'w' : s.bdraw ? 'b' : undefined,
  }
}

/**
 * A line of a game stream or of the event stream, read; undefined for the ones the mod has no use
 * for (keep-alive blank lines, chat, the opponent gone, errors).
 */
export function readGameEvent(line: string): GameEvent | undefined {
  let json: { type?: string; id?: string; white?: RawPlayer; black?: RawPlayer; rated?: boolean; state?: RawState; game?: { gameId?: string; id?: string } } & RawState
  try {
    json = JSON.parse(line)
  } catch {
    return undefined
  }
  switch (json.type) {
    case 'gameFull':
      if (!json.id || !json.state) return undefined
      return { type: 'full', id: json.id, white: readPlayer(json.white), black: readPlayer(json.black), isRated: !!json.rated, state: readState(json.state) }
    case 'gameState':
      return { type: 'state', state: readState(json) }
    case 'gameStart': {
      const gameId = json.game?.gameId ?? json.game?.id
      return gameId ? { type: 'start', gameId } : undefined
    }
    default:
      return undefined
  }
}

/** The first game under way on the account, from /api/account/playing. */
export function readPlaying(text: string): string | undefined {
  const body = JSON.parse(text) as { nowPlaying?: { gameId?: string; fullId?: string }[] }
  return body.nowPlaying?.find(g => g.gameId)?.gameId
}
