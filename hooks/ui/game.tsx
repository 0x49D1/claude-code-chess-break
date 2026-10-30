import { atom, update } from 'claude-code'
import type { Elements } from 'claude-code'

import type { Game, View } from '../../types'
import { signIn } from '../app/account'
import { backToPuzzles } from '../app/actions'
import { abort, cancelSeek, draw, gameMove, playAgain, resign, takeback } from '../app/game'
import { INITIAL_VIEW } from '../app/state'
import type { $ } from '../app/state'
import { completions } from '../chess/position'
import { playerName } from '../i18n'
import type { Messages } from '../i18n'
import { gameUrl } from '../lichess/game'
import { canAbort, clickGame, clockLeft, endingOf, formatClock, gameAtPly, isMyTurn, isOn, material, moveRows, outcomeOf, playGame, playTyped, sanMoves } from '../training/game'
import { board, glyphOf } from './board'

const view = atom({ plugin: 'chess-break', key: 'view' } as const, INITIAL_VIEW)

/** A player as the pane names them: Stockfish by its level, a person by name and rating. */
function nameOf(g: Game, side: 'w' | 'b', t: Messages) {
  const p = side === 'w' ? g.white : g.black
  return `${playerName(t, p)}${p.rating && !p.aiLevel ? ` (${p.rating})` : ''}`
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
  const counts = material(g.fen)
  const clockLine = (side: 'w' | 'b') => {
    const ms = side === 'w' ? left.white : left.black
    const { captured, lead } = counts[side]
    const taken = captured.map(p => glyphOf(side === 'w' ? p : p.toUpperCase())).join('')
    const isLow = isPlaying && side === g.side && !g.isCorrespondence && ms < 30_000
    return (
      <Text key={`clock-${side}`} bold={isPlaying && toMove === side} color={isLow ? 'error' : undefined}>
        {`${isPlaying && toMove === side ? '▶' : ' '} ⏱ ${formatClock(ms, g.isCorrespondence)}  ${nameOf(g, side, t)}${taken ? `  ${taken}` : ''}${lead ? ` +${lead}` : ''}`}
      </Text>
    )
  }
  // Once the game is over, its moves replay on the board, as a finished puzzle's do.
  const sans = sanMoves(g)
  const ply = isPlaying ? sans.length : Math.min(v.replayPly ?? sans.length, sans.length)
  const shown = isPlaying ? g : gameAtPly(g, ply)
  const goTo = (n: number) => void update($, view, x => ({ ...x, replayPly: Math.max(0, Math.min(n, sans.length)) }))
  const { isCut, rows } = moveRows(sans)
  const moveList = (
    <Box flexDirection="column">
      {isCut && <Text dimColor>…</Text>}
      {rows.map(row => (
        <Box key={`moves-${row.number}`} flexDirection="row" columnGap={1}>
          <Text dimColor>{`${row.number}.`}</Text>
          {row.sans.map((san, i) => {
            const at = row.ply + i + 1
            const label = <Text inverse={at === ply}>{san}</Text>
            return isPlaying ? (
              <Box key={`san-${at}`}>{label}</Box>
            ) : (
              <Button key={`game-ply-${at}`} plain onPress={() => goTo(at)}>{label}</Button>
            )
          })}
        </Box>
      ))}
    </Box>
  )
  const hasMoved = g.moves.length > (g.side === 'w' ? 0 : 1)
  const canTakeBack = isPlaying && hasMoved && !!(opponent === 'w' ? g.white : g.black).aiLevel
  const title = [`⚔ ${nameOf(g, opponent, t)}`, g.isRated ? t.game.rated : t.game.casual, ...(g.settings ? [g.settings.clock] : [])].join('  ·  ')
  const suggestions = isMyTurn(g) && v.typed ? completions(g.fen, v.typed) : []

  return (
    <Box flexDirection="column">
      <Text bold>{title}</Text>
      <Box flexDirection="row" gap={2}>
        <Box borderStyle="round" borderDimColor paddingX={1}>
          {board(els, { fen: shown.fen, side: g.side, lastMove: shown.lastMove, selected: g.selected, isActive: isMyTurn(g) }, square => void gameMove($, x => clickGame(x, square)))}
        </Box>
        <Box flexDirection="column">
          {clockLine(opponent)}
          {moveList}
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
          {canTakeBack && <Button key="takeback" plain onPress={() => void takeback($)}>{`↩ ${t.game.takeback}`}</Button>}
          {g.isCorrespondence && <Button key="games" plain onPress={() => void backToPuzzles($)}>{`☰ ${t.game.games}`}</Button>}
        </Box>
      ) : (
        <Box flexDirection="row" gap={2}>
          <Button key="game-back" plain hotkey="j" onPress={() => goTo(ply - 1)}>◀</Button>
          <Button key="game-forward" plain hotkey="k" onPress={() => goTo(ply + 1)}>▶</Button>
          {g.settings && <Button key="play-again" plain onPress={() => void playAgain($)}>{`🔄 ${t.game.playAgain}`}</Button>}
          <Button key="puzzles" plain onPress={() => void backToPuzzles($)}>{`🧩 ${t.game.puzzles}`}</Button>
          <Link href={gameUrl(g.id)} label="Lichess ↗" />
        </Box>
      )}
    </Box>
  )
}
