import { createContext, useContext } from 'react'
import type { Settings } from '../../../state/useSettings.ts'
import type { Target } from '../../../types/target.ts'

export interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  /** Theme after resolving 'system'. */
  resolvedTheme: 'light' | 'dark'
  /** The user or the system asked for less motion. */
  reducedMotion: boolean
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useAppSettings(): SettingsContextValue {
  const value = useContext(SettingsContext)
  if (!value)
    throw new Error('useAppSettings must be used inside <AppSettingsProvider>')
  return value
}

export interface TargetsContextValue {
  targets: Target[]
  saveTarget: (target: Target) => void
  removeTarget: (id: string) => void
}

/** One shared list, so Home and Settings stay in step. */
export const TargetsContext = createContext<TargetsContextValue | null>(null)

export function useTargetList(): TargetsContextValue {
  const value = useContext(TargetsContext)
  if (!value)
    throw new Error('useTargetList must be used inside <TargetsProvider>')
  return value
}
