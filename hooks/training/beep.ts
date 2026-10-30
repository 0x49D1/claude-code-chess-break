const RATE = 8000

/** A short tone as a mono 8-bit WAV in base64, for `$.audio.play`, so no sound file ships. */
export function beep(frequency: number, ms: number): string {
  const samples = Math.round((RATE * ms) / 1000)
  const bytes = new Uint8Array(44 + samples)
  const view = new DataView(bytes.buffer)
  const text = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  view.setUint32(4, 36 + samples, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, RATE, true)
  view.setUint32(28, RATE, true) // bytes a second
  view.setUint16(32, 1, true) // bytes a sample
  view.setUint16(34, 8, true)
  text(36, 'data')
  view.setUint32(40, samples, true)
  for (let i = 0; i < samples; i++) bytes[44 + i] = 128 + Math.round(60 * Math.sin((2 * Math.PI * frequency * i) / RATE))
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}
