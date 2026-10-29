import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { change, loadNext, next } from '../app/actions'
import { completions } from '../chess/position'
import { INITIAL_VIEW, PANE, messagesOf } from '../app/state'
import type { $ } from '../app/state'
import { analysisUrl, puzzleUrl } from '../lichess/client'
import { click, hint, moveLine, play, promote, reveal, solverOf } from '../training/attempt'
import { PALETTES, board, glyphOf } from './board'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

/** The palette matching Claude Code's theme. */
async function paletteFor($: $) {
  const theme = await $.config.list().then(rows => rows.find(r => r.key === 'theme')?.value, () => undefined)
  return typeof theme === 'string' && theme.startsWith('light') ? PALETTES.light : PALETTES.dark
}

/** Plays what is typed, or the one legal move it can still become. */
function submit($: $, text: string) {
  return change($, a => {
    const options = completions(a.fen, text)
    return play(a, options.length === 1 ? options[0]! : text)
  })
}

export const registerPane = (on: Parameters<Register>[0]) => {
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const { Box, Text, Button, Link } = els
    const Input = 'Input' in els ? els.Input : undefined
    const v = await read($, view)
    const t = messagesOf(v)
    const a = v.attempt

    const footer = (
      <Text dimColor>
        {[t.theme(v.theme), t.pane.streak(v.progress.streak, v.progress.best), ...(v.dueCount ? [t.pane.dueCount(v.dueCount)] : [])].join(' · ')}
      </Text>
    )

    if (!a) {
      return (
        <Box flexDirection="column">
          <Text dimColor>{v.isLoading ? t.pane.loading : v.error ? t.pane.loadFailed(v.error) : ''}</Text>
          {!v.isLoading && <Button key="retry" onPress={() => void loadNext($)}>{t.pane.retry}</Button>}
          {footer}
        </Box>
      )
    }

    const isPlaying = a.status === 'playing'
    const suggestions = isPlaying && v.typed ? completions(a.fen, v.typed) : []
    const header = [
      ...(a.isReview ? [`↻ ${t.pane.review}`] : []),
      ...(a.puzzle.rating ? [`★${a.puzzle.rating}`] : []),
      t.side(solverOf(a)),
      ...a.puzzle.themes.slice(0, 2).map(t.theme),
    ].join(' · ')

    return (
      <Box flexDirection="column">
        <Text dimColor>{header}</Text>
        {board(els, a, await paletteFor($), square => void change($, x => click(x, square)))}
        <Text color={a.status === 'solved' ? 'success' : a.feedback.kind === 'wrong' ? 'error' : undefined}>
          {t.feedback(a.feedback, solverOf(a))}
        </Text>
        {a.played.length > 0 && <Text dimColor>{moveLine(a)}</Text>}
        {v.isLoading && <Text dimColor>{t.pane.loading}</Text>}
        {v.error && !v.isLoading && <Text color="error">{t.pane.loadFailed(v.error)}</Text>}
        {Input && isPlaying && (
          <Input
            key={`move-${a.puzzle.id}`}
            placeholder={t.pane.moveField}
            autoFocus
            onInput={value => void update($, view, x => ({ ...x, typed: value }))}
            onSubmit={value => {
              void update($, view, x => ({ ...x, typed: undefined }))
              void submit($, value)
            }}
          />
        )}
        {a.promoting ? (
          <Box flexDirection="row" gap={1}>
            <Text>{t.pane.promoteTo}</Text>
            {['q', 'r', 'b', 'n'].map(piece => (
              <Button key={`promote-${piece}`} onPress={() => void change($, x => promote(x, piece))}>{glyphOf(piece)}</Button>
            ))}
          </Box>
        ) : suggestions.length > 0 ? (
          <Text dimColor>{`→ ${suggestions.slice(0, 10).join(' ')}${suggestions.length > 10 ? ' …' : ''}`}</Text>
        ) : v.typed && isPlaying ? (
          <Text color="error">{t.pane.noMove}</Text>
        ) : null}
        <Box flexDirection="row" gap={1}>
          {isPlaying && <Button key="hint" hotkey="h" onPress={() => void change($, hint)}>{t.pane.hint}</Button>}
          {isPlaying && <Button key="reveal" hotkey="s" onPress={() => void change($, reveal)}>{t.pane.solution}</Button>}
          <Button key="next" hotkey="n" variant={isPlaying ? undefined : 'primary'} onPress={() => void next($)}>{t.pane.next}</Button>
          <Link href={puzzleUrl(a.puzzle.id)} label="Lichess ↗" />
          {!isPlaying && <Link href={analysisUrl(a.puzzle.fen, solverOf(a))} label={t.pane.analyse} />}
        </Box>
        {footer}
      </Box>
    )
  })
}
