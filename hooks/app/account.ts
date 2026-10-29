import { atom, update } from 'claude-code'
import type { HookStream, ProcessSpawnChunk, ProcessSpawnResult } from 'claude-code'

import type { Attempt } from '../../types'
import { ACCOUNT_URL, LISTENER, TOKEN_URL, authorizeUrl, pkce, readAccount, readResult, resultUrl, tokenForm } from '../lichess/auth'
import type { Account } from '../lichess/auth'
import { INITIAL_VIEW } from './state'
import type { $ } from './state'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

/** The listener waiting for Lichess's redirect, while a sign-in is under way. */
let listener: HookStream<ProcessSpawnChunk, ProcessSpawnResult> | undefined

export async function storedToken($: $): Promise<string | undefined> {
  const token = await $.store.get('token')
  return typeof token === 'string' && token ? token : undefined
}

export async function storedAccount($: $): Promise<Account | undefined> {
  return ((await $.store.get('account')) as Account | undefined) ?? undefined
}

/** Checks a token with Lichess and keeps it, with the account it belongs to. */
export async function useToken($: $, raw: string): Promise<Account | undefined> {
  const token = raw.trim()
  if (!token) return undefined
  try {
    const account = readAccount(await $.http.fetch(ACCOUNT_URL, { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }))
    await $.store.set('token', token)
    await $.store.set('account', account)
    await update($, view, v => ({ ...v, account, signIn: undefined, ratingDiff: undefined }))
    return account
  } catch (err) {
    await update($, view, v => ({ ...v, signIn: { ...v.signIn, failed: err instanceof Error ? err.message : String(err) } }))
    return undefined
  }
}

/**
 * Starts signing in through the browser (OAuth with PKCE): a one-shot listener on 127.0.0.1
 * catches Lichess's redirect, and its code is traded for a token. Resolves the address to open,
 * or undefined when the listener cannot start (no python3), leaving the pasted token.
 */
export async function signIn($: $): Promise<string | undefined> {
  await cancelSignIn($)
  await update($, view, v => ({ ...v, signIn: {} }))
  const { verifier, state, challenge } = await pkce()
  const child = $.process.spawn({ argv: ['python3', '-c', LISTENER] })
  listener = child
  let opened: (url: string | undefined) => void = () => undefined
  const ready = new Promise<string | undefined>(resolve => (opened = resolve))
  void (async () => {
    let port = 0
    let buffer = ''
    try {
      for await (const { stream, text } of child) {
        if (stream !== 'stdout') continue
        buffer += text
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines.filter(Boolean)) {
          if (!port) {
            port = Number(line)
            const url = authorizeUrl(port, challenge, state)
            await update($, view, v => ({ ...v, signIn: { url } }))
            opened(url)
            continue
          }
          const query = JSON.parse(line) as { code?: string; state?: string; error?: string }
          if (query.error || !query.code) throw new Error(query.error ?? 'no code')
          if (query.state !== state) throw new Error('state mismatch')
          const res = await $.http.fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
            body: tokenForm(query.code, verifier, port),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const token = (JSON.parse(res.text) as { access_token?: string }).access_token
          if (!token) throw new Error('no token')
          await useToken($, token)
          return
        }
      }
    } catch (err) {
      if (listener !== child) return
      await update($, view, v => (v.signIn ? { ...v, signIn: { ...v.signIn, failed: err instanceof Error ? err.message : String(err) } } : v))
    } finally {
      if (listener === child) listener = undefined
      opened(undefined)
    }
  })()
  return ready
}

/** Stops a sign-in under way, and its listener with it. */
export async function cancelSignIn($: $) {
  const child = listener
  listener = undefined
  await child?.return(undefined as never).catch(() => undefined)
  await update($, view, v => ({ ...v, signIn: undefined }))
}

/** Signs out, and revokes the token at Lichess; best effort. */
export async function signOut($: $) {
  const token = await storedToken($)
  if (token) await $.http.fetch(TOKEN_URL, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined)
  await $.store.delete('token')
  await $.store.delete('account')
  await update($, view, v => ({ ...v, account: undefined, ratingDiff: undefined }))
}

/**
 * Sends a new Lichess puzzle's result to the account, rated, and shows the new rating. Reviews
 * and puzzles from elsewhere stay local: Lichess rates a puzzle once.
 */
export async function sendResult($: $, attempt: Attempt, isWin: boolean, theme: string) {
  if (attempt.isReview || attempt.puzzle.source !== 'lichess') return
  const token = await storedToken($)
  if (!token) return
  try {
    const res = await $.http.fetch(resultUrl(theme), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ solutions: [{ id: attempt.puzzle.id, win: isWin, rated: true }] }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const { rating, diff } = readResult(res.text)
    const after = await update($, view, v => ({
      ...v,
      account: v.account && rating !== undefined ? { ...v.account, rating } : v.account,
      ratingDiff: diff,
    }))
    if (after.account) await $.store.set('account', after.account)
  } catch (err) {
    $.ui.log(`chess-break: result not sent to Lichess (${err instanceof Error ? err.message : String(err)})`, { to: 'debug' })
  }
}

/** The account in the pane at the start of a session. */
export async function restoreAccount($: $) {
  const account = await storedAccount($)
  if (account) await update($, view, v => ({ ...v, account }))
}
