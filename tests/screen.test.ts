import { expect, test } from 'claude-code/testing'

import type { Game, View } from '../types'
import { INITIAL_VIEW } from '../hooks/app/state'
import { screenOf } from '../hooks/training/screen'

const game = (status: string, isCorrespondence = false) => ({ id: 'g', status, isCorrespondence, moves: [] }) as unknown as Game
const view = (v: Partial<View>): View => ({ ...INITIAL_VIEW, ...v })

test('Esc steps back from the screen on top, in the order the pane draws them', () => {
  expect(screenOf(view({}))).toBe('puzzle')
  expect(screenOf(view({ isProgressShown: true }))).toBe('progress')
  expect(screenOf(view({ about: { releases: [] } }))).toBe('about')
  expect(screenOf(view({ setup: { kind: 'ai', level: 3, clock: '10+0', color: 'random' } }))).toBe('setup')
  expect(screenOf(view({ signIn: {}, isProgressShown: true }))).toBe('signIn')
  // A finished game, or a correspondence one, goes back to puzzles; a live game holds the pane.
  expect(screenOf(view({ game: game('mate'), isProgressShown: true }))).toBe('game')
  expect(screenOf(view({ game: game('started', true) }))).toBe('game')
  expect(screenOf(view({ game: game('started'), setup: { kind: 'ai', level: 3, clock: '10+0', color: 'random' } }))).toBe('liveGame')
})
