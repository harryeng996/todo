import type { Phase } from '../../../state/pomodoro.ts'

/** Focus is warm, breaks are calm. */
export const phaseColor = (phase: Phase) =>
  phase === 'focus' ? 'var(--focus)' : 'var(--break)'
