import { atom, update } from 'claude-code'
import type { Elements } from 'claude-code'

import type { Game, View } from '../../types'
import { signIn } from '../app/account'
import { backToPuzzles } from '../app/actions'
import { abort, cancelSeek, draw, gameMove, playAgain, resign } from '../app/game'
import { INITIAL_VIEW } from '../app/state'
import type { $ } from '../app/state'
import { completions } from '../chess/position'
import type { Messages } from '../i18n'
import { gameUrl } from '../lichess/game'
import { canAbort, clickGame, clockLeft, endingOf, formatClock, isMyTurn, isOn, outcomeOf, playGame, playTyped } from '../training/game'
import { board, glyphOf } from './board'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

/** A player as the pane names them: Stockfish by its level, a person by name and rating. */
function nameOf(g: Game, side: 'w' | 'b', t: Messages) {
  const p = side === 'w' ? g.white : g.black
  if (p.aiLevel) return t.game.stockfish(p.aiLevel)
  return `${p.name ?? t.game.anonymous}${p.rating ? ` (${p.rating})` : ''}`
}

/** The seek waiting for a pairing, or the game: clocks beside the board, then its actions. */
export function gamePane($: $, els: Elements[keyof Elements], v: View, t: Messages) {
  const { Box, Text, Button, Link } = els
  const Input = 'Input' in els ? els.Input : undefined
  const note = v.gameNote && (
    <Box flexDirection="row" gap={1}>
      <Text color={v.gameNote.kind === 'reconnecting' || v.gameNote.kind === 'confirmResign' ? 'warning' : 'error'}>{t.game.note(v.gameNote)}</Text>
      {v.gameNote.kind === 'renewSignIn' && <Button key="login-again" plain onPress={() => void signIn($)}>{`🔑 ${t.pane.signIn}`}</Button>}
    </Box>
  )
  const g = v.game
  if (!g) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text>{`⏳ ${v.seeking ? t.game.searching(v.seeking.clock, v.seeking.rated) : ''}`}</Text>
        {note}
        <Button key="cancel-seek" plain onPress={() => void cancelSeek($)}>{`✖ ${t.pane.cancel}`}</Button>
      </Box>
    )
  }

  const isPlaying = isOn(g)
  const opponent = g.side === 'w' ? 'b' : 'w'
  // Whose clock runs is Lichess's word, not the pending move's.
  const toMove = g.moves.length % 2 === 0 ? 'w' : 'b'
  const left = clockLeft(g)
  const clockLine = (side: 'w' | 'b') => (
    <Text key={`clock-${side}`} bold={isPlaying && toMove === side}>
      {`${isPlaying && toMove === side ? '▶' : ' '} ⏱ ${formatClock(side === 'w' ? left.white : left.black)}  ${nameOf(g, side, t)}`}
    </Text>
  )
  const title = [`⚔ ${nameOf(g, opponent, t)}`, g.isRated ? t.game.rated : t.game.casual, ...(g.settings ? [g.settings.clock] : [])].join('  ·  ')
  const suggestions = isMyTurn(g) && v.typed ? completions(g.fen, v.typed) : []

  return (
    <Box flexDirection="column">
      <Text bold>{title}</Text>
      <Box flexDirection="row" gap={2}>
        <Box borderStyle="round" borderDimColor paddingX={1}>
          {board(els, { fen: g.fen, side: g.side, lastMove: g.lastMove, selected: g.selected, isActive: isMyTurn(g) }, square => void gameMove($, x => clickGame(x, square)))}
        </Box>
        <Box flexDirection="column">
          {clockLine(opponent)}
          {clockLine(g.side)}
        </Box>
      </Box>
      <Text color={!isPlaying ? (outcomeOf(g) === 'win' ? 'success' : undefined) : undefined}>
        {isPlaying ? (isMyTurn(g) ? `👉 ${t.game.yourMove}` : `⏳ ${t.game.theirMove}`) : `🏁 ${t.game.over(outcomeOf(g), endingOf(g.status))}`}
      </Text>
      {isPlaying && g.drawOffer === opponent && (
        <Box flexDirection="row" gap={2}>
          <Text>{`🤝 ${t.game.drawOffered}`}</Text>
          <Button key="draw-yes" plain onPress={() => void draw($, true)}>{`✔ ${t.game.accept}`}</Button>
          <Button key="draw-no" plain onPress={() => void draw($, false)}>{`✖ ${t.game.decline}`}</Button>
        </Box>
      )}
      {isPlaying && g.drawOffer === g.side && <Text dimColor>{`🤝 ${t.game.drawYours}`}</Text>}
      {note}
      {Input && isMyTurn(g) && (
        <Input
          key={`game-move-${g.id}`}
          label="›"
          placeholder={t.pane.moveField}
          autoFocus
          onInput={value => void update($, view, x => ({ ...x, typed: value }))}
          onSubmit={value => {
            void update($, view, x => ({ ...x, typed: undefined }))
            void gameMove($, x => playTyped(x, value))
          }}
        />
      )}
      {g.promoting ? (
        <Box flexDirection="row" gap={1}>
          <Text>{`👑 ${t.pane.promoteTo}`}</Text>
          {['q', 'r', 'b', 'n'].map(piece => (
            <Button key={`game-promote-${piece}`} plain onPress={() => void gameMove($, x => playGame(x, (x.promoting ?? '') + piece))}>
              {`[${glyphOf(g.side === 'w' ? piece.toUpperCase() : piece)}]`}
            </Button>
          ))}
        </Box>
      ) : suggestions.length > 0 ? (
        <Text dimColor>{`  ${suggestions.slice(0, 10).join('  ')}${suggestions.length > 10 ? '  …' : ''}`}</Text>
      ) : null}
      {isPlaying ? (
        <Box flexDirection="row" gap={2}>
          <Button key="resign" plain onPress={() => void resign($)}>{`🏳 ${t.game.resign}`}</Button>
          {!g.drawOffer && <Button key="draw" plain onPress={() => void draw($, true)}>{`🤝 ${t.game.offerDraw}`}</Button>}
          {canAbort(g) && <Button key="abort" plain onPress={() => void abort($)}>{`✖ ${t.game.abort}`}</Button>}
        </Box>
      ) : (
        <Box flexDirection="row" gap={2}>
          {g.settings && <Button key="play-again" plain onPress={() => void playAgain($)}>{`🔄 ${t.game.playAgain}`}</Button>}
          <Button key="puzzles" plain onPress={() => void backToPuzzles($)}>{`🧩 ${t.game.puzzles}`}</Button>
          <Link href={gameUrl(g.id)} label="Lichess ↗" />
        </Box>
      )}
    </Box>
  )
}
