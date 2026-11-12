import { MotionConfig } from 'motion/react'
import {
  useCallback,
  useLayoutEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useSettings } from '../../../state/useSettings.ts'
import { useTargets } from '../../../state/useTarget.ts'
import {
  applyTheme,
  darkQuery,
  motionQuery,
  resolveTheme,
} from '../lib/theme.ts'
import { SettingsContext, TargetsContext } from './appContext.ts'

function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const list = window.matchMedia?.(query)
      list?.addEventListener('change', callback)
      return () => list?.removeEventListener('change', callback)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(query).matches ?? false,
  )
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, update] = useSettings()
  const systemDark = useMediaQuery(darkQuery)
  const systemReduced = useMediaQuery(motionQuery)
  const resolvedTheme = resolveTheme(settings.theme, systemDark)
  const reducedMotion = settings.reduceMotion || systemReduced

  useLayoutEffect(() => {
    applyTheme(resolvedTheme, reducedMotion)
  }, [resolvedTheme, reducedMotion])

  return (
    <SettingsContext value={{ settings, update, resolvedTheme, reducedMotion }}>
      <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
        {children}
      </MotionConfig>
    </SettingsContext>
  )
}

export function TargetsProvider({ children }: { children: ReactNode }) {
  const value = useTargets()
  return <TargetsContext value={value}>{children}</TargetsContext>
}
