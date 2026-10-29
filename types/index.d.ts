export type Locale = 'en' | 'fr' | 'ru' | 'ka'

/** Where puzzles come from: Lichess, Chess.com's daily puzzles, or the set shipped with the mod. */
export type Source = 'lichess' | 'chesscom' | 'offline'

export type Puzzle = {
  id: string
  source: Source
  /** Its page, for a puzzle that has one. */
  url?: string
  /** Chess.com names its daily puzzles. */
  title?: string
  /** The position the solver plays from. */
  fen: string
  /** The line as UCI: the solver's move, the reply, the solver's move... */
  solution: string[]
  themes: string[]
  rating?: number
  /** The opponent's move that led to the position. */
  lastMove?: { uci: string; san: string }
}

/** What the pane says about the attempt; put into words in the person's language when drawn. */
export type Feedback =
  | { kind: 'start'; lastSan?: string }
  | { kind: 'right'; san: string }
  | { kind: 'reply'; san: string }
  | { kind: 'wrong'; san: string }
  | { kind: 'illegal'; text: string }
  /** A slash command typed into the move field instead of the prompt. */
  | { kind: 'command'; text: string }
  | { kind: 'hint'; piece: string; square: string }
  | { kind: 'solved'; isClean: boolean }
  | { kind: 'revealed'; line: string[] }

export type AttemptStatus = 'playing' | 'solved' | 'revealed'

export type Attempt = {
  puzzle: Puzzle
  fen: string
  /** How many moves of the solution are played. */
  ply: number
  /** SAN of every move since the puzzle started, both sides. */
  played: string[]
  /** The solver's wrong moves, as SAN. */
  tried: string[]
  lastMove?: string
  selected?: string
  /** A pawn move to the last rank, as UCI, waiting for its piece. */
  promoting?: string
  hint?: string
  status: AttemptStatus
  hadMistake: boolean
  usedHelp: boolean
  feedback: Feedback
  /** A missed puzzle come back from the review queue. */
  isReview: boolean
  /** Counted in the progress and the review queue. */
  isRecorded: boolean
}

/** A missed puzzle, kept whole so it comes back without the network: its box (0, 1, 2) and when it is due, in epoch ms. */
export type ReviewCard = { box: number; due: number; puzzle: Puzzle }
export type Review = Record<string, ReviewCard>

export type Tally = { solved: number; failed: number }
export type Progress = { themes: Record<string, Tally>; streak: number; best: number }

/** A game to start: Lichess's Stockfish at a level, or a seek for a person; the clock as `minutes+increment`. */
export type GameSettings =
  | { kind: 'ai'; level: number; clock: string; color: 'white' | 'black' | 'random' }
  | { kind: 'seek'; clock: string; rated: boolean }

/** A player as Lichess names them; Stockfish has a level and no name. */
export type Player = { name?: string; rating?: number; aiLevel?: number }

/** What the pane says about a game, put into words when drawn. */
export type GameNote =
  | { kind: 'signIn' | 'renewSignIn' | 'needsCurl' | 'limited' | 'notYourTurn' | 'cannotAbort' | 'confirmResign' | 'reconnecting' }
  | { kind: 'illegal' | 'refused' | 'failed'; text: string }

/** A live Lichess game, as its stream last told it, with the person's move not yet confirmed. */
export type Game = {
  id: string
  /** How it was started, to play another; absent for a game resumed from Lichess. */
  settings?: GameSettings
  side: 'w' | 'b'
  white: Player
  black: Player
  isRated: boolean
  /** Every move as UCI, as Lichess holds them. */
  moves: string[]
  /** The position shown: Lichess's, or after the person's pending move. */
  fen: string
  lastMove?: string
  /** Each side's time left in ms when `at` (epoch ms) came; the side to move's runs from then. */
  clock: { white: number; black: number; at: number }
  /** The time the clocks were last drawn at, moved on every second. */
  now: number
  /** Lichess's status: `started`, `mate`, `resign`, `outoftime`, `draw`, `aborted`… */
  status: string
  winner?: 'w' | 'b'
  drawOffer?: 'w' | 'b'
  selected?: string
  promoting?: string
  /** The person's move sent and not yet in Lichess's moves, as UCI. */
  pending?: string
  /** When resign was first pressed, for the second press. */
  resignAsked?: number
}

export type View = {
  attempt?: Attempt
  /** The Lichess game under way or just ended; puzzles wait behind it. */
  game?: Game
  /** A seek for a person waiting for Lichess to pair it. */
  seeking?: Extract<GameSettings, { kind: 'seek' }>
  /** Why a game did not start, or what the game says now. */
  gameNote?: GameNote
  isLoading: boolean
  locale: Locale
  /** The theme trained: a Lichess theme key, or `mix`. */
  theme: string
  source: Source
  /** Why puzzles come from the offline set for now, when the chosen source failed. */
  fallback?: string
  /** What is typed in the move field, for the suggestions. */
  typed?: string
  dueCount: number
  progress: Progress
  /** The move a finished puzzle is replayed at: 0 its start, played.length its end; undefined the end. */
  replayPly?: number
  /** Claude's explanation of a finished puzzle: asked, given, or failed. */
  explanation?: { puzzleId: string; text?: string; failed?: string }
  /** The Lichess account signed in, its puzzle rating as last known. */
  account?: { username: string; rating?: number }
  /** The last rated result's change to that rating. */
  ratingDiff?: number
  /** A sign-in under way: the address to approve it at once the listener is up, or why it failed. */
  signIn?: { url?: string; failed?: string }
  /** How each puzzle of this session went, in order. */
  session: ('clean' | 'missed')[]
  isClaudeWorking: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'chess-break': { view: View }
  }
}
