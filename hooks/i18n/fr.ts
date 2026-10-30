import { humanize } from './messages'
import type { Messages } from './messages'
import type { Ending } from '../training/game'

// Les noms des thèmes tels que Lichess les donne en français.
const THEMES: Record<string, string> = {
  mix: 'Mélange', fork: 'Fourchette', pin: 'Clouage', skewer: 'Enfilade', discoveredAttack: 'Attaque à la découverte',
  doubleCheck: 'Échec double', sacrifice: 'Sacrifice', deflection: 'Déviation', attraction: 'Attraction', clearance: 'Dégagement',
  interference: 'Interférence', intermezzo: 'Coup intermédiaire', xRayAttack: 'Attaque rayon X', capturingDefender: 'Capture du défenseur',
  hangingPiece: 'Pièce en prise', trappedPiece: 'Pièce piégée', mate: 'Échec et mat', mateIn1: 'Mat en 1', mateIn2: 'Mat en 2',
  mateIn3: 'Mat en 3', mateIn4: 'Mat en 4', mateIn5: 'Mat en 5+', backRankMate: 'Mat du couloir', smotheredMate: 'Mat à l’étouffée',
  arabianMate: 'Mat arabe', hookMate: 'Mat de l’hameçon', anastasiaMate: 'Mat d’Anastasia', bodenMate: 'Mat de Boden',
  doubleBishopMate: 'Mat des deux fous', dovetailMate: 'Mat de Cozio', opening: 'Ouverture', middlegame: 'Milieu de partie',
  endgame: 'Finale', rookEndgame: 'Finale de tours', pawnEndgame: 'Finale de pions', bishopEndgame: 'Finale de fous',
  knightEndgame: 'Finale de cavaliers', queenEndgame: 'Finale de dames', queenRookEndgame: 'Finale dame et tour',
  quietMove: 'Coup tranquille', defensiveMove: 'Coup défensif', zugzwang: 'Zugzwang', exposedKing: 'Roi exposé',
  kingsideAttack: 'Attaque à l’aile roi', queensideAttack: 'Attaque à l’aile dame', advancedPawn: 'Pion avancé',
  promotion: 'Promotion', underPromotion: 'Sous-promotion', enPassant: 'Prise en passant', castling: 'Roque',
  oneMove: 'Problème en un coup', short: 'Problème court', long: 'Problème long', veryLong: 'Problème très long',
  crushing: 'Écrasant', advantage: 'Avantage', equality: 'Égalité', master: 'Partie de maître',
}

const PIECES: Record<string, string> = { p: 'le pion', n: 'le cavalier', b: 'le fou', r: 'la tour', q: 'la dame', k: 'le roi' }

const GROUPS: Record<string, string> = { tactics: 'Tactique', mates: 'Mats', phases: 'Phases de jeu', ideas: 'Idées' }

const ENDINGS: Record<Ending, string> = { mate: ' par mat', resign: ' par abandon', time: ' au temps', left: ' : ton adversaire est parti', stalemate: ' par pat', draw: '', aborted: '', other: '' }

