import { humanize } from './messages'
import type { Messages } from './messages'

// Названия тем, как их даёт Lichess по-русски.
const THEMES: Record<string, string> = {
  mix: 'Смесь', fork: 'Вилка', pin: 'Связка', skewer: 'Сквозной удар', discoveredAttack: 'Вскрытое нападение',
  doubleCheck: 'Двойной шах', sacrifice: 'Жертва', deflection: 'Отвлечение', attraction: 'Завлечение', clearance: 'Освобождение',
  interference: 'Перекрытие', intermezzo: 'Промежуточный ход', xRayAttack: 'Рентген', capturingDefender: 'Уничтожение защитника',
  hangingPiece: 'Незащищённая фигура', trappedPiece: 'Пойманная фигура', mate: 'Мат', mateIn1: 'Мат в 1 ход',
  mateIn2: 'Мат в 2 хода', mateIn3: 'Мат в 3 хода', mateIn4: 'Мат в 4 хода', mateIn5: 'Мат в 5+ ходов',
  backRankMate: 'Мат на последней горизонтали', smotheredMate: 'Спёртый мат', arabianMate: 'Арабский мат', hookMate: 'Мат крючком',
  anastasiaMate: 'Мат Анастасии', bodenMate: 'Мат Бодена', doubleBishopMate: 'Мат двумя слонами', dovetailMate: 'Мат «ласточкин хвост»',
  opening: 'Дебют', middlegame: 'Миттельшпиль', endgame: 'Эндшпиль', rookEndgame: 'Ладейный эндшпиль', pawnEndgame: 'Пешечный эндшпиль',
  bishopEndgame: 'Слоновый эндшпиль', knightEndgame: 'Коневой эндшпиль', queenEndgame: 'Ферзевый эндшпиль',
  queenRookEndgame: 'Ферзь и ладья', quietMove: 'Тихий ход', defensiveMove: 'Защитный ход', zugzwang: 'Цугцванг',
  exposedKing: 'Раскрытый король', kingsideAttack: 'Атака на королевском фланге', queensideAttack: 'Атака на ферзевом фланге',
  advancedPawn: 'Продвинутая пешка', promotion: 'Превращение', underPromotion: 'Слабое превращение', enPassant: 'Взятие на проходе',
  castling: 'Рокировка', oneMove: 'Задача в один ход', short: 'Короткая задача', long: 'Длинная задача', veryLong: 'Очень длинная задача',
  crushing: 'Решающее преимущество', advantage: 'Преимущество', equality: 'Равенство', master: 'Партия мастера',
}

// Винительный падеж: «сходи конём».
const PIECES: Record<string, string> = { p: 'пешкой', n: 'конём', b: 'слоном', r: 'ладьёй', q: 'ферзём', k: 'королём' }

const GROUPS: Record<string, string> = { tactics: 'Тактика', mates: 'Маты', phases: 'Стадии партии', ideas: 'Идеи' }

/** 1 задача, 2 задачи, 5 задач. */
function plural(n: number, one: string, few: string, many: string) {
  const ten = n % 10
  const hundred = n % 100
  const word = ten === 1 && hundred !== 11 ? one : ten >= 2 && ten <= 4 && (hundred < 12 || hundred > 14) ? few : many
  return `${n} ${word}`
}

export const ru: Messages = {
  side: s => (s === 'w' ? 'Белые' : 'Чёрные'),
  source: s => (s === 'lichess' ? 'Lichess' : s === 'chesscom' ? 'Chess.com' : 'офлайн-набор'),
  piece: p => PIECES[p] ?? 'фигурой',
  theme: key => THEMES[key] ?? humanize(key),
  group: key => GROUPS[key] ?? humanize(key),
  feedback(f, solver) {
    const me = solver === 'w' ? 'белых' : 'чёрных'
    const them = ru.side(solver === 'w' ? 'b' : 'w')
    switch (f.kind) {
      case 'start':
        return f.lastSan ? `${them} сыграли ${f.lastSan}. Найди лучший ход за ${me}.` : `Найди лучший ход за ${me}.`
      case 'right':
        return `${f.san}, продолжай.`
      case 'reply':
        return `${them} отвечают ${f.san}. Твой ход.`
      case 'wrong':
        return `${f.san} — не то. Попробуй ещё раз.`
      case 'illegal':
        return `«${f.text}» здесь сыграть нельзя.`
      case 'command':
        return `«${f.text}» — это команда: Esc возвращает к строке ввода.`
      case 'hint':
        return `Сходи ${ru.piece(f.piece)} с ${f.square}.`
      case 'solved':
        return f.isClean ? 'Решено!' : 'Решено с подсказкой: задача вернётся на повторение.'
      case 'revealed':
        return `${f.line.length ? `${f.line.join(' ')}. ` : ''}Задача вернётся на повторение.`
    }
  },
  pane: {
    toPlay: s => `Ход ${s === 'w' ? 'белых' : 'чёрных'}`,
    review: 'Повторение',
    session: 'Сессия',
    streak: (streak, best) => `Серия ${streak} · рекорд ${best}`,
    dueCount: n => `${plural(n, 'задача', 'задачи', 'задач')} на повторение`,
    noneDue: 'Нечего повторять',
    hint: 'Подсказка',
    show: 'Решение',
    skip: 'Дальше',
    analyse: 'Анализ',
    promoteTo: 'Превратить в',
    moveField: 'твой ход: e2e4, Nf3…',
    noMove: 'Нет легальных ходов, начинающихся так',
    loading: 'Загрузка задачи…',
    offlineFallback: (source, why) => `${source} недоступен (${why}): пока задачи из офлайн-набора.`,
    dailyPuzzle: 'Задача дня',
    retry: 'Повторить',
    explain: 'Объяснить',
    practise: name => `Тренировать: ${name} ↗`,
    explaining: 'Claude разбирается…',
    explainFailed: why => `Объяснения нет (${why}).`,
    statusHint: '/chess-break <ход> или открыть',
  },
  command: {
    description: 'Тренировка шахматной тактики: открыть панель, выбрать тему, посмотреть прогресс',
    usage: '[<ход>|hint|solution|explain|next|theme <тема>|themes|source lichess|chesscom|offline|stats|review|lang auto|en|fr|ru|ka]',
    opened: 'Панель тренировки открыта.',
    next: 'Новая задача.',
    noPuzzle: 'Задачи нет. Открой: /chess-break.',
    explainLater: 'Объяснение — после того, как задача закончится.',
    themeSet: name => `Тренировка: ${name}. Следующая задача — на эту тему.`,
    unknownTheme: typed => `Темы «${typed}» нет. Список: /chess-break themes.`,
    themesTitle: 'Темы для /chess-break theme <тема> (или mix):',
    statsHead: (streak, best, due) => `Серия ${streak}, рекорд ${best}. ${due}.`,
    weakest: (name, key) => `Слабее всего: ${name}. Попробуй /chess-break theme ${key}.`,
    noStats: 'Задач пока нет. Открой панель: /chess-break.',
    reviewDue: due => `${due}: следующими будут они.`,
    reviewNone: 'Повторять нечего. Нерешённые задачи возвращаются сюда на следующий день.',
    langSet: lang => `Язык: ${lang}.`,
    sourceSet: name => `Задачи: ${name}.`,
    noThemesOnChesscom: 'У задач Chess.com нет тем: тема работает с Lichess и офлайн-набором.',
    claudeDoneFinish: 'Claude закончил. Дореши задачу.',
  },
}
