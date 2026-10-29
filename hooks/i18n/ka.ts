import { EN_THEMES } from './en'
import { humanize } from './messages'
import type { Messages } from './messages'
import type { Ending } from '../training/game'

// Themes with a settled Georgian name; the others keep Lichess's English one until a speaker checks them.
const THEMES: Record<string, string> = {
  mix: 'შერეული', fork: 'ჩანგალი', pin: 'შეკვრა', doubleCheck: 'ორმაგი ქიში', sacrifice: 'მსხვერპლი',
  mate: 'მატი', mateIn1: 'მატი 1 სვლით', mateIn2: 'მატი 2 სვლით', mateIn3: 'მატი 3 სვლით', mateIn4: 'მატი 4 სვლით',
  mateIn5: 'მატი 5+ სვლით', backRankMate: 'მატი უკანა ხაზზე', opening: 'დებიუტი', middlegame: 'შუათამაში',
  endgame: 'ენდშპილი', rookEndgame: 'ეტლების ენდშპილი', pawnEndgame: 'პაიკების ენდშპილი', bishopEndgame: 'კუების ენდშპილი',
  knightEndgame: 'მხედრების ენდშპილი', queenEndgame: 'ლაზიერების ენდშპილი', zugzwang: 'ცუგცვანგი', promotion: 'გადაქცევა',
  castling: 'როქი',
}

// Instrumental: „გაიარე მხედრით“.
const PIECES: Record<string, string> = { p: 'პაიკით', n: 'მხედრით', b: 'კუთი', r: 'ეტლით', q: 'ლაზიერით', k: 'მეფით' }

const GROUPS: Record<string, string> = { tactics: 'ტაქტიკა', mates: 'მატები', phases: 'თამაშის ეტაპები', ideas: 'იდეები' }

const ENDINGS: Record<Ending, string> = { mate: ': მატი', resign: ': დანებება', time: ': დრო ამოიწურა', left: ': მოწინააღმდეგე წავიდა', stalemate: ': პატი', draw: '', aborted: '', other: '' }

