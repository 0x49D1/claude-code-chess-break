import { atom, read, update } from 'claude-code'
import type { Elements, Register } from 'claude-code'

import type { Feedback, View } from '../../types'
import { cancelSignIn, signIn, signOut, switchRated, useToken } from '../app/account'
import { change, explain, loadNext, next } from '../app/actions'
import { openSetup, showGame } from '../app/game'
import { INITIAL_VIEW, PANE, messagesOf } from '../app/state'
import type { $ } from '../app/state'
import { completions } from '../chess/position'
import { gameLine } from '../i18n'
import type { Messages } from '../i18n'
import { TOKEN_PAGE } from '../lichess/auth'
import { analysisUrl } from '../lichess/client'
import { atPly, click, hint, moveLabels, moveLine, play, promote, reveal, solverOf } from '../training/attempt'
import { learnLinks, readExplanation } from '../training/explain'
import { awaiting, isOn } from '../training/game'
import { themeLines } from '../training/progress'
import { board, glyphOf } from './board'
import { gamePane } from './game'
import { setupPane } from './setup'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

/** Each kind of feedback by its emoji; the words are the language's. */
function emojiOf(f: Feedback) {
  switch (f.kind) {
    case 'start': return '🎯'
    case 'right': return '✅'
    case 'reply': return '👉'
    case 'wrong': return '❌'
    case 'illegal': return '🚫'
    case 'command': return '⌨'
    case 'hint': return '💡'
    case 'solved': return f.isClean ? '🎉' : '👍'
    case 'revealed': return '👀'
  }
}

/** Accuracy as a short bar: `▰▰▰▱▱▱`. */
const bar = (percent: number, cells = 6) => {
  const filled = Math.round((percent / 100) * cells)
  return '▰'.repeat(filled) + '▱'.repeat(cells - filled)
}

