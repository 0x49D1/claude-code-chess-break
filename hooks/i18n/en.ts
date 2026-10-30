import { humanize } from './messages'
import type { Messages } from './messages'
import type { Ending } from '../training/game'

// Lichess's own English names for its themes.
export const EN_THEMES: Record<string, string> = {
  mix: 'Mix', fork: 'Fork', pin: 'Pin', skewer: 'Skewer', discoveredAttack: 'Discovered attack', doubleCheck: 'Double check',
  sacrifice: 'Sacrifice', deflection: 'Deflection', attraction: 'Attraction', clearance: 'Clearance', interference: 'Interference',
  intermezzo: 'Intermezzo', xRayAttack: 'X-Ray attack', capturingDefender: 'Capture the defender', hangingPiece: 'Hanging piece',
  trappedPiece: 'Trapped piece', mate: 'Checkmate', mateIn1: 'Mate in 1', mateIn2: 'Mate in 2', mateIn3: 'Mate in 3',
  mateIn4: 'Mate in 4', mateIn5: 'Mate in 5+', backRankMate: 'Back rank mate', smotheredMate: 'Smothered mate',
  arabianMate: 'Arabian mate', hookMate: 'Hook mate', anastasiaMate: 'Anastasia’s mate', bodenMate: 'Boden’s mate',
  doubleBishopMate: 'Double bishop mate', dovetailMate: 'Dovetail mate', opening: 'Opening', middlegame: 'Middlegame',
  endgame: 'Endgame', rookEndgame: 'Rook endgame', pawnEndgame: 'Pawn endgame', bishopEndgame: 'Bishop endgame',
  knightEndgame: 'Knight endgame', queenEndgame: 'Queen endgame', queenRookEndgame: 'Queen and rook', quietMove: 'Quiet move',
  defensiveMove: 'Defensive move', zugzwang: 'Zugzwang', exposedKing: 'Exposed king', kingsideAttack: 'Kingside attack',
  queensideAttack: 'Queenside attack', advancedPawn: 'Advanced pawn', promotion: 'Promotion', underPromotion: 'Underpromotion',
  enPassant: 'En passant', castling: 'Castling', oneMove: 'One-move puzzle', short: 'Short puzzle', long: 'Long puzzle',
  veryLong: 'Very long puzzle', crushing: 'Crushing', advantage: 'Advantage', equality: 'Equality', master: 'Master game',
}

const PIECES: Record<string, string> = { p: 'the pawn', n: 'the knight', b: 'the bishop', r: 'the rook', q: 'the queen', k: 'the king' }

const GROUPS: Record<string, string> = { tactics: 'Tactics', mates: 'Mates', phases: 'Game phases', ideas: 'Ideas' }

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const ENDINGS: Record<Ending, string> = { mate: ' by checkmate', resign: ' by resignation', time: ' on time', left: ': your opponent left', stalemate: ' by stalemate', draw: '', aborted: '', other: '' }

