import type { Elements } from 'claude-code'

import { closeAbout } from '../app/about'
import type { $ } from '../app/state'
import type { Messages } from '../i18n'
import { HOMEPAGE, RELEASES, VERSION } from '../release'

/** Versions the screen has room for; the link on GitHub has them all. */
const SHOWN_RELEASES = 3

/** The version, the project on GitHub, and what the latest versions added. */
export function aboutPane($: $, els: Elements[keyof Elements], t: Messages) {
  const { Box, Text, Button, Link } = els
  return (
    <Box flexDirection="column" gap={1}>
      {/* A way back at the top too: a short terminal may show only the top of the pane. */}
      <Box flexDirection="row" gap={2}>
        <Text bold>{`ℹ chess-break ${VERSION}`}</Text>
        <Button key="about-back-top" plain onPress={() => void closeAbout($)}>{`← ${t.pane.back}`}</Button>
      </Box>
      <Link href={HOMEPAGE} label="GitHub ↗" />
      <Box flexDirection="column">
        <Text bold>{`✨ ${t.pane.whatsNew}`}</Text>
        {RELEASES.slice(0, SHOWN_RELEASES).map(r => (
          <Box key={`release-${r.version}`} flexDirection="column">
            <Text bold={r.version === VERSION}>{`${r.version}${r.date ? `  ${r.date}` : ''}`}</Text>
            {r.changes.map((change, i) => <Text key={`change-${r.version}-${i}`}>{`  • ${change}`}</Text>)}
          </Box>
        ))}
      </Box>
      <Link href={`${HOMEPAGE}/blob/main/CHANGELOG.md`} label={`${t.pane.allChanges} ↗`} />
      <Button key="about-back" plain autoFocus onPress={() => void closeAbout($)}>{`← ${t.pane.back}`}</Button>
    </Box>
  )
}
