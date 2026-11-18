import type { Elements } from 'claude-code'

import { closeEndgames, startEndgame } from '../app/endgames'
import type { $ } from '../app/state'
import type { Messages } from '../i18n'
import type { View } from '../../types'
import { drillOrder } from '../training/endgames'

/** The endgames to convert against Stockfish, the ones not yet converted first; a press starts the game from the position. */
export function endgamesPane($: $, els: Elements[keyof Elements], v: View, t: Messages) {
  const { Box, Text, Button } = els
  return (
    <Box flexDirection="column">
      {/* A way back at the top too: a short terminal may show only the top of the pane. */}
      <Box flexDirection="row" gap={2}>
        <Text bold>{`🏆 ${t.pane.endgames}`}</Text>
        <Button key="endgames-back-top" plain onPress={() => void closeEndgames($)}>{`← ${t.pane.back}`}</Button>
      </Box>
      <Text dimColor>{t.pane.endgamesHead}</Text>
      <Text dimColor>{t.pane.endgamesMarks}</Text>
      {drillOrder(v.drillResults).map(e => {
        const result = v.drillResults[e.key]
        const mark = result === 'converted' ? '✅' : result === 'tried' ? '⏳' : '·'
        return (
          <Button key={`endgame-${e.key}`} plain onPress={() => void startEndgame($, e.key).catch(() => undefined)}>{`${mark} ${t.endgame(e.key)}`}</Button>
        )
      })}
      <Button key="endgames-back" plain autoFocus onPress={() => void closeEndgames($)}>{`← ${t.pane.back}`}</Button>
    </Box>
  )
}