/** The training column beside the board: this session, the streak, reviews, the themes tried most. */
function sidebar($: $, els: Elements[keyof Elements], v: View, t: Messages) {
  const { Box, Text, Button } = els
  const marks = v.session.slice(-8).map(r => (r === 'clean' ? '🟩' : '🟥')).join('')
  const diff = v.ratingDiff === undefined ? '' : ` (${v.ratingDiff >= 0 ? '+' : ''}${v.ratingDiff})`
  // The games awaiting the person first, then the others.
  const games = [...awaiting(v.games ?? []), ...(v.games ?? []).filter(g => !g.isMyTurn)]
  return (
    <Box flexDirection="column">
      {v.account ? (
        <Box flexDirection="row" gap={1}>
          <Text>{`👤 ${v.account.username}${v.account.rating ? ` · ⭐ ${v.account.rating}${diff}` : ''}`}</Text>
          <Button key="rated" plain dimColor hotkey="c" onPress={() => void switchRated($).catch(() => undefined)}>{v.isRated ? t.game.rated : t.game.casual}</Button>
          <Button key="logout" plain dimColor onPress={() => void signOut($)}>{t.pane.signOut}</Button>
        </Box>
      ) : (
        <Button key="login" plain hotkey="l" onPress={() => void signIn($)}>{`🔑 ${t.pane.signIn}`}</Button>
      )}
      <Text bold>{`⚔ ${t.game.newGame}`}</Text>
      <Box flexDirection="row" gap={1}>
        <Button key="play-stockfish" plain onPress={() => void openSetup($, 'ai')}>{'🤖 Stockfish'}</Button>
        <Button key="play-human" plain onPress={() => void openSetup($, 'seek')}>{`👤 ${t.game.person}`}</Button>
      </Box>
      {v.gameNote && <Text color={v.gameNote.kind === 'seekPosted' ? undefined : 'error'}>{t.game.note(v.gameNote)}</Text>}
      {games.map(g => (
        <Button key={`game-${g.id}`} plain onPress={() => void showGame($, g.id)}>
          <Text bold={g.isMyTurn}>
            {gameLine(t, g)}
          </Text>
        </Button>
      ))}
      <Text bold>{`📈 ${t.pane.session}`}</Text>
      <Text>{marks || '·'}</Text>
      <Text>{`🔥 ${t.pane.streak(v.progress.streak, v.progress.best)}`}</Text>
      <Text>{`🔁 ${v.dueCount ? t.pane.dueCount(v.dueCount) : t.pane.noneDue}`}</Text>
      {themeLines(v.progress).slice(0, 3).map(line => (
        <Text key={`theme-${line.theme}`} dimColor>{`${bar(line.accuracy)} ${t.theme(line.theme)}`}</Text>
      ))}
    </Box>
  )
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

    if (v.signIn) {
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>{`🔑 ${t.pane.signInTitle}`}</Text>
          {v.signIn.url ? <Link href={v.signIn.url} label={t.pane.openLichess} /> : <Text dimColor>{t.pane.starting}</Text>}
          {Input && (
            <Box flexDirection="column">
              <Text>{t.pane.orPaste}</Text>
              <Input key="token" placeholder="lip_…" autoFocus onSubmit={value => void useToken($, value)} />
              <Link href={TOKEN_PAGE} label={t.pane.createToken} />
            </Box>
          )}
          {v.signIn.failed && <Text color="error">{t.pane.signInFailed(v.signIn.failed)}</Text>}
          <Text dimColor>{t.pane.tokenStays}</Text>
          <Button key="cancel-login" plain onPress={() => void cancelSignIn($)}>{`✖ ${t.pane.cancel}`}</Button>
        </Box>
      )
    }

    const isLiveOn = !!v.game && isOn(v.game) && !v.game.isCorrespondence
    if (v.setup && !isLiveOn && !v.seeking) return setupPane($, els, v.setup, v, t)
    if (v.game || v.seeking) return gamePane($, els, v, t)

    if (!a) {
      return (
        <Box flexDirection="row" gap={2}>
          <Box flexDirection="column">
            <Text>{v.isLoading ? `⏳ ${t.pane.loading}` : '♞'}</Text>
            {!v.isLoading && <Button key="retry" plain hotkey="r" onPress={() => void loadNext($)}>{`🔄 ${t.pane.retry}`}</Button>}
          </Box>
          {sidebar($, els, v, t)}
        </Box>
      )
    }

    const isPlaying = a.status === 'playing'
    // A finished puzzle can be replayed move by move; the board shows the move picked.
    const labels = moveLabels(a)
    const ply = isPlaying ? labels.length : Math.min(v.replayPly ?? labels.length, labels.length)
    const shown = isPlaying ? a : atPly(a, ply)
    const goTo = (n: number) => void update($, view, x => ({ ...x, replayPly: Math.max(0, Math.min(n, labels.length)) }))
    const explanation = v.explanation?.puzzleId === a.puzzle.id ? v.explanation : undefined
    const suggestions = isPlaying && v.typed ? completions(a.fen, v.typed) : []
    const title = [
      a.puzzle.source === 'chesscom' ? `🧩 ${a.puzzle.title ?? t.pane.dailyPuzzle}` : `🧩 ${t.theme(v.theme)}`,
      ...(a.isReview ? [`🔁 ${t.pane.review}`] : []),
      ...(a.puzzle.rating ? [`⭐ ${a.puzzle.rating}`] : []),
      t.pane.toPlay(solverOf(a)),
    ].join('  ·  ')

    return (
      <Box flexDirection="column">
        <Text bold>{title}</Text>
        <Box flexDirection="row" gap={2}>
          <Box borderStyle="round" borderDimColor paddingX={1}>
            {board(els, { ...shown, side: solverOf(a), isActive: shown.status === 'playing' }, square => void change($, x => click(x, square)))}
          </Box>
          {sidebar($, els, v, t)}
        </Box>
        <Text color={a.status === 'solved' ? 'success' : a.feedback.kind === 'wrong' ? 'error' : undefined}>
          {`${emojiOf(a.feedback)} ${t.feedback(a.feedback, solverOf(a))}`}
        </Text>
        {isPlaying && a.played.length > 0 && <Text dimColor>{`📜 ${moveLine(a)}`}</Text>}
        {!isPlaying && labels.length > 0 && (
          <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
            <Text dimColor>📜</Text>
            <Button key="ply-0" plain onPress={() => goTo(0)}>
              <Text inverse={ply === 0}>⏮</Text>
            </Button>
            {labels.map((label, i) => (
              <Button key={`ply-${i + 1}`} plain onPress={() => goTo(i + 1)}>
                <Text inverse={ply === i + 1}>{label}</Text>
              </Button>
            ))}
            <Button key="back" plain hotkey="j" onPress={() => goTo(ply - 1)}>◀</Button>
            <Button key="forward" plain hotkey="k" onPress={() => goTo(ply + 1)}>▶</Button>
          </Box>
        )}
        {!isPlaying && a.puzzle.themes.length > 0 && <Text dimColor>{`🔖 ${a.puzzle.themes.map(t.theme).join(' · ')}`}</Text>}
        {explanation?.text ? (
          (({ why, tip, fact }) => (
            <Box flexDirection="column">
              <Text>{`💭 ${why}`}</Text>
              {tip && <Text>{`📌 ${tip}`}</Text>}
              {fact && <Text dimColor>{`✨ ${fact}`}</Text>}
            </Box>
          ))(readExplanation(explanation.text))
        ) : explanation?.failed ? (
          <Text color="error">{`🧠 ${t.pane.explainFailed(explanation.failed)}`}</Text>
        ) : explanation ? (
          <Text dimColor>{`🧠 ${t.pane.explaining}`}</Text>
        ) : null}
        {!isPlaying && learnLinks(a.puzzle.themes).length > 0 && (
          <Box flexDirection="row" gap={2}>
            <Text dimColor>🔗</Text>
            {learnLinks(a.puzzle.themes).map(l => (
              <Link key={`learn-${l.kind}`} href={l.url} label={l.kind === 'practise' ? t.pane.practise(t.theme(l.theme)) : 'Wikipedia ↗'} />
            ))}
          </Box>
        )}
        {v.isLoading && <Text dimColor>{`⏳ ${t.pane.loading}`}</Text>}
        {v.fallback && !a.isReview && a.puzzle.source === 'offline' && (
          <Text dimColor>{`📡 ${t.pane.offlineFallback(t.source(v.source), v.fallback)}`}</Text>
        )}
        {Input && isPlaying && (
          <Input
            key={`move-${a.puzzle.id}`}
            label="›"
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
            <Text>{`👑 ${t.pane.promoteTo}`}</Text>
            {['q', 'r', 'b', 'n'].map(piece => (
              <Button key={`promote-${piece}`} plain onPress={() => void change($, x => promote(x, piece))}>
                {`[${glyphOf(solverOf(a) === 'w' ? piece.toUpperCase() : piece)}]`}
              </Button>
            ))}
          </Box>
        ) : suggestions.length > 0 ? (
          <Text dimColor>{`  ${suggestions.slice(0, 10).join('  ')}${suggestions.length > 10 ? '  …' : ''}`}</Text>
        ) : v.typed && isPlaying ? (
          <Text color="error">{`  ${t.pane.noMove}`}</Text>
        ) : null}
        <Box flexDirection="row" gap={2}>
          {isPlaying && <Button key="hint" plain hotkey="h" onPress={() => void change($, hint)}>{`💡 ${t.pane.hint}`}</Button>}
          {isPlaying && <Button key="reveal" plain hotkey="s" onPress={() => void change($, reveal)}>{`👀 ${t.pane.show}`}</Button>}
          {!isPlaying && !explanation?.text && (
            <Button key="explain" plain hotkey="e" onPress={() => void explain($).catch(() => undefined)}>{`🧠 ${t.pane.explain}`}</Button>
          )}
          <Button key="next" plain hotkey="n" onPress={() => void next($)}>{`⏩ ${t.pane.skip}`}</Button>
          {a.puzzle.url && <Link href={a.puzzle.url} label={a.puzzle.source === 'chesscom' ? 'Chess.com ↗' : 'Lichess ↗'} />}
          {!isPlaying && <Link href={analysisUrl(a.puzzle.fen, solverOf(a))} label={`🔍 ${t.pane.analyse} ↗`} />}
        </Box>
      </Box>
    )
  })
}
