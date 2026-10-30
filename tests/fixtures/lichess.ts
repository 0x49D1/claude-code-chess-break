// Lichess's answers, recorded on 2026-10-30 (task 1.1 of lichess-game-improvements), trimmed.

/** `POST /api/board/seek` with `days=3`: answered at once, in 0.14 s. */
export const CORRESPONDENCE_SEEK = '{"id":"kFQ8KsVV"}'

/** The first line of a 1-day game's stream against Stockfish 1, after e4 e5: clocks in ms. */
export const CORRESPONDENCE_FULL = JSON.stringify({
  id: 'cAf7Dbod', speed: 'correspondence', rated: false, daysPerTurn: 1, type: 'gameFull',
  white: { id: 'magnus', name: 'magnus', title: null, rating: 1549, provisional: true },
  black: { aiLevel: 1 },
  initialFen: 'startpos',
  state: { type: 'gameState', moves: 'e2e4 e7e5', wtime: 86396000, btime: 86400000, winc: 0, binc: 0, status: 'started' },
})

/** The same game after `takeback/yes`: Stockfish took back both moves at once. */
export const AFTER_TAKEBACK = '{"type":"gameState","moves":"","wtime":86396000,"btime":86400000,"winc":0,"binc":0,"status":"started"}'

/** `GET /api/account/playing` with that game on. */
export const PLAYING = JSON.stringify({
  nowPlaying: [{
    fullId: 'cAf7DbodVSuX', gameId: 'cAf7Dbod', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    color: 'white', lastMove: '', source: 'ai', status: { id: 20, name: 'started' }, speed: 'correspondence',
    rated: false, hasMoved: false, opponent: { id: null, username: 'Stockfish level 1', ai: 1 },
    isMyTurn: true, secondsLeft: 86392,
  }],
  nbMyTurn: 1,
})

/** `GET /api/account/playing` with nothing on. */
export const PLAYING_NONE = '{"nowPlaying":[],"nbMyTurn":0}'
