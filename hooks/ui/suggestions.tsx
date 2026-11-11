import type { Elements } from 'claude-code'

/** Suggestions the row has room for. */
const SHOWN = 10

/**
 * The legal moves what is typed can become, as buttons under the move field: ↓ from the field
 * reaches them, ← → walk them, Enter or a click plays one. They have no hotkey: a typed move must
 * never press one.
 */
export function suggestionRow(els: Elements[keyof Elements], prefix: string, suggestions: string[], pick: (san: string) => void) {
  const { Box, Text, Button } = els
  return (
    <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
      {suggestions.slice(0, SHOWN).map(san => (
        <Button key={`${prefix}-${san}`} plain onPress={() => pick(san)}>{san}</Button>
      ))}
      {suggestions.length > SHOWN && <Text dimColor>…</Text>}
    </Box>
  )
}

/** Beside the field while one move is left: Enter plays it. */
export const submitLabelOf = (suggestions: string[]) => (suggestions.length === 1 ? { submitLabel: `▶ ${suggestions[0]}` } : {})
