import type { GameSettings, GameSummary, Player } from '../../types'

const LICHESS = 'https://lichess.org'

/** The clocks offered against Stockfish, as `minutes+increment`. */
export const AI_CLOCKS = ['3+2', '5+3', '10+0', '10+5', '15+10', '30+0']

/** The clocks a seek may have: Lichess pairs apps like this one at rapid and classical only. */
export const SEEK_CLOCKS = ['10+0', '10+5', '15+10', '30+0', '30+20']

/** Days per move, for a correspondence game against either. */
export const DAYS = ['1d', '2d', '3d', '5d', '7d', '10d', '14d']

export const AI_URL = `${LICHESS}/api/challenge/ai`
export const SEEK_URL = `${LICHESS}/api/board/seek`
export const EVENT_URL = `${LICHESS}/api/stream/event`
export const PLAYING_URL = `${LICHESS}/api/account/playing`
export const gameUrl = (id: string) => `${LICHESS}/${id}`
export const streamUrl = (id: string) => `${LICHESS}/api/board/game/stream/${id}`
export const moveUrl = (id: string, uci: string) => `${LICHESS}/api/board/game/${id}/move/${uci}`
export const actionUrl = (id: string, action: 'resign' | 'abort') => `${LICHESS}/api/board/game/${id}/${action}`
export const takebackUrl = (id: string, yes: boolean) => `${LICHESS}/api/board/game/${id}/takeback/${yes ? 'yes' : 'no'}`
export const drawUrl = (id: string, yes: boolean) => `${LICHESS}/api/board/game/${id}/draw/${yes ? 'yes' : 'no'}`

/** `5+3` → 5 minutes and 3 seconds a move; `3d` → 3 days a move. */
export function readClock(clock: string): { minutes: number; increment: number } | { days: number } {
  if (clock.endsWith('d')) return { days: parseInt(clock, 10) }
  const [minutes, increment] = clock.split('+').map(Number)
  return { minutes: minutes ?? 0, increment: increment ?? 0 }
}

/** The form of a challenge to Stockfish, or of a seek. */
export function gameForm(settings: GameSettings): string {
  const clock = readClock(settings.clock)
  if (settings.kind === 'ai') {
    const time: Record<string, string> = 'days' in clock ? { days: String(clock.days) } : { 'clock.limit': String(clock.minutes * 60), 'clock.increment': String(clock.increment) }
    return new URLSearchParams({ level: String(settings.level), ...time, color: settings.color }).toString()
  }
  const time: Record<string, string> = 'days' in clock ? { days: String(clock.days) } : { time: String(clock.minutes), increment: String(clock.increment) }
  return new URLSearchParams({ rated: String(settings.rated), ...time, variant: 'standard' }).toString()
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
  /** Who asks for a takeback, when someone does. */
  takebackOffer?: 'w' | 'b'
}

export type GameEvent =
  | { type: 'full'; id: string; white: Player & { id?: string }; black: Player & { id?: string }; isRated: boolean; isCorrespondence: boolean; state: GameState }
  | { type: 'state'; state: GameState }
  | { type: 'start'; gameId: string }

type RawPlayer = { id?: string; name?: string; rating?: number; aiLevel?: number }
type RawState = { moves?: string; wtime?: number; btime?: number; status?: string; winner?: string; wdraw?: boolean; bdraw?: boolean; wtakeback?: boolean; btakeback?: boolean }

const readPlayer = (p: RawPlayer | undefined): Player & { id?: string } => ({ id: p?.id, name: p?.name, rating: p?.rating, aiLevel: p?.aiLevel })

function readState(s: RawState): GameState {
  return {
    moves: String(s.moves ?? '').split(' ').filter(Boolean),
    wtime: s.wtime ?? 0,
    btime: s.btime ?? 0,
    status: s.status ?? 'started',
    winner: s.winner === 'white' ? 'w' : s.winner === 'black' ? 'b' : undefined,
    drawOffer: s.wdraw ? 'w' : s.bdraw ? 'b' : undefined,
    takebackOffer: s.wtakeback ? 'w' : s.btakeback ? 'b' : undefined,
  }
}

/**
 * A line of a game stream or of the event stream, read; undefined for the ones the mod has no use
 * for (keep-alive blank lines, chat, the opponent gone, errors).
 */
export function readGameEvent(line: string): GameEvent | undefined {
  let json: { type?: string; id?: string; speed?: string; white?: RawPlayer; black?: RawPlayer; rated?: boolean; state?: RawState; game?: { gameId?: string; id?: string } } & RawState
  try {
    json = JSON.parse(line)
  } catch {
    return undefined
  }
  switch (json.type) {
    case 'gameFull':
      if (!json.id || !json.state) return undefined
      return { type: 'full', id: json.id, white: readPlayer(json.white), black: readPlayer(json.black), isRated: !!json.rated, isCorrespondence: json.speed === 'correspondence', state: readState(json.state) }
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

type RawSummary = {
  gameId?: string
  fen?: string
  color?: string
  speed?: string
  rated?: boolean
  isMyTurn?: boolean
  secondsLeft?: number
  opponent?: { username?: string; rating?: number; ai?: number }
}

/** Every game of the account on at Lichess, from /api/account/playing; entries without an id left out. */
export function readPlaying(text: string): GameSummary[] {
  const body = JSON.parse(text) as { nowPlaying?: RawSummary[] }
  return (body.nowPlaying ?? []).flatMap(g => {
    if (!g.gameId) return []
    // Stockfish has a level and no name, as in a game's stream.
    const ai = g.opponent?.ai
    return [{
      id: g.gameId,
      fen: g.fen ?? '',
      side: g.color === 'black' ? 'b' : 'w',
      opponent: ai ? { aiLevel: ai } : { name: g.opponent?.username, rating: g.opponent?.rating },
      isMyTurn: !!g.isMyTurn,
      secondsLeft: g.secondsLeft,
      isCorrespondence: g.speed === 'correspondence',
      isRated: !!g.rated,
    }]
  })
}
