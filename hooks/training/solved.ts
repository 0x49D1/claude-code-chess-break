/** Puzzles kept as solved: enough for years of breaks, small enough to store. */
export const KEPT_SOLVED = 5000

/** The ids of puzzles solved cleanly, oldest first, with `id` added last; past the kept number the oldest go. */
export function recordSolved(solved: string[], id: string): string[] {
  return [...solved.filter(x => x !== id), id].slice(-KEPT_SOLVED)
}
