import { atom, update } from 'claude-code'
import type { Elements } from 'claude-code'

import type { Storm, View } from '../../types'
import { INITIAL_VIEW } from '../app/state'
import type { $ } from '../app/state'
import { closeStorm, openStorm, stormMove } from '../app/storm'
import { completions } from '../chess/position'
import type { Messages } from '../i18n'
import { click, play, promote, solverOf } from '../training/attempt'
import { PENALTY_MS, STORM_MS, timeLeft } from '../training/storm'
import { formatTime } from '../training/timing'
import { board, glyphOf } from './board'
import { submitLabelOf, suggestionRow } from './suggestions'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

const PENALTY_SECONDS = PENALTY_MS / 1000

/** A Puzzle Storm run: the clock, the count, the board and the move field; at the end, the result and Again. */
export function stormPane($: $, els: Elements[keyof Elements], v: View, s: Storm, t: Messages, now: number) {
  const { Box, Text, Button } = els
  const Input = 'Input' in els ? els.Input : undefined
  const a = s.attempt
  const isOver = s.endedAt !== undefined || (s.startedAt !== undefined && timeLeft(s, now) === 0)
  const suggestions = !isOver && v.typed ? completions(a.fen, v.typed) : []
  const score = `✅ ${s.solved}  ·  ❌ ${s.missed}  ·  🏅 ${Math.max(s.best, s.solved)}`
  const back = (key: string) => <Button key={key} plain onPress={() => void closeStorm($)}>{`← ${t.pane.back}`}</Button>
  const playText = (text: string) => {
    void update($, view, x => ({ ...x, typed: undefined }))
    void stormMove($, x => {
      const options = completions(x.fen, text)
      return play(x, options.length === 1 ? options[0]! : text)
    })
  }
  if (isOver) {
    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" gap={2}>
          <Text bold>{`⚡ ${t.pane.storm}`}</Text>
          {back('storm-back-top')}
        </Box>
        <Text>{`⏱ ${t.pane.stormOver(s.solved, s.missed)}`}</Text>
        {s.bestCombo > 1 && <Text>{`🔥 ${t.pane.stormLongest(s.bestCombo)}`}</Text>}
        <Text>{s.solved > s.best ? `🏅 ${t.pane.stormNewBest}` : `🏅 ${t.pane.stormBest(s.best)}`}</Text>
        <Box flexDirection="row" gap={2}>
          <Button key="storm-again" plain autoFocus onPress={() => void openStorm($)}>{`🔄 ${t.pane.stormAgain}`}</Button>
          {back('storm-back')}
        </Box>
      </Box>
    )
  }
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={2}>
        <Text bold>{`⚡ ${t.pane.storm}  ·  ⏱ ${formatTime(timeLeft(s, now))}  ·  ${score}`}</Text>
        {back('storm-back-top')}
      </Box>
      <Box flexDirection="row" gap={2}>
        <Box borderStyle="round" borderDimColor paddingX={1}>
          {board(els, { ...a, side: solverOf(a), isActive: true }, square => void stormMove($, x => click(x, square)))}
        </Box>
        <Box flexDirection="column">
          <Text>{t.pane.toPlay(solverOf(a))}</Text>
          {a.puzzle.rating !== undefined && <Text dimColor>{`⭐ ${a.puzzle.rating}`}</Text>}
          {s.last === 'solved' && <Text color="success">{`✅ ${t.pane.stormSolved}`}</Text>}
          {s.combo > 1 && <Text>{`🔥 ${t.pane.stormCombo(s.combo)}`}</Text>}
          {s.gainedMs !== undefined && <Text color="success">{`⏫ ${t.pane.stormGained(s.gainedMs / 1000)}`}</Text>}
          {s.last === 'missed' && <Text color="error">{`❌ ${t.pane.stormMissed(PENALTY_SECONDS)}`}</Text>}
          {s.startedAt === undefined && <Text dimColor>{t.pane.stormHead(formatTime(STORM_MS), PENALTY_SECONDS)}</Text>}
          {s.startedAt === undefined && <Text dimColor>{t.pane.stormComboHead}</Text>}
        </Box>
      </Box>
      {a.feedback.kind === 'illegal' && <Text color="error">{`🚫 ${t.feedback(a.feedback, solverOf(a))}`}</Text>}
      {Input && (
        <Input
          key={`storm-move-${a.puzzle.id}`}
          label="›"
          placeholder={t.pane.moveField}
          autoFocus
          {...submitLabelOf(suggestions)}
          onInput={value => void update($, view, x => ({ ...x, typed: value }))}
          onSubmit={playText}
        />
      )}
      {a.promoting ? (
        <Box flexDirection="row" gap={1}>
          <Text>{`👑 ${t.pane.promoteTo}`}</Text>
          {['q', 'r', 'b', 'n'].map(piece => (
            <Button key={`storm-promote-${piece}`} plain onPress={() => void stormMove($, x => promote(x, piece))}>
              {`[${glyphOf(solverOf(a) === 'w' ? piece.toUpperCase() : piece)}]`}
            </Button>
          ))}
        </Box>
      ) : suggestions.length > 0 ? (
        suggestionRow(els, `storm-suggest-${a.puzzle.id}`, suggestions, playText)
      ) : null}
      {back('storm-back')}
    </Box>
  )
}
