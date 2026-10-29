import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { authorizeUrl, pkce, readAccount, readResult, tokenForm } from '../hooks/lichess/auth'

const PANE = {
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

/** A query's fields, as a plain object. */
function fields(query: URLSearchParams) {
  const out: Record<string, string> = {}
  query.forEach((value, key) => (out[key] = value))
  return out
}

const command = (args: string) => ({ command: 'chess-break', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 120 } })

const SCHOLAR = JSON.stringify({
  game: { pgn: 'e4 e5 Bc4 Nc6 Qf3 d6' },
  puzzle: { id: 'abc12', rating: 900, themes: ['mateIn1'], solution: ['f3f7'], initialPly: 5 },
})

type Call = { method: string; url: string; auth?: string; body?: string }

/** Lichess, answering from memory: the account, puzzles, results, tokens. Keeps every call. */
function lichess(on: On) {
  const calls: Call[] = []
  on('ui.status', async () => ({ value: undefined }))
  on('ui.panes', async () => ({ value: [] }))
  on('ui.open', async () => ({ value: { isPlaced: true } as never }))
  on('http.fetch', async (_$, e) => {
    const call = { method: e.init?.method ?? 'GET', url: e.url, auth: e.init?.headers?.Authorization, body: e.init?.body }
    calls.push(call)
    const ok = (text: string) => ({ value: { status: 200, ok: true, headers: {}, text } })
    if (e.url.endsWith('/api/account')) {
      return call.auth === 'Bearer lip_good' ? ok(JSON.stringify({ username: 'magnus', perfs: { puzzle: { rating: 2100 } } })) : { value: { status: 401, ok: false, headers: {}, text: '' } }
    }
    if (e.url.endsWith('/api/token') && call.method === 'POST') return ok(JSON.stringify({ token_type: 'Bearer', access_token: 'lip_good' }))
    if (e.url.endsWith('/api/token')) return ok('')
    if (e.url.includes('/api/puzzle/batch/')) return ok(JSON.stringify({ glicko: { rating: 2108.4 }, rounds: [{ id: 'abc12', win: true, ratingDiff: 8 }] }))
    return ok(SCHOLAR)
  })
  return calls
}

describe('the sign-in pieces', () => {
  test('PKCE: the challenge is the verifier hashed', async () => {
    const { verifier, challenge, state } = await pkce()
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(state.length).toBeGreaterThan(10)
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
    expect(challenge).toBe(btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''))
  })

  test('the addresses and forms Lichess expects', () => {
    const url = new URL(authorizeUrl(54321, 'chal', 'st8'))
    expect(url.origin + url.pathname).toBe('https://lichess.org/oauth')
    expect(fields(url.searchParams)).toEqual({
      response_type: 'code', client_id: 'chess-break', redirect_uri: 'http://127.0.0.1:54321/',
      code_challenge_method: 'S256', code_challenge: 'chal', scope: 'puzzle:read puzzle:write board:play', state: 'st8',
    })
    expect(fields(new URLSearchParams(tokenForm('c0de', 'ver', 54321)))).toEqual({
      grant_type: 'authorization_code', code: 'c0de', code_verifier: 'ver', redirect_uri: 'http://127.0.0.1:54321/', client_id: 'chess-break',
    })
  })

  test('answers read: the account, a rated result', () => {
    expect(readAccount({ ok: true, status: 200, text: '{"username":"m","perfs":{"puzzle":{"rating":1500}}}' })).toEqual({ username: 'm', rating: 1500 })
    expect(() => readAccount({ ok: false, status: 401, text: '' })).toThrow(/refused/)
    expect(readResult('{"glicko":{"rating":1507.6},"rounds":[{"ratingDiff":7}]}')).toEqual({ rating: 1508, diff: 7 })
  })
})

