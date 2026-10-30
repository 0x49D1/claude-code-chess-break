# Spec Delta

## Purpose

Claude explains a finished puzzle on request, in the person's language. When no explanation can be had, the person is told why in plain words.

## ADDED Requirements

### Requirement: Explanation failures say why
When Claude gives no explanation, the pane and `/chess-break explain` SHALL say why, in the person's language, as one of: out of usage limits, Claude busy, no connection, not signed in to Claude, no answer, or the request not sent. No raw code (such as `api-error`) SHALL be the only thing shown.

#### Scenario: Out of limits
- **WHEN** the person presses Explain and the model call fails with a rate limit (HTTP 429 or `rate_limit`)
- **THEN** the pane says Claude is out of usage limits for now, instead of "Claude is looking at it…"

#### Scenario: Busy
- **WHEN** the call fails as overloaded or with a 5xx status
- **THEN** the pane says Claude is busy and to try again later

#### Scenario: No connection
- **WHEN** the call fails with no response
- **THEN** the pane says Claude could not be reached

#### Scenario: Signed out of Claude
- **WHEN** the call fails with `authentication_failed`
- **THEN** the pane says Claude Code is not signed in

#### Scenario: Empty reply
- **WHEN** the model answers with no text
- **THEN** the pane says Claude gave no answer

#### Scenario: Same words from the command
- **WHEN** the person runs `/chess-break explain` and the call fails
- **THEN** the answer is the same text the pane shows

### Requirement: An explanation request always ends
A request for an explanation SHALL end in either an explanation or a failure, also when the model call itself rejects. After a failure, Explain SHALL be offered again, and pressing it SHALL ask again.

#### Scenario: Call rejects
- **WHEN** the model call rejects instead of resolving
- **THEN** the pane shows the request was not sent, "Claude is looking at it…" goes away, and nothing is thrown to the pane

#### Scenario: Retry after a failure
- **WHEN** the person presses Explain again after a failure
- **THEN** Claude is asked again for the same puzzle
