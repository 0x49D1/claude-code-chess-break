# Tasks

## 1. Install instructions

- [x] 1.1 The GitHub repository is `0x49D1/claude-code-chess-break` (given by the maintainer; the marketplace and plugin are both `chess-break`). Find the lowest Claude Code version the mod runs on. That's the engine version its types and `$` calls need, not a guess: check `claude plugin validate`'s advice and the types' header. Verify: both are written down in this task before 1.2

  Found: the types' header reads "Written by Claude Code 2.1.312", the version every test ran on. Nothing in the types names an older one, so the README says "tested on 2.1.312" and claims no minimum. The one-step install needs 2.1.275 or later (`claude plugin validate`).
- [x] 1.2 Rewrite the README's Install section:
  - from GitHub: one-step, and two-step for older versions;
  - from a clone;
  - for development;
  - requirements: version, `python3`, `curl`;
  - updating, removing, and the first check.

  Verify: `claude plugin validate .` no longer reports a missing install line
- [x] 1.3 Add a description to `.claude-plugin/marketplace.json`. Verify: `claude plugin validate .` no longer warns about it
- [x] 1.4 Follow the clone instructions in a fresh Claude Code session, with no `--plugin-dir`: add the marketplace from the clone's path, install, run `/chess-break`, update, uninstall. Verify: each step works as the README says; correct the README where it doesn't

## 2. Code guidelines for agents

- [x] 2.1 Add the TypeScript architecture section to `AGENTS.md`:
  - layers and imports, state, unions, trust boundaries, errors, module state, background work, size, tests, the definition of done, patterns to refuse;
  - each rule naming a file of this repo that shows it.

  Verify: every file named exists, and the rule holds there:
  - `git grep` finds no `class` in TypeScript, no `any`, and casts only in `read…`/`parse…` functions or store reads;
  - no file in the pure core imports `hooks/app` or `hooks/ui`.
- [x] 2.2 Point to `AGENTS.md` from the README's Development section; no `CLAUDE.md`, since Claude Code reads `AGENTS.md` itself. Verify: with no `CLAUDE.md`, a new session in the repo answers a question only `AGENTS.md` answers, with file tools disabled (it did: "300")
