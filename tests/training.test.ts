import { describe, expect, test } from 'claude-code/testing'

import type { Feedback, Puzzle } from '../types'
import { LOCALES, messagesFor, pickLocale } from '../hooks/i18n'
import { analysisUrl, parsePuzzle } from '../hooks/lichess/client'
import { click, hint, isClean, isStarted, moveLine, play, promote, reply, reveal, start } from '../hooks/training/attempt'
import { NO_PROGRESS, recordProgress, themeLines, weakest } from '../hooks/training/progress'
import { dueIds, recordReview } from '../hooks/training/review'

const DAY = 24 * 60 * 60 * 1000

/** Mate in 2 by deflection: Qe8+ Rxe8 Rxe8#. */
const DEFLECT: Puzzle = {
  id: 'deflect',
  fen: 'r5k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 23',
  solution: ['e2e8', 'a8e8', 'e1e8'],
  themes: ['mateIn2', 'deflection', 'short'],
}

describe('the Lichess answer', () => {
  test('replays the game to the puzzle position and keeps the last move', () => {
    const p = parsePuzzle({
      game: { pgn: 'e4 e5 Bc4 Nc6 Qf3 d6' },
      puzzle: { id: 'abc12', rating: 900, themes: ['mateIn1'], solution: ['f3f7'], initialPly: 5 },
    })
    expect(p.lastMove).toEqual({ uci: 'd7d6', san: 'd6' })
    expect(p.fen.split(' ')[1]).toBe('w')
  })

  test('an answer it cannot use is an error', () => {
    expect(() => parsePuzzle({ puzzle: { id: 'x' } })).toThrow()
    expect(() => parsePuzzle({ game: { pgn: 'e4 e5' }, puzzle: { id: 'x', solution: ['a1a8'] } })).toThrow(/x/)
  })

  test('the analysis link', () => {
    expect(analysisUrl('8/8/8/8/8/8/8/K6k b - - 0 1', 'b')).toBe('https://lichess.org/analysis/8/8/8/8/8/8/8/K6k_b_-_-_0_1?color=black')
  })
})

describe('an attempt', () => {
  test('right moves, the reply, the end', () => {
    let a = start(DEFLECT, false)
    expect(isStarted(a)).toBe(false)
    a = play(a, 'Qe7')
    expect(a.feedback).toEqual({ kind: 'wrong', san: 'Qe7' })
    expect(isStarted(a)).toBe(true)
    a = reply(play(a, 'Qe8+'))
    expect(a.feedback).toEqual({ kind: 'reply', san: 'Rxe8' })
    a = play(a, 're8')
    expect(a.status).toBe('solved')
    expect(isClean(a)).toBe(false)
    expect(moveLine(a)).toBe('23. Qe8+ Rxe8 24. Rxe8#')
  })

  test('clicks select, move or let go', () => {
    let a = click(start(DEFLECT, false), 'e2')
    expect(a.selected).toBe('e2')
    expect(click(a, 'h3').selected).toBeUndefined()
    expect(click(a, 'h3').hadMistake).toBe(false)
    a = click(a, 'e8')
    expect(a.played).toEqual(['Qe8+'])
  })

  test('a promotion waits for its piece', () => {
    const p: Puzzle = { id: 'promo', fen: '8/5P1k/8/8/8/8/8/K7 w - - 0 1', solution: ['f7f8n'], themes: ['underPromotion'] }
    let a = click(click(start(p, false), 'f7'), 'f8')
    expect(a.promoting).toBe('f7f8')
    a = promote(a, 'n')
    expect(a.status).toBe('solved')
    expect(isClean(a)).toBe(true)
  })

  test('hint and reveal count as help', () => {
    const h = hint(start(DEFLECT, false))
    expect(h.feedback).toEqual({ kind: 'hint', piece: 'q', square: 'e2' })
    const r = reveal(h)
    expect(r.feedback).toEqual({ kind: 'revealed', line: ['Qe8+', 'Rxe8', 'Rxe8#'] })
    expect(r.usedHelp).toBe(true)
  })
})

