import { expect, test } from 'claude-code/testing'

import { beep } from '../hooks/training/beep'

test('a beep is a mono 8-bit WAV as long as asked', () => {
  const bytes = Uint8Array.from(atob(beep(880, 150)), c => c.charCodeAt(0))
  const view = new DataView(bytes.buffer)
  const text = (at: number) => String.fromCharCode(...bytes.slice(at, at + 4))
  expect(text(0)).toBe('RIFF')
  expect(text(8)).toBe('WAVE')
  expect(view.getUint16(22, true)).toBe(1)
  expect(view.getUint16(34, true)).toBe(8)
  const rate = view.getUint32(24, true)
  expect(view.getUint32(40, true)).toBe(rate * 0.15)
  expect(bytes.length).toBe(44 + rate * 0.15)
})
