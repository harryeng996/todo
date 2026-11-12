import { useEffect, useState } from 'react'
import { createJsonStore } from '../lib/storage.ts'
import type { WeightUnit } from '../lib/weight.ts'

/** v1: the original sketch-style page. v2: the multi-screen redesign. */
export type UiVersion = 'v1' | 'v2'
export type ThemeChoice = 'system' | 'light' | 'dark'
/** v2 screensaver picture styles. */
export type PosterId = 'statement' | 'definition' | 'retro' | 'sketch' | 'quote'
export const POSTER_IDS: readonly PosterId[] = [
  'statement',
  'definition',
  'retro',
  'sketch',
  'quote',
]

export interface Settings {
  music: boolean
  youtube: boolean
  pomodoro: boolean
  weightTracking: boolean // plus feature, off until switched on
  weightUnit: WeightUnit
  uiVersion: UiVersion
  /** v2 only. */
  theme: ThemeChoice
  /** v2 only: calmer transitions, on top of the system's reduced-motion setting. */
  reduceMotion: boolean
  /** v2 only: minutes without input before the screensaver starts; 0 = never. */
  screensaverIdleMin: number
  /** v2 only: seconds each picture stays up. */
  screensaverIntervalSec: number
  /** v2 only: the picture styles in rotation (at least one). */
  screensaverPosters: PosterId[]
  /** v2 only: an analog clock on the wall. */
  screensaverClock: boolean
  /** v2 only: ask the browser to keep the screen on while it shows. */
  screensaverWakeLock: boolean
}

const DEFAULTS: Settings = {
  music: true,
  youtube: true,
  pomodoro: true,
  weightTracking: false,
  weightUnit: 'kg',
  uiVersion: 'v2',
  theme: 'system',
  reduceMotion: false,
  screensaverIdleMin: 5,
  screensaverIntervalSec: 30,
  screensaverPosters: [...POSTER_IDS],
  screensaverClock: true,
  screensaverWakeLock: false,
}

const settingsStore = createJsonStore<Partial<Settings>>(
  'todoapp.settings.v1',
  () => ({}),
)

/** Saved settings merged with defaults, so settings added later get a value for existing users. */
export function loadSettings(): Settings {
  return { ...DEFAULTS, ...settingsStore.load() }
}

/**
 * Saves the choice and reloads, so only the chosen version's styles are on
 * the page (v1's stylesheet is global). Data is shared, nothing is lost.
 */
export function switchUiVersion(version: UiVersion): void {
  settingsStore.save({ ...loadSettings(), uiVersion: version })
  location.reload()
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  useEffect(() => {
    settingsStore.save(settings)
  }, [settings])

  const updateSettings = (patch: Partial<Settings>) =>
    setSettings((current) => ({ ...current, ...patch }))

  return [settings, updateSettings] as const
}
