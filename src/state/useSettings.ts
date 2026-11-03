import { useEffect, useState } from 'react'
import { createJsonStore } from '../lib/storage.ts'
import type { WeightUnit } from '../lib/weight.ts'

export interface Settings {
  music: boolean
  youtube: boolean
  pomodoro: boolean
  weightTracking: boolean // plus feature, off until switched on
  weightUnit: WeightUnit
}

const DEFAULTS: Settings = {
  music: true,
  youtube: true,
  pomodoro: true,
  weightTracking: false,
  weightUnit: 'kg',
}

const settingsStore = createJsonStore<Partial<Settings>>(
  'todoapp.settings.v1',
  () => ({}),
)

export function useSettings() {
  // Merge with defaults so settings added later get a value for existing users.
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULTS,
    ...settingsStore.load(),
  }))

  useEffect(() => {
    settingsStore.save(settings)
  }, [settings])

  const updateSettings = (patch: Partial<Settings>) =>
    setSettings((current) => ({ ...current, ...patch }))

  return [settings, updateSettings] as const
}
