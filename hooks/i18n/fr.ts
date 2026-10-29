import { humanize } from './messages'
import type { Messages } from './messages'

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
    statusHint: '/chess-break <coup> ou ouvrir',
  },
  command: {
    description: 'Entraînement tactique aux échecs : ouvrir le panneau, choisir un thème, voir ses progrès',
    usage: '[<coup>|hint|solution|next|theme <nom>|themes|source lichess|chesscom|offline|stats|review|lang auto|en|fr|ru|ka]',
    opened: 'Panneau d’entraînement ouvert.',
    next: 'Nouveau puzzle.',
    noPuzzle: 'Aucun puzzle en cours. Ouvre-en un avec /chess-break.',
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
  },
}