export const fr: Messages = {
  side: s => (s === 'w' ? 'Blancs' : 'Noirs'),
  source: s => (s === 'lichess' ? 'Lichess' : s === 'chesscom' ? 'Chess.com' : 'les puzzles hors ligne'),
  piece: p => PIECES[p] ?? 'la pièce',
  theme: key => THEMES[key] ?? humanize(key),
  group: key => GROUPS[key] ?? humanize(key),
  feedback(f, solver) {
    const me = fr.side(solver)
    const them = fr.side(solver === 'w' ? 'b' : 'w')
    switch (f.kind) {
      case 'start':
        return f.lastSan ? `Les ${them} ont joué ${f.lastSan}. Trouve le meilleur coup pour les ${me}.` : `Trouve le meilleur coup pour les ${me}.`
      case 'right':
        return `${f.san}, continue.`
      case 'reply':
        return `Les ${them} répondent ${f.san}. À toi.`
      case 'wrong':
        return `${f.san} n’est pas le bon coup. Réessaie.`
      case 'illegal':
        return `« ${f.text} » ne peut pas être joué ici.`
      case 'command':
        return `« ${f.text} » est une commande : Échap revient à l’invite.`
      case 'hint':
        return `Joue ${fr.piece(f.piece)} en ${f.square}.`
      case 'solved':
        return f.isClean ? 'Résolu !' : 'Résolu avec de l’aide : il reviendra en révision.'
      case 'revealed':
        return `${f.line.length ? `${f.line.join(' ')}. ` : ''}Il reviendra en révision.`
    }
  },
  pane: {
    toPlay: s => `Aux ${fr.side(s)} de jouer`,
    review: 'Révision',
    session: 'Séance',
    streak: (streak, best) => `Série ${streak} · record ${best}`,
    dueCount: n => `${n} à réviser`,
    noneDue: 'Rien à réviser',
    hint: 'Indice',
    show: 'Solution',
    skip: 'Passer',
    analyse: 'Analyser',
    promoteTo: 'Promotion en',
    moveField: 'ton coup : e2e4, Cf3…',
    noMove: 'Aucun coup légal ne commence ainsi',
    loading: 'Chargement d’un puzzle…',
    offlineFallback: (source, why) => `${source} injoignable (${why}) : puzzles hors ligne en attendant.`,
    dailyPuzzle: 'Puzzle du jour',
    retry: 'Réessayer',
    explain: 'Expliquer',
    practise: name => `S’entraîner : ${name} ↗`,
    explaining: 'Claude regarde…',
    explainFailed: why => {
      switch (why) {
        case 'limit': return 'Claude a atteint ses limites d’usage pour l’instant.'
        case 'busy': return 'Claude est occupé : réessayez plus tard.'
        case 'offline': return 'Claude est injoignable.'
        case 'signedOut': return 'Claude Code n’est pas connecté.'
        case 'empty': return 'Claude n’a rien répondu.'
        case 'refused': return 'La demande à Claude n’a pas été envoyée.'
        case 'other': return 'Claude n’a pas pu l’expliquer cette fois.'
      }
    },
    statusHint: '/chess-break <coup> ou ouvrir',
    signIn: 'Se connecter',
    signInTitle: 'Se connecter à Lichess pour des puzzles et parties classés',
    openLichess: 'Autoriser sur Lichess ↗',
    starting: 'Démarrage…',
    orPaste: 'ou colle un token personnel (droits puzzle et partie), puis Entrée :',
    createToken: 'créer un token ↗',
    cancel: 'Annuler',
    signInFailed: why => `Connexion impossible (${why}).`,
    tokenStays: 'Le token reste sur cette machine, jamais dans la conversation.',
    signOut: 'Se déconnecter',
  },
  game: {
    newGame: 'Nouvelle partie',
    stockfish: level => `Stockfish niveau ${level}`,
    person: 'Une personne',
    anonymous: 'Anonyme',
    rated: 'classée',
    casual: 'amicale',
    searching: (clock, rated) => `Recherche d’un adversaire (${clock}, ${rated ? 'classée' : 'amicale'})…`,
    yourMove: 'À toi de jouer',
    theirMove: 'Au tour de ton adversaire',
    over: (outcome, ending) => (ending === 'aborted' ? 'Partie annulée.' : `${outcome === 'win' ? 'Gagné' : outcome === 'loss' ? 'Perdu' : 'Nulle'}${ENDINGS[ending]}.`),
    drawOffered: 'Ton adversaire propose la nulle.',
    drawYours: 'Ta proposition de nulle attend une réponse.',
    accept: 'Accepter',
    decline: 'Refuser',
    resign: 'Abandonner',
    offerDraw: 'Proposer la nulle',
    abort: 'Annuler la partie',
    playAgain: 'Rejouer',
    puzzles: 'Puzzles',
    level: 'Niveau',
    clock: 'Cadence',
    colour: 'Couleur',
    random: 'Au hasard',
    play: 'Jouer',
    games: 'Parties',
    live: 'en direct',
    takeback: 'Reprendre',
    awaitingCount: n => `${n} partie${n > 1 ? 's' : ''} attend${n > 1 ? 'ent' : ''} ton coup`,
    opponentPlayed: (name, san) => `${name} a joué ${san}`,
    yourMoveAgainst: name => `À toi de jouer contre ${name}.`,
    note(n) {
      switch (n.kind) {
        case 'signIn': return 'Les parties demandent un compte Lichess : /chess-break login.'
        case 'renewSignIn': return 'Lichess a refusé : reconnecte-toi pour que la connexion couvre les parties (🔑).'
        case 'needsCurl': return 'Les parties demandent curl, introuvable ici. Les puzzles marchent sans.'
        case 'limited': return 'Lichess demande de ralentir : attends une minute.'
        case 'notYourTurn': return 'C’est au tour de ton adversaire.'
        case 'cannotAbort': return 'Les deux camps ont joué : la partie ne peut plus qu’être abandonnée.'
        case 'confirmResign': return 'Appuie encore sur abandonner pour abandonner.'
        case 'reconnecting': return 'Connexion perdue, reconnexion…'
        case 'seekPosted': return 'Demande publiée. La partie rejoindra ta liste de parties quand quelqu’un l’acceptera.'
        case 'finishLiveFirst': return 'Termine d’abord la partie en direct.'
        case 'takebackStockfishOnly': return 'On ne reprend un coup que contre Stockfish.'
        case 'illegal': return `« ${n.text} » ne peut pas être joué ici.`
        case 'refused': return `Lichess a refusé : ${n.text}.`
        case 'failed': return `Lichess est injoignable (${n.text}).`
      }
    },
  },
  command: {
    description: 'Entraînement tactique aux échecs : ouvrir le panneau, choisir un thème, voir ses progrès',
    usage: '[<coup>|hint|solution|explain|next|theme <nom>|themes|source lichess|chesscom|offline|stats|review|play stockfish|human|resign|draw|abort|takeback|games|login|logout|account|lang auto|en|fr|ru|ka]',
    opened: 'Panneau d’entraînement ouvert.',
    next: 'Nouveau puzzle.',
    noPuzzle: 'Aucun puzzle en cours. Ouvre-en un avec /chess-break.',
    explainLater: 'L’explication vient une fois le puzzle fini.',
    themeSet: name => `Entraînement : ${name}. Le prochain puzzle porte dessus.`,
    unknownTheme: typed => `Pas de thème « ${typed} ». /chess-break themes les liste.`,
    themesTitle: 'Thèmes pour /chess-break theme <nom> (ou mix) :',
    statsHead: (streak, best, due) => `Série ${streak}, record ${best}. ${due}.`,
    weakest: (name, key) => `Point faible : ${name}. Essaie /chess-break theme ${key}.`,
    noStats: 'Aucun puzzle pour l’instant. Ouvre le panneau avec /chess-break.',
    reviewDue: due => `${due} : les prochains puzzles seront ceux-là.`,
    reviewNone: 'Rien à réviser. Les puzzles manqués reviennent ici le lendemain.',
    langSet: lang => `Langue : ${lang}.`,
    sourceSet: name => `Puzzles : ${name}.`,
    noThemesOnChesscom: 'Les puzzles de Chess.com n’ont pas de thèmes : le thème vaut pour Lichess et les puzzles hors ligne.',
    claudeDoneFinish: 'Claude a terminé. Finis ton puzzle.',
    loginStarted: url => `Autorise sur Lichess : ${url}\nOu colle un token personnel dans le panneau.`,
    loginNoListener: 'Impossible de démarrer l’écoute de connexion (il faut python3) : colle plutôt un token dans le panneau.',
    noTokenInCommand: 'Ne mets pas de token dans une commande, il finirait dans la conversation : colle-le dans le panneau.',
    signedIn: (name, rating) => `Connecté en tant que ${name}${rating ? `, classement puzzle ${rating}` : ''}.`,
    notSignedIn: 'Non connecté. /chess-break login pour des puzzles classés.',
    loggedOut: 'Déconnecté ; le token est révoqué sur Lichess.',
    playUsage: '/chess-break play stockfish [1-8] [cadence|jours] [white|black|random], ou play human [cadence|jours] [rated]',
    badLevel: 'Les niveaux de Stockfish vont de 1 à 8.',
    badClock: clocks => `Cadences contre Stockfish : ${clocks}.`,
    badSeekClock: clocks => `Lichess n’apparie les applis comme celle-ci qu’en rapide et en classique : ${clocks}.`,
    aiStarted: (level, clock) => `Partie contre Stockfish niveau ${level} (${clock}) dans le panneau.`,
    seekStarted: (clock, rated) => `Recherche d’un adversaire (${clock}, ${rated ? 'classée' : 'amicale'}) : la partie s’ouvre dans le panneau.`,
    noGame: 'Pas de partie en cours. /chess-break play stockfish, ou play human.',
    resigned: 'Abandon.',
    drawOffered: 'Nulle proposée.',
    drawAccepted: 'Nulle acceptée.',
    drawDeclined: 'Nulle refusée.',
    aborted: 'Partie annulée.',
    takebackAsked: 'Reprise demandée.',
    gamesNone: 'Aucune partie en cours sur Lichess.',
    gameGoesOn: 'Claude a fini. Ta partie continue.',
  },
}
