import type { Release } from '../../types'

/** CHANGELOG.md's versions, newest first as the file has them: `## 0.5.0 (2026-11-10)` and its `- ` lines, plain text. */
export function readChangelog(text: string): Release[] {
  const releases: Release[] = []
  for (const line of text.split('\n')) {
    const heading = /^## (\S+)(?: \((.+)\))?\s*$/.exec(line)
    if (heading) releases.push({ version: heading[1]!, date: heading[2], changes: [] })
    else if (line.startsWith('- ') && releases.length) releases.at(-1)!.changes.push(line.slice(2).replace(/\*\*|`/g, ''))
  }
  return releases
}