test('a pasted token signs in; puzzles come from the account and count as rated', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  const calls = lichess(on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'retry' })
  expect(calls.at(-1)?.auth).toBeUndefined()

  // No python3 in a test: the browser way cannot start, the token field stays.
  await ui.press({ key: 'login' })
  expect(await ui.find({ text: /🔑 Sign in to Lichess/ })).toBeDefined()
  await ui.input({ key: 'token', text: 'lip_bad' })
  expect(await ui.find({ text: /Sign-in failed \(token refused\)/ })).toBeDefined()
  await ui.input({ key: 'token', text: '  lip_good ' })
  expect(await ui.find({ text: /👤 magnus · ⭐ 2100/ })).toBeDefined()

  await ui.press({ key: 'next' })
  expect(calls.at(-1)).toMatchObject({ url: expect.stringContaining('/api/puzzle/next'), auth: 'Bearer lip_good' })
  await ui.input({ key: 'move-abc12', text: 'Qxf7#' })
  const result = calls.find(c => c.url.includes('/api/puzzle/batch/mix'))
  expect(result).toMatchObject({ method: 'POST', auth: 'Bearer lip_good' })
  expect(JSON.parse(result!.body!)).toEqual({ solutions: [{ id: 'abc12', win: true, rated: true }] })
  expect(await ui.find({ text: /👤 magnus · ⭐ 2108 \(\+8\)/ })).toBeDefined()
  expect((await $.command.run(command('account'))).text).toBe('Signed in as magnus, puzzle rating 2108.')

  expect((await $.command.run(command('login lip_secret'))).text).toMatch(/Don’t put a token in a command/)
  expect((await $.command.run(command('logout'))).text).toBe('Signed out; the token is revoked on Lichess.')
  expect(calls.at(-1)).toMatchObject({ method: 'DELETE', url: 'https://lichess.org/api/token', auth: 'Bearer lip_good' })
  expect(await ui.find({ key: 'login' })).toBeDefined()
  expect((await $.command.run(command('account'))).text).toMatch(/Not signed in/)
  await ui.unmount()
})

test('signing in through the browser: the listener catches the redirect, its code becomes a token', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  // Lets the sign-in's own work, run apart from the command, catch up.
  const settled = () => clock.advance(1)
  const calls = lichess(on)
  let redirect: (line: string) => void = () => undefined
  const redirected = new Promise<string>(resolve => (redirect = resolve))
  on('process.spawn', async function* (_$, e) {
    expect(e.argv[0]).toBe('python3')
    yield { stream: 'stdout' as const, text: '54321\n' }
    yield { stream: 'stdout' as const, text: `${await redirected}\n` }
    return { value: { code: 0, signal: null } }
  })

  const answer = (await $.command.run(command('login'))).text ?? ''
  const url = new URL(answer.match(/https:\/\/lichess\.org\/oauth\S+/)![0])
  expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:54321/')

  // A redirect with another state is refused: it was not this sign-in.
  redirect(JSON.stringify({ code: 'c0de', state: 'forged' }))
  for (let i = 0; i < 20 && !calls.some(c => c.url.endsWith('/api/account')); i++) await settled()
  expect(calls.some(c => c.url.endsWith('/api/token'))).toBe(false)
  expect((await $.command.run(command('account'))).text).toMatch(/Not signed in/)
})

test('the right redirect signs in', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  const settled = () => clock.advance(1)
  const calls = lichess(on)
  let redirect: (line: string) => void = () => undefined
  const redirected = new Promise<string>(resolve => (redirect = resolve))
  on('process.spawn', async function* () {
    yield { stream: 'stdout' as const, text: '54321\n' }
    yield { stream: 'stdout' as const, text: `${await redirected}\n` }
    return { value: { code: 0, signal: null } }
  })
  const answer = (await $.command.run(command('login'))).text ?? ''
  const state = new URL(answer.match(/https:\/\/lichess\.org\/oauth\S+/)![0]).searchParams.get('state')
  redirect(JSON.stringify({ code: 'c0de', state }))
  for (let i = 0; i < 50 && !calls.some(c => c.url.endsWith('/api/account')); i++) await settled()
  const trade = calls.find(c => c.url.endsWith('/api/token') && c.method === 'POST')
  expect(fields(new URLSearchParams(trade!.body))).toMatchObject({ code: 'c0de', redirect_uri: 'http://127.0.0.1:54321/', grant_type: 'authorization_code' })
  expect((await $.command.run(command('account'))).text).toBe('Signed in as magnus, puzzle rating 2100.')
})
