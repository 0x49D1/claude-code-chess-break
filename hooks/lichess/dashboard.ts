import type { ThemeResult } from '../../types'

/** Lichess's puzzle dashboard over the last 30 days; needs the `puzzle:read` scope. */
export const DASHBOARD_URL = 'https://lichess.org/api/puzzle/dashboard/30'

type Results = { nb?: unknown; firstWins?: unknown; performance?: unknown }

/** Each theme's results from the dashboard's answer; a theme with a field missing is left out. */
export function readDashboard(res: { ok: boolean; status: number; text: string }): Record<string, ThemeResult> {
  if (res.status === 401) throw new Error('token refused')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = JSON.parse(res.text) as { themes?: Record<string, { results?: Results } | undefined> }
  if (typeof body.themes !== 'object' || body.themes === null) throw new Error('unexpected answer')
  const themes: Record<string, ThemeResult> = {}
  for (const [theme, entry] of Object.entries(body.themes)) {
    const { nb, firstWins, performance } = entry?.results ?? {}
    if (typeof nb !== 'number' || typeof firstWins !== 'number' || typeof performance !== 'number' || nb <= 0) continue
    themes[theme] = { played: nb, accuracy: Math.round((100 * firstWins) / nb), performance }
  }
  return themes
}
