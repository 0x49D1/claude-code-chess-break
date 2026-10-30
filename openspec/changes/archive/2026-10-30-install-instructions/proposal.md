# Proposal

## Why

Two gaps in the docs:

- **Installing.** The README's only install line is `claude --plugin-dir /path/to/chess-break`. That loads the mod for one session, from a clone: fine for development, not for someone who just wants the mod. `claude plugin validate` asks for a marketplace install line. The repo already ships `.claude-plugin/marketplace.json`, but nothing says how to use it, how to update, or how to remove the mod.
- **Code guidelines for agents.** `AGENTS.md` lists the engine's rules and where files go, but not how the code is meant to be written. The code keeps a clear shape: a pure core, a thin layer that uses `$`, values instead of thrown errors past the parsers. An agent that doesn't see that shape writes code against it. Claude Code already reads `AGENTS.md` on its own, so the guidelines only need to be in it.

## What Changes

- **README, Install section, rewritten:**
  - **From GitHub** (the usual way): the one-step `/plugin install chess-break --marketplace 0x49D1/claude-code-chess-break` for Claude Code 2.1.275 and later, and the two-step form (`/plugin marketplace add`, then `/plugin install chess-break@chess-break`) for older versions.
  - **From a clone:** the same steps with the clone's path as the marketplace.
  - **For development:** `claude --plugin-dir .`, as now.
  - **Requirements:** the Claude Code version; `python3` for the browser sign-in; `curl` for games.
  - **Updating** (`/plugin marketplace update`) and **removing** (`/plugin uninstall chess-break`).
  - **Checking it works:** `/chess-break` opens the pane.
- **`.claude-plugin/marketplace.json`:** a description, which `validate` warns is missing.
- **`AGENTS.md`, a TypeScript architecture section,** taken from how the code is written:
  - **Layers:** a pure core that is never given `$` (`hooks/chess`, `training`, `lichess`, `chesscom`, `offline`); actions that use `$` (`hooks/app`); drawing (`hooks/ui`); commands as a thin router. Each layer may only import the ones below it.
  - **State:** data in `types/index.d.ts`, plain objects, updated immutably through `update`. No classes.
  - **Discriminated unions:** for what the pane says (`Feedback`, `GameNote`), put into words only by `hooks/i18n`.
  - **Trust boundaries:** JSON from Lichess, Chess.com and the store is read in one `read…`/`parse…` function each, the only place a cast is allowed. No `any`.
  - **Errors:** parsers may throw. Actions turn failures into values the pane shows; a refused request is never thrown past `hooks/app`.
  - **Module-level mutable state:** only for process handles and timers, each with a comment.
  - **Background work:** every `void` promise ends in `.catch`.
  - **Size:** a file past about 250 lines, or a function past about 40, is split along a layer line. No new dependency without a reason the change states.
  - **Tests:** pure logic tested directly, actions through stubbed `http.fetch` and `process.spawn`.
  - **Done means:** `tsc` clean, tests passing, and no new TS errors. `validate` checks no types.
  - **Patterns to refuse:** a type guard narrowing to `never`, `as` to silence the compiler, an action throwing to the UI, a helper used once.

The repository is `0x49D1/claude-code-chess-break` on GitHub. Out of scope: publishing to it (pushing the branch, a release), and any code change.

## Capabilities

### New Capabilities
None. Docs only.

### Modified Capabilities
None. No behaviour changes, so the change sets `skip_specs: true`.

## Impact

- `README.md`: the Install section, and a line in Development pointing to `AGENTS.md`.
- `AGENTS.md`: the new section.
- `.claude-plugin/marketplace.json`: a description.
