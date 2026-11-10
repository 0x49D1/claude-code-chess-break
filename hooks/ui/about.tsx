import type { Elements } from 'claude-code'

import type { View } from '../../types'
import { closeAbout } from '../app/about'
import type { $ } from '../app/state'
import type { Messages } from '../i18n'

/** Versions the screen has room for; the link on GitHub has them all. */
const SHOWN_RELEASES = 3

/** The version, the project on GitHub, and what the latest versions added. */
export function aboutPane($: $, els: Elements[keyof Elements], v: View, t: Messages) {
  const { Box, Text, Button, Link } = els
  const releases = v.about?.releases ?? []
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>{`ℹ chess-break${v.version ? ` ${v.version}` : ''}`}</Text>
      {v.homepage && <Link href={v.homepage} label="GitHub ↗" />}
      <Box flexDirection="column">
        <Text bold>{`✨ ${t.pane.whatsNew}`}</Text>
        {releases.length ? (
          releases.slice(0, SHOWN_RELEASES).map(r => (
            <Box key={`release-${r.version}`} flexDirection="column">
              <Text bold={r.version === v.version}>{`${r.version}${r.date ? `  ${r.date}` : ''}`}</Text>
              {r.changes.map((change, i) => <Text key={`change-${r.version}-${i}`}>{`  • ${change}`}</Text>)}
            </Box>
          ))
        ) : (
          <Text dimColor>{t.pane.changesUnread}</Text>
        )}
      </Box>
      {v.homepage && <Link href={`${v.homepage}/blob/main/CHANGELOG.md`} label={`${t.pane.allChanges} ↗`} />}
      <Button key="about-back" plain autoFocus onPress={() => void closeAbout($)}>{`← ${t.pane.back}`}</Button>
    </Box>
  )
}
