import type { Judgment, Mistake } from '../../types'

const LICHESS = 'https://lichess.org'

/** A game's export with Lichess's computer analysis, once someone has requested it on the website. */
export const exportUrl = (id: string) => `${LICHESS}/game/export/${encodeURIComponent(id)}?evals=true&clocks=false&opening=false`

const JUDGMENTS: Judgment[] = ['Inaccuracy', 'Mistake', 'Blunder']

/** Evaluations past 10 pawns, and mates, count as 10 pawns: a missed mate does not dwarf the rest. */
const CAP = 1000

/** Lichess's evaluation of the start, before the first move. */
const START_EVAL = 15

type Entry = { eval?: unknown; mate?: unknown; best?: unknown; variation?: unknown; judgment?: { name?: unknown } }

/** An entry's evaluation in centipawns from white's side, capped; undefined when it has none. */
function scoreOf(entry: Entry | undefined): number | undefined {
  if (typeof entry?.mate === 'number') return entry.mate > 0 ? CAP : -CAP
  if (typeof entry?.eval === 'number') return Math.max(-CAP, Math.min(CAP, entry.eval))
  return undefined
}

/**
 * The person's moves Lichess judged, the most lost first, at most `limit`; undefined while the game
 * has no analysis yet.
 */
export function readAnalysis(res: { ok: boolean; status: number; text: string }, side: 'w' | 'b', limit = 3): Mistake[] | undefined {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = JSON.parse(res.text) as { moves?: unknown; analysis?: unknown }
  if (!Array.isArray(body.analysis)) return undefined
  const analysis = body.analysis as (Entry | undefined)[]
  const sans = typeof body.moves === 'string' ? body.moves.split(' ') : []
  const mistakes: Mistake[] = []
  analysis.forEach((entry, ply) => {
    const judgment = JUDGMENTS.find(j => j === entry?.judgment?.name)
    const san = sans[ply]
    if (!judgment || !san || (ply % 2 === 0 ? 'w' : 'b') !== side) return
    const before = ply === 0 ? START_EVAL : scoreOf(analysis[ply - 1])
    const after = scoreOf(entry)
    const lost = before === undefined || after === undefined ? 0 : side === 'w' ? before - after : after - before
    const better = typeof entry?.variation === 'string' ? entry.variation.split(' ')[0] : undefined
    const best = better || (typeof entry?.best === 'string' ? entry.best : '?')
    mistakes.push({ ply, san, judgment, best, loss: Math.max(0, lost) })
  })
  return mistakes.sort((a, b) => b.loss - a.loss || a.ply - b.ply).slice(0, limit)
}
