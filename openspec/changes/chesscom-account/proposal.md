# Proposal

## Why

Chess.com is the biggest chess site, and the mod only uses it for random daily puzzles. Many people have their ratings and their daily (correspondence) games there. While Claude works, the pane could show those ratings, and say when it's your move in a daily game and what the position is.

Chess.com's public API is read-only and has no sign-in: "You cannot send game-moves or other commands to Chess.com from this system" (its Published-Data API page). So this connects a public username, not an account. It shows your games but can't play them. The Lichess code is still changing, so this change must not touch it.

## What Changes

- **Connect by username:** `/chess-break chesscom <name>` checks the name against Chess.com and keeps it. `/chess-break chesscom off` forgets it. There's no token and nothing secret.
- **One account at a time:**
  - connecting Chess.com while signed in to Lichess is refused, with "sign out of Lichess first";
  - signing in to Lichess while Chess.com is connected makes Chess.com disconnect itself, with a one-line note;
  - the Lichess sign-in code is not changed.
- **Ratings in the sidebar:** rapid, blitz, bullet and daily, plus the best tactics rating. Chess.com gives no current tactics rating.
- **Daily games in the sidebar:** each game's opponent, time left and whose move it is, your-move games first.
- **A game's position:** choosing a game shows its position on the pane's board, read-only, with "Play on Chess.com ↗" and "Analyse on Lichess ↗" links and the way back.
- **Kept current:** read when the pane opens, then every 5 minutes, one request at a time.
- **Prompt line:** while the pane is hidden, "your move ×N" for Chess.com is added to the end of the line, unless a Lichess game or seek holds it.
- **Isolation:**
  - no file under `hooks/lichess/` changes, and neither do `hooks/app/game.ts`, `hooks/app/account.ts` or `hooks/ui/game.tsx`;
  - every existing test passes without being edited;
  - a Chess.com failure shows only in the Chess.com part of the pane.

Out of scope:
- making moves, and live Chess.com games: the API can't;
- replaying or explaining your past games: a later change;
- merging the list with Lichess correspondence games (`lichess-game-improvements`): later, once that change has landed;
- a Chess.com game opening the pane by itself, or a toast;
- opponents' ratings, which would take one more call per opponent;
- the puzzle source: `source chesscom` keeps working with no username.

## Capabilities

### New Capabilities
- `chesscom-account`: connecting a Chess.com username, the one-account rule, and the ratings shown for it.
- `chesscom-daily-games`: the person's Chess.com daily games: the list, whose move, time left, the read-only position, the prompt line, and keeping them current.

### Modified Capabilities
None: `openspec/specs/` has no specs yet.

## Impact

- New: `hooks/chesscom/player.ts` (pure reads of `/pub/player/{u}`, `/stats` and `/games`), `hooks/app/chesscom.ts` (actions and the poll), `hooks/ui/chesscom.tsx` (sidebar section and game view), `tests/chesscom.test.ts`, `tests/chesscom-pane.test.ts`.
- Additive edits:
  - `types/index.d.ts`: a separate `chesscom` view field;
  - `hooks/i18n/*`: texts in four locales;
  - `hooks/ui/pane.tsx`: one sidebar section, one routing line;
  - `hooks/ui/hint.tsx`: one segment;
  - `hooks/commands.ts`: one verb;
  - `hooks/register.ts`: restore the username and start the poll;
  - `README.md`.
- Network: `api.chess.com/pub/player/...`, with the existing `USER_AGENT`. No new dependency.