export const ka: Messages = {
  side: s => (s === 'w' ? 'თეთრები' : 'შავები'),
  source: s => (s === 'lichess' ? 'Lichess' : s === 'chesscom' ? 'Chess.com' : 'ოფლაინ ნაკრები'),
  piece: p => PIECES[p] ?? 'ფიგურით',
  theme: key => THEMES[key] ?? EN_THEMES[key] ?? humanize(key),
  group: key => GROUPS[key] ?? humanize(key),
  feedback(f, solver) {
    const forMe = solver === 'w' ? 'თეთრებისთვის' : 'შავებისთვის'
    const them = ka.side(solver === 'w' ? 'b' : 'w')
    switch (f.kind) {
      case 'start':
        return f.lastSan ? `${them} ითამაშეს ${f.lastSan}. იპოვე საუკეთესო სვლა ${forMe}.` : `იპოვე საუკეთესო სვლა ${forMe}.`
      case 'right':
        return `${f.san}, გააგრძელე.`
      case 'reply':
        return `${them} პასუხობენ ${f.san}. შენი სვლაა.`
      case 'wrong':
        return `${f.san} სწორი სვლა არ არის. სცადე კიდევ.`
      case 'illegal':
        return `„${f.text}“ აქ ვერ ითამაშება.`
      case 'command':
        return `„${f.text}“ ბრძანებაა: Esc აბრუნებს ბრძანების ველში.`
      case 'hint':
        return `გაიარე ${ka.piece(f.piece)} ${f.square}-დან.`
      case 'solved':
        return f.isClean ? 'ამოხსნილია!' : 'ამოხსნილია დახმარებით: ამოცანა გასამეორებლად დაბრუნდება.'
      case 'revealed':
        return `${f.line.length ? `${f.line.join(' ')}. ` : ''}ამოცანა გასამეორებლად დაბრუნდება.`
    }
  },
  pane: {
    toPlay: s => `${s === 'w' ? 'თეთრების' : 'შავების'} სვლაა`,
    review: 'გამეორება',
    session: 'სესია',
    streak: (streak, best) => `სერია ${streak} · რეკორდი ${best}`,
    dueCount: n => `${n} ამოცანა გასამეორებლად`,
    noneDue: 'გასამეორებელი არაფერია',
    hint: 'მინიშნება',
    show: 'ამოხსნა',
    skip: 'შემდეგი',
    analyse: 'ანალიზი',
    promoteTo: 'გადაქცევა',
    moveField: 'შენი სვლა: e2e4, Nf3…',
    noMove: 'ასე დაწყებული წესიერი სვლა არ არსებობს',
    loading: 'ამოცანა იტვირთება…',
    offlineFallback: (source, why) => `${source} მიუწვდომელია (${why}): ჯერჯერობით ოფლაინ ამოცანები.`,
    dailyPuzzle: 'დღის ამოცანა',
    retry: 'ხელახლა',
    explain: 'ახსნა',
    practise: name => `ივარჯიშე: ${name} ↗`,
    explaining: 'Claude ათვალიერებს…',
    explainFailed: why => `ახსნა ვერ მივიღე (${why}).`,
    statusHint: '/chess-break <სვლა> ან გახსნა',
    signIn: 'შესვლა',
    signInTitle: 'შესვლა Lichess-ზე რეიტინგული ამოცანებისა და პარტიებისთვის',
    openLichess: 'დაადასტურე Lichess-ზე ↗',
    starting: 'იწყება…',
    orPaste: 'ან ჩასვი პირადი ტოკენი (ამოცანებისა და პარტიების უფლებით) და დააჭირე Enter-ს:',
    createToken: 'ტოკენის შექმნა ↗',
    cancel: 'გაუქმება',
    signInFailed: why => `შესვლა ვერ მოხერხდა (${why}).`,
    tokenStays: 'ტოკენი ამ კომპიუტერზე რჩება და საუბარში არ ხვდება.',
    signOut: 'გასვლა',
  },
  game: {
    newGame: 'ახალი პარტია',
    stockfish: level => `Stockfish, დონე ${level}`,
    person: 'ადამიანთან',
    anonymous: 'ანონიმი',
    rated: 'სარეიტინგო',
    casual: 'ამხანაგური',
    searching: (clock, rated) => `ვეძებთ მოწინააღმდეგეს (${clock}, ${rated ? 'სარეიტინგო' : 'ამხანაგური'})…`,
    yourMove: 'შენი სვლაა',
    theirMove: 'მოწინააღმდეგის სვლაა',
    over: (outcome, ending) => (ending === 'aborted' ? 'პარტია შეწყდა.' : `${outcome === 'win' ? 'მოიგე' : outcome === 'loss' ? 'წააგე' : 'ფრე'}${ENDINGS[ending]}.`),
    drawOffered: 'მოწინააღმდეგე ფრეს გთავაზობს.',
    drawYours: 'შენი ფრეს შეთავაზება პასუხს ელოდება.',
    accept: 'მიღება',
    decline: 'უარი',
    resign: 'დანებება',
    offerDraw: 'ფრეს შეთავაზება',
    abort: 'შეწყვეტა',
    playAgain: 'კიდევ ერთი',
    puzzles: 'ამოცანები',
    note(n) {
      switch (n.kind) {
        case 'signIn': return 'პარტიებისთვის Lichess-ის ანგარიშია საჭირო: /chess-break login.'
        case 'renewSignIn': return 'Lichess-მა უარი თქვა: ხელახლა შედი, რომ შესვლა პარტიებსაც მოიცავდეს (🔑).'
        case 'needsCurl': return 'პარტიებისთვის curl არის საჭირო და ის ვერ მოიძებნა. ამოცანები მის გარეშეც მუშაობს.'
        case 'limited': return 'Lichess გთხოვს შენელებას: მოიცადე ერთი წუთი.'
        case 'notYourTurn': return 'ახლა მოწინააღმდეგის სვლაა.'
        case 'cannotAbort': return 'ორივე მხარემ უკვე იარა: ახლა მხოლოდ დანებება შეიძლება.'
        case 'confirmResign': return 'დასანებებლად კიდევ ერთხელ დააჭირე „დანებებას“.'
        case 'reconnecting': return 'კავშირი გაწყდა, ხელახლა ვუკავშირდებით…'
        case 'illegal': return `„${n.text}“ აქ ვერ ითამაშება.`
        case 'refused': return `Lichess-მა უარი თქვა: ${n.text}.`
        case 'failed': return `Lichess მიუწვდომელია (${n.text}).`
      }
    },
  },
  command: {
    description: 'ჭადრაკის ტაქტიკის ვარჯიში: პანელის გახსნა, თემის არჩევა, პროგრესის ნახვა',
    usage: '[<სვლა>|hint|solution|explain|next|theme <თემა>|themes|source lichess|chesscom|offline|stats|review|play stockfish|human|resign|draw|abort|login|logout|account|lang auto|en|fr|ru|ka]',
    opened: 'სავარჯიშო პანელი გაიხსნა.',
    next: 'ახალი ამოცანა.',
    noPuzzle: 'ამოცანა არ არის. გახსენი: /chess-break.',
    explainLater: 'ახსნა ამოცანის დასრულების შემდეგ იქნება.',
    themeSet: name => `ვარჯიში: ${name}. შემდეგი ამოცანა ამ თემაზე იქნება.`,
    unknownTheme: typed => `თემა „${typed}“ არ არსებობს. სია: /chess-break themes.`,
    themesTitle: 'თემები /chess-break theme <თემა> ბრძანებისთვის (ან mix):',
    statsHead: (streak, best, due) => `სერია ${streak}, რეკორდი ${best}. ${due}.`,
    weakest: (name, key) => `ყველაზე სუსტი: ${name}. სცადე /chess-break theme ${key}.`,
    noStats: 'ამოცანები ჯერ არ არის. გახსენი პანელი: /chess-break.',
    reviewDue: due => `${due}: შემდეგი ამოცანები ესენი იქნება.`,
    reviewNone: 'გასამეორებელი არაფერია. გამოტოვებული ამოცანები აქ მეორე დღეს ბრუნდება.',
    langSet: lang => `ენა: ${lang}.`,
    sourceSet: name => `ამოცანები: ${name}.`,
    noThemesOnChesscom: 'Chess.com-ის ამოცანებს თემები არ აქვს: თემა მოქმედებს Lichess-ით ან ოფლაინ ნაკრებით.',
    claudeDoneFinish: 'Claude-მა დაასრულა. დაამთავრე ამოცანა.',
    loginStarted: url => `დაადასტურე Lichess-ზე: ${url}\nან ჩასვი პირადი ტოკენი პანელში.`,
    loginNoListener: 'შესვლის მიმღები ვერ ჩაირთო (საჭიროა python3): ჩასვი ტოკენი პანელში.',
    noTokenInCommand: 'ტოკენს ბრძანებაში ნუ ჩაწერ — საუბარში მოხვდება. ჩასვი პანელში.',
    signedIn: (name, rating) => `შესული ხარ როგორც ${name}${rating ? `, ამოცანების რეიტინგი ${rating}` : ''}.`,
    notSignedIn: 'არ ხარ შესული. /chess-break login — რეიტინგული ამოცანებისთვის.',
    loggedOut: 'გამოხვედი; ტოკენი Lichess-ზე გაუქმდა.',
    playUsage: '/chess-break play stockfish [1-8] [კონტროლი] [white|black|random] ან play human [კონტროლი] [rated]',
    badLevel: 'Stockfish-ის დონეები 1-დან 8-მდეა.',
    badClock: clocks => `დროის კონტროლი Stockfish-თან: ${clocks}.`,
    badSeekClock: clocks => `Lichess ასეთ აპებს მოწინააღმდეგეს მხოლოდ რაპიდსა და კლასიკაში უძებნის: ${clocks}.`,
    aiStarted: (level, clock) => `პარტია Stockfish-თან, დონე ${level} (${clock}), პანელშია.`,
    seekStarted: (clock, rated) => `ვეძებთ მოწინააღმდეგეს (${clock}, ${rated ? 'სარეიტინგო' : 'ამხანაგური'}): პარტია პანელში გაიხსნება.`,
    noGame: 'პარტია არ მიმდინარეობს. /chess-break play stockfish ან play human.',
    resigned: 'დანებდი.',
    drawOffered: 'ფრე შეთავაზებულია.',
    drawAccepted: 'ფრე მიღებულია.',
    drawDeclined: 'ფრეზე უარი ითქვა.',
    aborted: 'პარტია შეწყდა.',
    gameGoesOn: 'Claude-მა დაასრულა. შენი პარტია გრძელდება.',
  },
}
