import { EN_THEMES } from './en'
import { humanize } from './messages'
import type { Messages } from './messages'

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
    statusHint: '/chess-break <სვლა> ან გახსნა',
  },
  command: {
    description: 'ჭადრაკის ტაქტიკის ვარჯიში: პანელის გახსნა, თემის არჩევა, პროგრესის ნახვა',
    usage: '[<სვლა>|hint|solution|next|theme <თემა>|themes|source lichess|chesscom|offline|stats|review|lang auto|en|fr|ru|ka]',
    opened: 'სავარჯიშო პანელი გაიხსნა.',
    next: 'ახალი ამოცანა.',
    noPuzzle: 'ამოცანა არ არის. გახსენი: /chess-break.',
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
  },
}
