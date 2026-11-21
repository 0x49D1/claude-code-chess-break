import type { Elements } from 'claude-code'

import type { View, WeekSummary } from '../../types'
import type { $ } from '../app/state'
import { closeSummary } from '../app/summary'
import type { Messages } from '../i18n'
import { todayOf } from '../training/daily'

/** Last week's card: the puzzles, the day streak, the best and weakest theme; Got it closes it until next week. */
export function summaryPane($: $, els: Elements[keyof Elements], v: View, s: WeekSummary, t: Messages, now: number) {
  const { Box, Text, Button } = els
  const streak = todayOf(v.daily, now).streak
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>{`🗓 ${t.pane.summaryTitle(s.from, s.to)}`}</Text>
      <Box flexDirection="column">
        <Text>{`🧩 ${t.pane.summaryPlayed(s.played, s.solved, Math.round((100 * s.solved) / s.played))}`}</Text>
        <Text>{`📅 ${t.pane.summaryStreak(streak, v.daily.best)}`}</Text>
        {s.best && <Text>{`💪 ${t.pane.summaryBest(t.theme(s.best.theme), s.best.accuracy)}`}</Text>}
        {s.weakest && <Text>{`🎯 ${t.pane.summaryWeakest(t.theme(s.weakest.theme), s.weakest.accuracy)}`}</Text>}
      </Box>
      <Button key="summary-close" plain autoFocus onPress={() => void closeSummary($)}>{`✔ ${t.pane.gotIt}`}</Button>
    </Box>
  )
}
