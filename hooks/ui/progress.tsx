import type { Elements } from 'claude-code'

import type { View } from '../../types'
import { closeProgress } from '../app/progress'
import type { $ } from '../app/state'
import type { Messages } from '../i18n'
import { progressRows, spark } from '../training/history'
import { averageMs, formatTime } from '../training/timing'
import type { ProgressRow } from '../training/history'

/** Rows the screen has room for; /chess-break stats lists them all. */
const SHOWN_ROWS = 12

/** A theme's row: its weeks, its 4 weeks' accuracy, its name, and Lichess's numbers when known. */
export const rowLine = (row: ProgressRow, t: Messages) =>
  [
    `${spark(row.weeks)} ${(row.accuracy === undefined ? '–' : `${row.accuracy}%`).padStart(4)}  ${t.theme(row.theme)}`,
    ...(row.lichess ? [`⭐ ${row.lichess.performance} · ${row.lichess.accuracy}%`] : []),
  ].join(' · ')

/** Accuracy by theme over the last 4 weeks, with Lichess's numbers when signed in; Back returns to the puzzle. */
export function progressPane($: $, els: Elements[keyof Elements], v: View, t: Messages, now: number) {
  const { Box, Text, Button } = els
  const dashboard = v.dashboard
  const rows = progressRows(v.history, now, dashboard && 'themes' in dashboard ? dashboard.themes : undefined)
  return (
    <Box flexDirection="column">
      <Text bold>{`📊 ${t.pane.progress}`}</Text>
      <Text dimColor>{t.pane.progressHead}</Text>
      {v.times.all.count > 0 && <Text>{`⏱ ${t.pane.times(formatTime(averageMs(v.times.all)), formatTime(v.times.all.fastestMs))}`}</Text>}
      {dashboard && 'themes' in dashboard && <Text dimColor>{`⭐ ${t.pane.lichessHead}`}</Text>}
      {dashboard && 'failed' in dashboard && <Text color="error">{t.pane.dashboardFailed(dashboard.failed)}</Text>}
      {rows.length ? rows.slice(0, SHOWN_ROWS).map(row => <Text key={`row-${row.theme}`}>{rowLine(row, t)}</Text>) : <Text>{t.pane.noRecent}</Text>}
      <Button key="progress-back" plain autoFocus onPress={() => void closeProgress($)}>{`← ${t.pane.back}`}</Button>
    </Box>
  )
}
