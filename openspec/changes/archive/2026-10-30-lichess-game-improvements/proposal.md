# Proposal

## Why

The first real game (task 5.3 of `lichess-games`) showed two gaps. Only Stockfish level 3 was reachable without typing a command, because the pane's buttons start fixed settings. And there was no move history. Live clocks also fight the way the mod is used: a 10+0 game runs on while you read Claude's answer. A correspondence game fits better: one move per Claude turn, no clock pressure.

## What Changes

- **Setup screen**: 🤖 and 👤 open a screen in the pane.
  - Against Stockfish: level 1–8, a clock or days per move, and a colour.
  - Against a person: a clock or days per move, casual or rated.
  - ▶ Play starts the game. The last choices are remembered, so Play is usually one press.
  - `/chess-break play …` stays as the shortcut and also updates the remembered choices.
- **Move list**: numbered moves in SAN between the two clocks.
  - Read-only while the game is on; older moves scroll off behind `…`.
  - Once the game ends: click a move, or use `j` / `k`, to see the board at that point, as in finished puzzles.
- **Material**: the sidebar shows captured pieces and the material difference (`+2`) beside each player.
- **Low time**: in a live game, your clock turns red under 30 seconds, and one beep plays (where the host plays sounds).
- **Takeback against Stockfish**: a ↩ button, and `/chess-break takeback`. Against a person it is not offered, and the opponent's takeback requests are declined.
- **Opponent moved**: when the opponent moves while the pane is hidden or Claude is idle, a toast says so (`♞ Stockfish played Nf6`), with an optional sound (`gameSound` in `/config`, off by default).
- **Correspondence games**:
  - Days per move (1, 2, 3, 5, 7, 10 or 14) against Stockfish or in a seek. Several such games at once, beside at most one live game.
  - A games list in the pane marks the ones awaiting your move.
  - When Claude starts working, a correspondence game awaiting your move comes before puzzles.
  - The prompt line says how many games await you.
  - A correspondence game never holds the pane open when Claude is done: it has no clock to lose on.

Not in this change: premove, challenging a friend, a recent-games history, Claude explaining a game, blunders turned into puzzles, and training drills.

## Capabilities

### New Capabilities
- `lichess-correspondence`: correspondence games, several at once — the games list, which game the pane shows when Claude starts, the prompt line's count, and the alerts for slow games.

### Modified Capabilities
- `lichess-games`: the setup screen replaces fixed button settings; the move list, material and low-time warning join the live board; takeback against Stockfish; the opponent-moved alert; days per move as a clock choice.

`lichess-games` exists only as the open change `lichess-games` until that change is archived and its spec synced. **This change must be archived after it.**

## Impact

- `hooks/ui/game.tsx`: the setup screen, the move list, the material, the low-time colour, the games list.
- `hooks/ui/pane.tsx`: the 🤖 and 👤 buttons open the setup screen.
- `hooks/ui/hint.tsx`: the prompt line's game count.
- `hooks/training/game.ts`: SAN moves, material, replay after the end, settings with days, and turning the account's game list into the pane's.
- `hooks/lichess/game.ts`:
  - the takeback address and `days` in the forms;
  - reading `/api/account/playing`'s game list;
  - takeback offers in the state lines.
- `hooks/app/game.ts`:
  - one stream for the game shown, not one per game;
  - a refresh of the games list at the start of a turn and every few minutes;
  - takeback, the alerts, remembered settings in `$.store`.
- `hooks/register.ts`: `turn.start` opens a correspondence game awaiting you; `turn.complete` holds the pane only for a live game.
- `.claude-plugin/plugin.json`: the `gameSound` setting. `types/index.d.ts` and `hooks/i18n/*`: the new state and texts in four languages.
- `tests/`, `README.md`.
