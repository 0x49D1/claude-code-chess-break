import type { View } from '../../types'
import { isOn } from './game'

/** What the pane shows, in the order it checks: a sign-in, a game's setup, a game or seek, Progress, About, the openings, the puzzle. */
export type Screen = 'signIn' | 'setup' | 'liveGame' | 'game' | 'progress' | 'about' | 'openings' | 'puzzle'

export function screenOf(v: View): Screen {
  const isLiveOn = (!!v.game && isOn(v.game) && !v.game.isCorrespondence) || !!v.seeking
  if (v.signIn) return 'signIn'
  if (v.setup && !isLiveOn) return 'setup'
  if (isLiveOn) return 'liveGame'
  if (v.game) return 'game'
  if (v.isProgressShown) return 'progress'
  if (v.isAboutShown) return 'about'
  if (v.isOpeningsShown) return 'openings'
  return 'puzzle'
}
