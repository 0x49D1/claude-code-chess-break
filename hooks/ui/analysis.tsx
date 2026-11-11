import type { Elements } from 'claude-code'

import type { Game, Judgment, Mistake, View } from '../../types'
import { reviewGame } from '../app/analysis'
import type { $ } from '../app/state'
import type { Messages } from '../i18n'
import { gameUrl } from '../lichess/game'

const MARKS: Record<Judgment, string> = { Inaccuracy: '?!', Mistake: '?', Blunder: '??' }

/** `14. Qxb7??` or `9... h6?`: the move as a score sheet writes it. */
const moveText = (m: Mistake) => `${Math.floor(m.ply / 2) + 1}${m.ply % 2 === 0 ? '.' : '...'} ${m.san}${MARKS[m.judgment]}`

/**
 * A finished game's review: the button, the wait for Lichess's analysis, or the person's costliest
 * moves, each showing the position before it on the board.
 */
export function reviewSection($: $, els: Elements[keyof Elements], g: Game, v: View, t: Messages, goTo: (ply: number) => void) {
  const { Box, Text, Button, Link } = els
  const a = v.analysis?.gameId === g.id ? v.analysis : undefined
  const review = () => void reviewGame($).catch(() => undefined)
  if (!a) return <Button key="review" plain onPress={review}>{`🔍 ${t.game.review}`}</Button>
  if (a.state === 'ready') {
    if (!a.mistakes.length) return <Text color="success">{`✅ ${t.game.noMistakes}`}</Text>
    return (
      <Box flexDirection="column">
        <Text bold>{`🔍 ${t.game.costliest}`}</Text>
        {a.mistakes.map(m => (
          <Button key={`mistake-${m.ply}`} plain onPress={() => goTo(m.ply)}>
            {t.game.mistake(moveText(m), m.judgment, m.best, (m.loss / 100).toFixed(1))}
          </Button>
        ))}
        <Text dimColor>{`🔁 ${t.game.comeBack}`}</Text>
      </Box>
    )
  }
  return (
    <Box flexDirection="column">
      <Text>{`🔍 ${t.game.analysisOnLichess}`}</Text>
      <Link href={gameUrl(g.id)} label={t.game.openOnLichess} />
      {a.state === 'waiting' && <Text dimColor>{`⏳ ${t.game.waitingAnalysis}`}</Text>}
      {a.state === 'gaveUp' && <Text>{t.game.analysisNotYet}</Text>}
      {a.state === 'failed' && <Text color="error">{t.game.analysisFailed(a.why)}</Text>}
      {a.state !== 'waiting' && <Button key="check-analysis" plain onPress={review}>{`🔄 ${t.game.checkAgain}`}</Button>}
    </Box>
  )
}
