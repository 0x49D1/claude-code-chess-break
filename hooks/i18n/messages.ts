import type { Feedback, GameNote, Source } from '../../types'
import type { Ending } from '../training/game'

export type Side = 'w' | 'b'

/** Every text the mod shows, in one language. Emojis are the pane's, not the language's. */
export type Messages = {
  side: (side: Side) => string
  source: (source: Source) => string
  piece: (letter: string) => string
  theme: (key: string) => string
  group: (key: string) => string
  feedback: (f: Feedback, solver: Side) => string
  pane: {
    toPlay: (side: Side) => string
    review: string
    session: string
    streak: (streak: number, best: number) => string
    dueCount: (n: number) => string
    noneDue: string
    hint: string
    show: string
    skip: string
    analyse: string
    promoteTo: string
    moveField: string
    noMove: string
    loading: string
    offlineFallback: (source: string, why: string) => string
    dailyPuzzle: string
    retry: string
    explain: string
    practise: (theme: string) => string
    explaining: string
    explainFailed: (why: string) => string
    statusHint: string
    signIn: string
    signInTitle: string
    openLichess: string
    starting: string
    orPaste: string
    createToken: string
    cancel: string
    signInFailed: (why: string) => string
    tokenStays: string
    signOut: string
  }
  game: {
    newGame: string
    stockfish: (level: number) => string
    person: string
    anonymous: string
    rated: string
    casual: string
    searching: (clock: string, rated: boolean) => string
    yourMove: string
    theirMove: string
    over: (outcome: 'win' | 'loss' | 'draw', ending: Ending) => string
    drawOffered: string
    drawYours: string
    accept: string
    decline: string
    resign: string
    offerDraw: string
    abort: string
    playAgain: string
    puzzles: string
    note: (n: GameNote) => string
  }
  command: {
    description: string
    usage: string
    opened: string
    next: string
    noPuzzle: string
    explainLater: string
    themeSet: (name: string) => string
    unknownTheme: (typed: string) => string
    themesTitle: string
    statsHead: (streak: number, best: number, due: string) => string
    weakest: (name: string, key: string) => string
    noStats: string
    reviewDue: (due: string) => string
    reviewNone: string
    langSet: (lang: string) => string
    sourceSet: (name: string) => string
    noThemesOnChesscom: string
    claudeDoneFinish: string
    loginStarted: (url: string) => string
    loginNoListener: string
    noTokenInCommand: string
    signedIn: (name: string, rating?: number) => string
    notSignedIn: string
    loggedOut: string
    playUsage: string
    badLevel: string
    badClock: (clocks: string) => string
    badSeekClock: (clocks: string) => string
    aiStarted: (level: number, clock: string) => string
    seekStarted: (clock: string, rated: boolean) => string
    noGame: string
    resigned: string
    drawOffered: string
    drawAccepted: string
    drawDeclined: string
    aborted: string
    gameGoesOn: string
  }
}

/** A Lichess theme key with no name here: `queenRookEndgame` → `Queen rook endgame`. */
export function humanize(key: string): string {
  const words = key.replace(/([a-z])([A-Z0-9])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
