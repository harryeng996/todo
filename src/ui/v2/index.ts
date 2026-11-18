// v2 entry: the multi-screen redesign.
import '@fontsource-variable/inter'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/shell.css'
import './styles/screens.css'
import './styles/icons.css'
import { loadSettings } from '../../state/useSettings.ts'
import {
  applyTheme,
  darkQuery,
  motionQuery,
  resolveTheme,
} from './lib/theme.ts'

// Set the theme before the first paint so dark mode doesn't flash white.
{
  const { theme, reduceMotion } = loadSettings()
  const matches = (q: string) => window.matchMedia?.(q).matches ?? false
  applyTheme(
    resolveTheme(theme, matches(darkQuery)),
    reduceMotion || matches(motionQuery),
  )
}

export { default } from './App.tsx'
