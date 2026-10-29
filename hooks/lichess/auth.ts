const LICHESS = 'https://lichess.org'

/** What chess-break calls itself on Lichess's sign-in page; Lichess needs no registration with PKCE. */
export const CLIENT_ID = 'chess-break'

/** Puzzles (reading the next one, sending results) and games (`board:play`). */
export const SCOPES = ['puzzle:read', 'puzzle:write', 'board:play']

export const TOKEN_PAGE = `${LICHESS}/account/oauth/token/create?${SCOPES.map(s => `scopes[]=${s}`).join('&')}&description=chess-break`

export const TOKEN_URL = `${LICHESS}/api/token`
export const ACCOUNT_URL = `${LICHESS}/api/account`

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** A PKCE verifier, its S256 challenge, and a state to match the redirect against. */
export async function pkce() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)))
  const state = base64url(crypto.getRandomValues(new Uint8Array(12)))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return { verifier, state, challenge: base64url(new Uint8Array(digest)) }
}

export const redirectUri = (port: number) => `http://127.0.0.1:${port}/`

export function authorizeUrl(port: number, challenge: string, state: string): string {
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(port),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES.join(' '),
    state,
  })
  return `${LICHESS}/oauth?${query}`
}

/** The form that trades the code Lichess sent back for a token. */
export function tokenForm(code: string, verifier: string, port: number): string {
  return new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri(port),
    client_id: CLIENT_ID,
  }).toString()
}

/**
 * A one-shot listener for Lichess's redirect, run with python3: it prints its port, then the
 * redirect's query as one JSON line, answers the browser with a page to close, and exits. It
 * gives up after ten minutes. Other requests (a favicon) are answered and ignored.
 */
export const LISTENER = String.raw`
import http.server, json, sys, time, urllib.parse
PAGE = b'<!doctype html><meta charset="utf-8"><title>chess-break</title><p style="font:16px sans-serif;margin:3em">chess-break: done. You can close this tab and go back to Claude Code.</p>'
class Redirect(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        query = {k: v[0] for k, v in urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).items()}
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(PAGE)
        if 'code' in query or 'error' in query:
            print(json.dumps(query), flush=True)
            self.server.done = True
    def log_message(self, *args):
        pass
server = http.server.HTTPServer(('127.0.0.1', 0), Redirect)
server.timeout = 5
server.done = False
print(server.server_address[1], flush=True)
end = time.time() + 600
while not server.done and time.time() < end:
    server.handle_request()
`

export type Account = { username: string; rating?: number }

/** The account a token belongs to, from /api/account. */
export function readAccount(res: { ok: boolean; status: number; text: string }): Account {
  if (res.status === 401) throw new Error('token refused')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = JSON.parse(res.text) as { username?: string; perfs?: { puzzle?: { rating?: number } } }
  if (!body.username) throw new Error('unexpected answer')
  return { username: body.username, rating: body.perfs?.puzzle?.rating }
}

/** The new rating and its change, from /api/puzzle/batch's answer to a result. */
export function readResult(text: string): { rating?: number; diff?: number } {
  const body = JSON.parse(text) as { glicko?: { rating?: number }; rounds?: { ratingDiff?: number }[] }
  const rating = body.glicko?.rating
  return { rating: rating === undefined ? undefined : Math.round(rating), diff: body.rounds?.[0]?.ratingDiff }
}

export const resultUrl = (theme: string) => `${LICHESS}/api/puzzle/batch/${encodeURIComponent(theme || 'mix')}`