export const en: Messages = {
  side: s => (s === 'w' ? 'White' : 'Black'),
  source: s => (s === 'lichess' ? 'Lichess' : s === 'chesscom' ? 'Chess.com' : 'the offline set'),
  piece: p => PIECES[p] ?? 'the piece',
  theme: key => EN_THEMES[key] ?? humanize(key),
  group: key => GROUPS[key] ?? humanize(key),
  feedback(f, solver) {
    const me = en.side(solver)
    const them = en.side(solver === 'w' ? 'b' : 'w')
    switch (f.kind) {
      case 'start':
        return f.lastSan ? `${them} played ${f.lastSan}. Find the best move for ${me}.` : `Find the best move for ${me}.`
      case 'right':
        return `${f.san}, keep going.`
      case 'reply':
        return `${them} answers ${f.san}. Your move.`
      case 'wrong':
        return `${f.san} isn't it. Try again.`
      case 'illegal':
        return `“${f.text}” can't be played here.`
      case 'command':
        return `“${f.text}” is a command: Esc returns to the prompt.`
      case 'hint':
        return `Move ${en.piece(f.piece)} on ${f.square}.`
      case 'solved':
        return f.isClean ? 'Solved!' : 'Solved with help: it will come back for review.'
      case 'revealed':
        return `${f.line.length ? `${f.line.join(' ')}. ` : ''}It will come back for review.`
    }
  },
  pane: {
    toPlay: s => `${en.side(s)} to play`,
    review: 'Review',
    session: 'Session',
    streak: (streak, best) => `Streak ${streak} · best ${best}`,
    dueCount: n => `${plural(n, 'puzzle', 'puzzles')} to review`,
    noneDue: 'Nothing to review',
    hint: 'Hint',
    show: 'Solution',
    skip: 'Skip',
    analyse: 'Analyse',
    promoteTo: 'Promote to',
    moveField: 'your move: e2e4, Nf3…',
    noMove: 'No legal move starts like this',
    loading: 'Loading a puzzle…',
    offlineFallback: (source, why) => `${source} can't be reached (${why}): puzzles from the offline set for now.`,
    dailyPuzzle: 'Daily puzzle',
    retry: 'Retry',
    explain: 'Explain',
    practise: (name: string) => `Practise ${name} ↗`,
    explaining: 'Claude is looking at it…',
    explainFailed: why => {
      switch (why) {
        case 'limit': return 'Claude is out of usage limits for now.'
        case 'busy': return 'Claude is busy: try again later.'
        case 'offline': return 'Claude could not be reached.'
        case 'signedOut': return 'Claude Code is not signed in.'
        case 'empty': return 'Claude gave no answer.'
        case 'refused': return 'The request to Claude was not sent.'
        case 'other': return 'Claude could not explain it this time.'
      }
    },
    statusHint: '/chess-break <move> or open',
    signIn: 'Sign in',
    signInTitle: 'Sign in to Lichess for rated puzzles and games',
    openLichess: 'Approve on Lichess ↗',
    starting: 'Starting…',
    orPaste: 'or paste a personal token (puzzle and board permissions), then Enter:',
    createToken: 'create a token ↗',
    cancel: 'Cancel',
    signInFailed: (why: string) => `Sign-in failed (${why}).`,
    tokenStays: 'The token stays on this machine, never in the conversation.',
    signOut: 'Sign out',
  },
  game: {
    newGame: 'New game',
    stockfish: level => `Stockfish level ${level}`,
    person: 'A person',
    anonymous: 'Anonymous',
    rated: 'rated',
    casual: 'casual',
    searching: (clock, rated) => `Looking for an opponent (${clock}, ${rated ? 'rated' : 'casual'})…`,
    yourMove: 'Your move',
    theirMove: 'Your opponent’s move',
    over: (outcome, ending) => (ending === 'aborted' ? 'Game aborted.' : `${outcome === 'win' ? 'You won' : outcome === 'loss' ? 'You lost' : 'Draw'}${ENDINGS[ending]}.`),
    drawOffered: 'Your opponent offers a draw.',
    drawYours: 'Your draw offer is waiting for an answer.',
    accept: 'Accept',
    decline: 'Decline',
    resign: 'Resign',
    offerDraw: 'Offer a draw',
    abort: 'Abort',
    playAgain: 'Play again',
    puzzles: 'Puzzles',
    level: 'Level',
    clock: 'Clock',
    colour: 'Colour',
    random: 'Random',
    play: 'Play',
    confirmSeek: (clock, rated) => `This looks for a real opponent on Lichess now: a live ${clock} game, ${rated ? 'rated' : 'casual'}. Their clock and yours start as soon as someone accepts.`,
    findOpponent: 'Find an opponent',
    games: 'Games',
    live: 'live',
    takeback: 'Take back',
    awaitingCount: n => `${n} game${n === 1 ? '' : 's'} await${n === 1 ? 's' : ''} your move`,
    opponentPlayed: (name, san) => `${name} played ${san}`,
    yourMoveAgainst: name => `Your move against ${name}.`,
    note(n) {
      switch (n.kind) {
        case 'signIn': return 'Games need a Lichess account: /chess-break login.'
        case 'renewSignIn': return 'Lichess refused: sign in again so that the sign-in covers games (🔑).'
        case 'needsCurl': return 'Games need curl, which was not found. Puzzles work without it.'
        case 'limited': return 'Lichess asks to slow down: wait a minute.'
        case 'notYourTurn': return 'It’s your opponent’s move.'
        case 'cannotAbort': return 'Both sides have moved: the game can only be resigned now.'
        case 'confirmResign': return 'Press resign again to resign.'
        case 'reconnecting': return 'Connection lost, reconnecting…'
        case 'seekPosted': return 'Seek posted. The game joins your games list once someone accepts it.'
        case 'finishLiveFirst': return 'Finish the live game first.'
        case 'takebackStockfishOnly': return 'Takebacks are only against Stockfish.'
        case 'illegal': return `“${n.text}” can't be played here.`
        case 'refused': return `Lichess refused: ${n.text}.`
        case 'failed': return `Lichess can't be reached (${n.text}).`
      }
    },
  },
  command: {
    description: 'Chess tactics training: open the pane, pick a theme, see your progress',
    usage: '[<move>|hint|solution|explain|next|theme <name>|themes|source lichess|chesscom|offline|stats|review|play stockfish|human|resign|draw|abort|takeback|games|login|logout|account|lang auto|en|fr|ru|ka]',
    opened: 'Training pane opened.',
    next: 'New puzzle.',
    noPuzzle: 'No puzzle under way. Open one with /chess-break.',
    explainLater: 'Explanations come once the puzzle ends.',
    themeSet: name => `Training: ${name}. The next puzzle is on it.`,
    unknownTheme: typed => `No theme “${typed}”. /chess-break themes lists them.`,
    themesTitle: 'Themes for /chess-break theme <name> (or mix):',
    statsHead: (streak, best, due) => `Streak ${streak}, best ${best}. ${due}.`,
    weakest: (name, key) => `Weakest: ${name}. Try /chess-break theme ${key}.`,
    noStats: 'No puzzles yet. Open the pane with /chess-break.',
    reviewDue: due => `${due}: the next puzzles are those.`,
    reviewNone: 'Nothing to review. Missed puzzles come back here a day later.',
    langSet: lang => `Language: ${lang}.`,
    sourceSet: name => `Puzzles from ${name}.`,
    noThemesOnChesscom: 'Chess.com’s puzzles have no themes: the theme applies with Lichess or the offline set.',
    claudeDoneFinish: 'Claude is done. Finish your puzzle.',
    loginStarted: (url: string) => `Approve on Lichess: ${url}\nOr paste a personal token in the pane.`,
    loginNoListener: 'The sign-in listener could not start (it needs python3): paste a personal token in the pane instead.',
    noTokenInCommand: 'Don’t put a token in a command, it would end up in the conversation: paste it in the pane.',
    signedIn: (name: string, rating?: number) => `Signed in as ${name}${rating ? `, puzzle rating ${rating}` : ''}.`,
    notSignedIn: 'Not signed in. /chess-break login for rated puzzles.',
    loggedOut: 'Signed out; the token is revoked on Lichess.',
    playUsage: '/chess-break play stockfish [1-8] [clock|days] [white|black|random], or play human [clock|days] [rated]',
    badLevel: 'Stockfish levels go from 1 to 8.',
    badClock: clocks => `Clocks against Stockfish: ${clocks}.`,
    badSeekClock: clocks => `Lichess pairs apps like this one at rapid and classical only: ${clocks}.`,
    aiStarted: (level, clock) => `Game against Stockfish level ${level} (${clock}) in the pane.`,
    seekStarted: (clock, rated) => `Looking for an opponent (${clock}, ${rated ? 'rated' : 'casual'}): the game opens in the pane.`,
    noGame: 'No game under way. /chess-break play stockfish, or play human.',
    resigned: 'Resigned.',
    drawOffered: 'Draw offered.',
    drawAccepted: 'Draw accepted.',
    drawDeclined: 'Draw declined.',
    aborted: 'Game aborted.',
    takebackAsked: 'Takeback asked.',
    gamesNone: 'No games on at Lichess.',
    gameGoesOn: 'Claude is done. Your game goes on.',
  },
}
