import type { Elements } from 'claude-code'

import { closeOpenings, startOpening } from '../app/openings'
import type { $ } from '../app/state'
import type { Messages } from '../i18n'
import { OPENINGS } from '../training/openings'

/** The openings to drill, each with the side played; a press starts it in the pane. */
export function openingsPane($: $, els: Elements[keyof Elements], t: Messages) {
  const { Box, Text, Button } = els
  return (
    <Box flexDirection="column">
      {/* A way back at the top too: a short terminal may show only the top of the pane. */}
      <Box flexDirection="row" gap={2}>
        <Text bold>{`📖 ${t.pane.openings}`}</Text>
        <Button key="openings-back-top" plain onPress={() => void closeOpenings($)}>{`← ${t.pane.back}`}</Button>
      </Box>
      <Text dimColor>{t.pane.openingsHead}</Text>
      {OPENINGS.map(o => (
        <Button key={`opening-${o.key}`} plain onPress={() => void startOpening($, o.key)}>{`${o.name} · ${t.side(o.side)}`}</Button>
      ))}
      <Button key="openings-back" plain autoFocus onPress={() => void closeOpenings($)}>{`← ${t.pane.back}`}</Button>
    </Box>
  )
}
