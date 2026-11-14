import type { Elements } from 'claude-code'

import type { View } from '../../types'
import { closeOpenings, drillSet, startOpening, toggleInSet } from '../app/openings'
import type { $ } from '../app/state'
import type { Messages } from '../i18n'
import { OPENINGS } from '../training/openings'

/** The openings to drill, each with the side played and whether it is in the set; a press on its name starts it. */
export function openingsPane($: $, els: Elements[keyof Elements], v: View, t: Messages) {
  const { Box, Text, Button } = els
  return (
    <Box flexDirection="column">
      {/* A way back at the top too: a short terminal may show only the top of the pane. */}
      <Box flexDirection="row" gap={2}>
        <Text bold>{`📖 ${t.pane.openings}`}</Text>
        <Button key="openings-back-top" plain onPress={() => void closeOpenings($)}>{`← ${t.pane.back}`}</Button>
      </Box>
      <Text dimColor>{t.pane.openingsHead}</Text>
      <Text dimColor>{t.pane.setHead}</Text>
      {v.openingSet.length > 0 && (
        <Button key="drill-set" plain onPress={() => void drillSet($)}>{`▶ ${t.pane.drillSet(v.openingSet.length)}`}</Button>
      )}
      {OPENINGS.map(o => (
        <Box key={`row-${o.key}`} flexDirection="row" gap={1}>
          <Button key={`pick-${o.key}`} plain onPress={() => void toggleInSet($, o.key)}>{v.openingSet.includes(o.key) ? '☑' : '☐'}</Button>
          <Button key={`opening-${o.key}`} plain onPress={() => void startOpening($, o.key)}>{`${o.name} · ${t.side(o.side)}`}</Button>
        </Box>
      ))}
      <Button key="openings-back" plain autoFocus onPress={() => void closeOpenings($)}>{`← ${t.pane.back}`}</Button>
    </Box>
  )
}