describe('the review queue', () => {
  test('a miss comes back tomorrow, then after 3 and 7 days, then it is learned', () => {
    let review = recordReview({}, 'p1', false, 0)
    expect(dueIds(review, DAY - 1)).toEqual([])
    expect(dueIds(review, DAY)).toEqual(['p1'])
    review = recordReview(review, 'p1', true, DAY)
    expect(review.p1).toEqual({ box: 1, due: 4 * DAY })
    review = recordReview(review, 'p1', true, 4 * DAY)
    expect(review.p1).toEqual({ box: 2, due: 11 * DAY })
    review = recordReview(review, 'p1', true, 11 * DAY)
    expect(review).toEqual({})
  })

  test('a miss under review starts over; a clean first try is not queued', () => {
    const review = recordReview({ p1: { box: 2, due: 0 } }, 'p1', false, 5)
    expect(review.p1).toEqual({ box: 0, due: 5 + DAY })
    expect(recordReview({}, 'p2', true, 0)).toEqual({})
  })

  test('the longest waiting comes first', () => {
    expect(dueIds({ a: { box: 0, due: 5 }, b: { box: 1, due: 2 }, c: { box: 0, due: 99 } }, 10)).toEqual(['b', 'a'])
  })
})

test('progress by theme, the streak, the weakest theme', () => {
  let p = recordProgress(NO_PROGRESS, ['fork', 'short'], true)
  p = recordProgress(p, ['fork'], true)
  p = recordProgress(p, ['pin'], false)
  for (let i = 0; i < 3; i++) p = recordProgress(p, ['pin', 'fork'], i === 0)
  expect(p.themes.short).toBeUndefined()
  expect(themeLines(p).map(l => `${l.theme} ${l.solved}/${l.failed} ${l.accuracy}%`)).toEqual(['fork 3/2 60%', 'pin 1/3 25%'])
  expect(weakest(p)?.theme).toBe('pin')
  expect(p.streak).toBe(0)
  expect(p.best).toBe(2)
})

describe('languages', () => {
  test('picked from the choice, the settings, then the locale', () => {
    expect(pickLocale([undefined, 'auto', undefined, 'ru_RU.UTF-8'])).toBe('ru')
    expect(pickLocale([undefined, 'auto', 'Русский'])).toBe('ru')
    expect(pickLocale([undefined, 'auto', 'georgian', 'fr_FR.UTF-8'])).toBe('ka')
    expect(pickLocale([undefined, undefined, undefined, 'ka_GE.UTF-8'])).toBe('ka')
    expect(pickLocale(['fr', 'ru'])).toBe('fr')
    expect(pickLocale([undefined, 'de_DE.UTF-8'])).toBe('en')
  })

  test('Russian counts in its three forms', () => {
    expect([1, 2, 5, 11, 21, 22, 25].map(n => messagesFor('ru').pane.dueCount(n))).toEqual([
      '1 задача на повторение', '2 задачи на повторение', '5 задач на повторение', '11 задач на повторение',
      '21 задача на повторение', '22 задачи на повторение', '25 задач на повторение',
    ])
  })

  test('every language says every feedback, and themes fall back to English, then to the key', () => {
    const kinds = [
      { kind: 'start', lastSan: 'd6' }, { kind: 'start' }, { kind: 'right', san: 'Qe8+' }, { kind: 'reply', san: 'Rxe8' },
      { kind: 'wrong', san: 'Qe7' }, { kind: 'illegal', text: 'zz' }, { kind: 'hint', piece: 'n', square: 'g1' },
      { kind: 'solved', isClean: true }, { kind: 'solved', isClean: false }, { kind: 'revealed', line: ['Qe8+'] },
    ] satisfies Feedback[]
    for (const locale of LOCALES) {
      for (const f of kinds) expect(messagesFor(locale).feedback(f, 'w').length).toBeGreaterThan(3)
    }
    expect(messagesFor('ka').theme('fork')).toBe('ჩანგალი')
    expect(messagesFor('ka').theme('skewer')).toBe('Skewer')
    expect(messagesFor('ru').theme('someNewTheme')).toBe('Some new theme')
  })
})

