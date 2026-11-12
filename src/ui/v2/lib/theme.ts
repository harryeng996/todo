import type { ThemeChoice } from '../../../state/useSettings.ts'

export function resolveTheme(
  choice: ThemeChoice,
  systemDark: boolean,
): 'light' | 'dark' {
  if (choice !== 'system') return choice
  return systemDark ? 'dark' : 'light'
}

/** Sets the theme on <html> (also called before the first render to avoid a flash). */
export function applyTheme(theme: 'light' | 'dark', reducedMotion: boolean) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.dataset.motion = reducedMotion ? 'reduced' : 'full'
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#0a0b0e' : '#f5f6f8')
}

export const darkQuery = '(prefers-color-scheme: dark)'
export const motionQuery = '(prefers-reduced-motion: reduce)'
