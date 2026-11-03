import { useState } from 'react'
import {
  clampSetting,
  CONFIG_LIMITS,
  type PomodoroConfig,
} from '../../state/pomodoro.ts'
import { usePomodoro } from '../../state/usePomodoro.ts'
import { SketchInput } from '../sketch/SketchInput.tsx'
import { SettingsToggle } from './SettingsToggle.tsx'

type NumberKey = keyof typeof CONFIG_LIMITS

const FIELDS: { key: NumberKey; label: string; unit: string }[] = [
  { key: 'focusMin', label: 'Focus', unit: 'min' },
  { key: 'shortMin', label: 'Short break', unit: 'min' },
  { key: 'longMin', label: 'Long break', unit: 'min' },
  { key: 'longEvery', label: 'Long break after', unit: 'focus sessions' },
]

function NumberSetting({
  field,
  value,
  onCommit,
}: {
  field: (typeof FIELDS)[number]
  value: number
  onCommit: (value: number) => void
}) {
  // A draft, so the box can be cleared while typing; it's clamped on blur.
  const [draft, setDraft] = useState(String(value))
  const [min, max] = CONFIG_LIMITS[field.key]

  return (
    <label className="settings__number">
      <span>{field.label}</span>
      <SketchInput
        type="number"
        inputMode="numeric"
        aria-label={`${field.label} (${field.unit})`}
        min={min}
        max={max}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value)
          const parsed = Number(event.target.value)
          if (event.target.value !== '' && parsed >= min && parsed <= max)
            onCommit(Math.round(parsed))
        }}
        onBlur={() => {
          const clamped = clampSetting(field.key, Number(draft)) ?? value
          setDraft(String(clamped))
          onCommit(clamped)
        }}
      />
      <span className="settings__unit-label">{field.unit}</span>
    </label>
  )
}

/** Lengths, long-break rhythm, auto-start and sound. */
export function PomodoroSettings() {
  const { config, updateConfig } = usePomodoro()
  const set = (patch: Partial<PomodoroConfig>) => updateConfig(patch)

  return (
    <div className="settings__group">
      <div className="settings__numbers">
        {FIELDS.map((field) => (
          <NumberSetting
            key={field.key}
            field={field}
            value={config[field.key]}
            onCommit={(value) => set({ [field.key]: value })}
          />
        ))}
      </div>
      <SettingsToggle
        id="setting-pomodoro-auto"
        label="Start the next phase automatically"
        checked={config.autoStart}
        onChange={(autoStart) => set({ autoStart })}
      />
      <SettingsToggle
        id="setting-pomodoro-sound"
        label="Play a sound when a phase ends"
        checked={config.sound}
        onChange={(sound) => set({ sound })}
      />
      <p className="settings__hint">
        A running timer keeps its length; changes apply from the next phase (or
        straight away when it isn't running).
      </p>
    </div>
  )
}
