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

export type View = {
  attempt?: Attempt
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
  /** How each puzzle of this session went, in order. */
  session: ('clean' | 'missed')[]
  isClaudeWorking: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'chess-break': { view: View }
  }
}
