import { atom, update } from 'claude-code'
import type { Elements } from 'claude-code'

import type { GameSettings, View } from '../../types'
import { playSetup } from '../app/game'
import { INITIAL_VIEW } from '../app/state'
import type { $ } from '../app/state'
import type { Messages } from '../i18n'
import { AI_CLOCKS, DAYS, SEEK_CLOCKS } from '../lichess/game'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

/** The setup screen: a row of choices per setting, the chosen one inverse, then ▶ Play. */
export function setupPane($: $, els: Elements[keyof Elements], setup: GameSettings, v: View, t: Messages) {
  const { Box, Text, Button } = els
  type Option = { key: string; text: string; isChosen: boolean; change: (s: GameSettings) => GameSettings }
  const choose = (change: Option['change']) => void update($, view, x => (x.setup ? { ...x, setup: change(x.setup), isConfirming: undefined } : x))
  const cancel = () => void update($, view, x => ({ ...x, setup: undefined, isConfirming: undefined }))
  const row = (label: string | undefined, name: string, options: Option[]) => (
    <Box key={`row-${name}`} flexDirection="row" flexWrap="wrap" columnGap={1}>
      {label && <Text dimColor>{label}</Text>}
      {options.map(o => (
        <Button key={`setup-${name}-${o.key}`} plain onPress={() => choose(o.change)}>
          <Text inverse={o.isChosen}>{o.text}</Text>
        </Button>
      ))}
    </Box>
  )
  if (v.isConfirming && setup.kind === 'seek') {
    // Cancel takes the focus, so that a stray Enter does not start the game.
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>{`👤 ${t.game.person}`}</Text>
        <Text>{t.game.confirmSeek(setup.clock, setup.rated)}</Text>
        <Box flexDirection="row" gap={2}>
          <Button key="setup-cancel" plain autoFocus onPress={cancel}>{`✖ ${t.pane.cancel}`}</Button>
          <Button key="setup-confirm" plain onPress={() => void playSetup($).catch(() => undefined)}>{`✔ ${t.game.findOpponent}`}</Button>
        </Box>
      </Box>
    )
  }
  const clocks = [...(setup.kind === 'ai' ? AI_CLOCKS : SEEK_CLOCKS), ...DAYS]
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>{setup.kind === 'ai' ? `🤖 ${t.game.stockfish(setup.level)}` : `👤 ${t.game.person}`}</Text>
      {setup.kind === 'ai' &&
        row(t.game.level, 'level', [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ key: String(n), text: String(n), isChosen: setup.level === n, change: s => (s.kind === 'ai' ? { ...s, level: n } : s) })))}
      {row(t.game.clock, 'clock', clocks.map(c => ({ key: c, text: c, isChosen: setup.clock === c, change: s => ({ ...s, clock: c }) })))}
      {setup.kind === 'ai' &&
        row(t.game.colour, 'color', (['white', 'black', 'random'] as const).map(c => ({
          key: c,
          text: c === 'random' ? t.game.random : t.side(c === 'white' ? 'w' : 'b'),
          isChosen: setup.color === c,
          change: s => (s.kind === 'ai' ? { ...s, color: c } : s),
        })))}
      {setup.kind === 'seek' &&
        row(undefined, 'rated', [false, true].map(rated => ({
          key: rated ? 'rated' : 'casual',
          text: rated ? t.game.rated : t.game.casual,
          isChosen: setup.rated === rated,
          change: s => (s.kind === 'seek' ? { ...s, rated } : s),
        })))}
      {v.gameNote && <Text color="error">{t.game.note(v.gameNote)}</Text>}
      <Box flexDirection="row" gap={2}>
        <Button key="setup-play" plain onPress={() => void playSetup($).catch(() => undefined)}>{`▶ ${t.game.play}`}</Button>
        <Button key="setup-cancel" plain onPress={cancel}>{`✖ ${t.pane.cancel}`}</Button>
      </Box>
    </Box>
  )
}
