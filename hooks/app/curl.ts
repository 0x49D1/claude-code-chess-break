import type { HookStream, ProcessSpawnChunk, ProcessSpawnResult } from 'claude-code'

import type { $ } from './state'

type Child = HookStream<ProcessSpawnChunk, ProcessSpawnResult>

/** The curl children: the followed game's stream, and a seek with the event stream that announces its game. */
const children: { game?: Child; seek?: Child; events?: Child } = {}

export async function hasCurl($: $): Promise<boolean> {
  return $.process.run(['curl', '--version']).then(r => r.exitCode === 0, () => false)
}

/**
 * Reads a long-lived Lichess answer line by line through curl, the token on stdin so that no
 * process list shows it. `onLine` answering true ends the reading. Resolves the HTTP status once
 * the answer ends (0 when none came), or undefined when curl could not start.
 */
export async function streamLines($: $, slot: keyof typeof children, url: string, token: string, onLine: (line: string) => Promise<boolean | void>, form?: string) {
  const config = [`header = "Authorization: Bearer ${token}"`, 'header = "Accept: application/x-ndjson"', ...(form ? [`data = "${form}"`] : []), ''].join('\n')
  const child = $.process.spawn({ argv: ['curl', '-sSN', '--write-out', '%{stderr}HTTP %{http_code}\\n', '--config', '-', url], input: config })
  children[slot] = child
  let buffer = ''
  let errors = ''
  try {
    reading: for await (const { stream, text } of child) {
      if (stream === 'stderr') {
        errors += text
        continue
      }
      buffer += text
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) if (line.trim() && (await onLine(line))) break reading
    }
  } catch {
    return undefined
  } finally {
    if (children[slot] === child) children[slot] = undefined
  }
  return Number(errors.match(/HTTP (\d{3})/)?.[1] ?? 0)
}

export async function stop(...slots: (keyof typeof children)[]) {
  for (const slot of slots) {
    const child = children[slot]
    children[slot] = undefined
    await child?.return(undefined as never).catch(() => undefined)
  }
}
