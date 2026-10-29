import { describe, expect, test } from 'claude-code/testing'

import { START, checkedKing, completions, readMove, replay } from '../hooks/chess/position'

describe('reading moves', () => {
  test('UCI, SAN and French SAN, in any case', () => {
    for (const typed of ['g1f3', 'G1F3', 'Nf3', 'nf3', 'NF3', 'Cf3', 'cf3']) expect(readMove(START, typed)?.san).toBe('Nf3')
    expect(readMove(START, 'E4')?.san).toBe('e4')
    expect(readMove(START, 'e5')).toBeUndefined()
  })

  test('a spelling two moves share is refused', () => {
    const both = '4k3/8/8/8/2p5/1P6/8/4KB2 w - - 0 1'
    expect(readMove(both, 'bxc4')?.san).toBe('bxc4')
    expect(readMove(both, 'Bxc4')?.san).toBe('Bxc4')
    expect(readMove(both, 'BXC4')).toBeUndefined()
  })

  test('promotion and castling', () => {
    expect(readMove('8/5P1k/8/8/8/8/8/K7 w - - 0 1', 'f8=N')?.promotion).toBe('n')
    expect(readMove('8/5P1k/8/8/8/8/8/K7 w - - 0 1', 'f7f8')?.promotion).toBe('q')
    expect(readMove('4k3/8/8/8/8/8/8/4K2R w K - 0 1', 'o-o')?.san).toBe('O-O')
  })
})

test('completions of what is typed so far', () => {
  expect(completions(START, 'N').sort()).toEqual(['Na3', 'Nc3', 'Nf3', 'Nh3'])
  expect(completions(START, 'cf')).toEqual(['Nf3'])
  expect(completions(START, 'e2').sort()).toEqual(['e3', 'e4'])
  expect(completions(START, 'Qh')).toEqual([])
})

test('a game replayed from SAN, and the king in check', () => {
  const game = replay(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'])
  expect(game?.last?.san).toBe('Qxf7#')
  expect(checkedKing(game!.fen)).toBe('e8')
  expect(replay(['e4', 'e4'])).toBeUndefined()
})
