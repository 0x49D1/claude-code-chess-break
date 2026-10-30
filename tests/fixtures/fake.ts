import { mock } from 'claude-code/testing'
import type { On, ProcessSpawnChunk } from 'claude-code'
import type { Engine } from 'claude-code/testing'

// Lichess faked for the tests that play: its answers, its curl streams, a signed-in account.

/** A form's fields, as a plain object. */
export function fields(form: string | undefined) {
  const out: Record<string, string> = {}
  new URLSearchParams(form).forEach((value, key) => (out[key] = value))
  return out
}

export const PANE = {
  plugin: 'chess-break',
  component: 'Pane',
  requestId: 'chess-break',
  props: {
    title: '♞ chess-break',
    isFocused: true,
    bodyColumns: 60,
    placement: 'inline' as 'dock' | 'inline',
    scroll: { offset: 0, bodyRows: 24 },
    view: {},
  },
} as const

export const command = (args: string) => ({ command: 'chess-break', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 120 } })

export const full = (moves = '', extra: object = {}) =>
  JSON.stringify({
    type: 'gameFull', id: 'g4m3', rated: false,
    white: { id: 'magnus', name: 'magnus', rating: 1500 }, black: { aiLevel: 3 },
    clock: { initial: 600000, increment: 0 },
    state: { type: 'gameState', moves, wtime: 600000, btime: 600000, status: 'started', ...extra },
  })
export const state = (moves: string, extra: object = {}) => JSON.stringify({ type: 'gameState', moves, wtime: 590000, btime: 595000, status: 'started', ...extra })

/** A curl child's output, fed by the test: lines, then the HTTP status curl writes at the end. */
export function feed() {
  const queue: (ProcessSpawnChunk | null)[] = []
  let wake = () => undefined as void
  const put = (c: ProcessSpawnChunk | null) => {
    queue.push(c)
    wake()
  }
  return {
    line: (text: string) => put({ stream: 'stdout', text: `${text}\n` }),
    /** A piece as curl's write cut it: a line may end in the next one. */
    raw: (text: string) => put({ stream: 'stdout', text }),
    end: (status = 200) => {
      put({ stream: 'stderr', text: `HTTP ${status}\n` })
      put(null)
    },
    /** The pieces until the end, or until the child is killed (`signal`), as curl would stop. */
    async *chunks(signal: AbortSignal) {
      signal.addEventListener('abort', () => wake())
      for (;;) {
        while (!queue.length && !signal.aborted) await new Promise<void>(resolve => (wake = resolve))
        if (signal.aborted) return
        const c = queue.shift()!
        if (c === null) return
        yield c
      }
    },
  }
}

export type Call = { method: string; url: string; auth?: string; body?: string }

/**
 * Lichess from memory. Short answers come from `answers` by the end of the address; each curl
 * child gets a feed of its own, kept by address in order, with its argv and stdin.
 */
export function lichess(on: On, answers: Record<string, { status: number; text: string }> = {}, panes: unknown[] = []) {
  const calls: Call[] = []
  const spawned: { argv: readonly string[]; input?: string; feed: ReturnType<typeof feed>; killed: AbortSignal }[] = []
  let hasCurl = true
  on('ui.status', async () => ({ value: undefined }))
  on('ui.panes', async () => ({ value: panes as never }))
  on('ui.open', async () => ({ value: { isPlaced: true } as never }))
  on('process.run', async () => {
    if (!hasCurl) throw new Error('ENOENT')
    return { value: { exitCode: 0, stdout: 'curl 8.5.0', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('process.spawn', async function* (_$, e, next) {
    const f = feed()
    spawned.push({ argv: e.argv, input: e.input, feed: f, killed: next.signal })
    for await (const chunk of f.chunks(next.signal)) yield chunk
    return { value: { code: 0, signal: null } }
  })
  on('http.fetch', async (_$, e) => {
    const call = { method: e.init?.method ?? 'GET', url: e.url, auth: e.init?.headers?.Authorization, body: e.init?.body }
    calls.push(call)
    const key = Object.keys(answers).find(k => e.url.endsWith(k))
    const a = key ? answers[key]! : { status: 200, text: '{"ok":true}' }
    return { value: { status: a.status, ok: a.status < 400, headers: {}, text: a.text } }
  })
  /** The curl children opened on an address ending so, oldest first. */
  const streams = (end: string) => spawned.filter(s => String(s.argv.at(-1)).endsWith(end))
  /** Lichess ends whatever is still open, a game as aborted, so that nothing outlives the test. */
  const endAll = () => {
    for (const s of spawned.filter(s => !s.killed.aborted)) {
      s.feed.line(state('', { status: 'aborted' }))
      s.feed.end()
    }
  }
  return { calls, spawned, streams, endAll, noCurl: () => (hasCurl = false) }
}

/**
 * Signed in as Magnus, the store kept in `store` for the test to read; resolves a wait that
 * moves the clock on until `until` holds.
 */
export function signedIn(on: On, token = 'lip_good', store: Record<string, unknown> = {}) {
  Object.assign(store, { token, account: { username: 'Magnus' } })
  on('store.get', async (_$, e) => ({ value: store[e.key] }))
  on('store.set', async (_$, e) => ((store[e.key] = e.value), { value: undefined }))
  on('store.delete', async (_$, e) => (delete store[e.key], { value: undefined }))
  on('store.keys', async () => ({ value: Object.keys(store) }))
  const clock = mock.clock(on)
  return async (until: () => boolean, ms = 1, steps = 200) => {
    for (let i = 0; i < steps && !until(); i++) await clock.advance(ms)
  }
}

export const AI = { '/api/challenge/ai': { status: 201, text: '{"id":"g4m3"}' } }

/** A game against Stockfish under way, its stream open: resolves the stream and the settle. */
export async function stockfishGame($: Engine, on: On, panes: unknown[] = []) {
  const settle = signedIn(on)
  const fake = lichess(on, AI, panes)
  await $.command.run(command('play stockfish'))
  await settle(() => fake.streams('/stream/g4m3').length > 0)
  const curl = fake.streams('/stream/g4m3')[0]!
  curl.feed.line(full())
  await settle(() => false, 1)
  return { ...fake, curl, settle }
}
