import { Minus, Plus, Timer } from 'lucide-react'
import { motion } from 'motion/react'
import {
  clampSetting,
  CONFIG_LIMITS,
  type PomodoroConfig,
} from '../../../../state/pomodoro.ts'
import { usePomodoro } from '../../../../state/usePomodoro.ts'
import { IconButton } from '../../components/Button.tsx'
import { Card } from '../../components/Card.tsx'
import { Switch } from '../../components/Switch.tsx'

type NumberKey = keyof typeof CONFIG_LIMITS

const FIELDS: { key: NumberKey; label: string; unit: string; step: number }[] =
  [
    { key: 'focusMin', label: 'Focus', unit: 'min', step: 5 },
    { key: 'shortMin', label: 'Short break', unit: 'min', step: 1 },
    { key: 'longMin', label: 'Long break', unit: 'min', step: 5 },
    { key: 'longEvery', label: 'Long break after', unit: 'sessions', step: 1 },
  ]

/** Lengths with steppers, a preview of one cycle, auto-start and sound. */
export function PomodoroSettings({ id }: { id: string }) {
  const { config, updateConfig } = usePomodoro()
  const set = (patch: Partial<PomodoroConfig>) => updateConfig(patch)

  // One full cycle: focus/short pairs, the last break long.
  const cycle = Array.from({ length: config.longEvery }, (_, i) => [
    { kind: 'focus', min: config.focusMin, key: `f${i}` },
    i === config.longEvery - 1
      ? { kind: 'long', min: config.longMin, key: `l${i}` }
      : { kind: 'short', min: config.shortMin, key: `s${i}` },
  ]).flat()
  const total = cycle.reduce((s, p) => s + p.min, 0)

  return (
    <Card
      id={id}
      icon={<Timer size={16} />}
      title="Pomodoro"
      subtitle="Changes apply from the next phase"
    >
      <div className="steppers">
        {FIELDS.map((f) => {
          const [min, max] = CONFIG_LIMITS[f.key]
          const value = config[f.key]
          const commit = (v: number) =>
            set({ [f.key]: clampSetting(f.key, v) ?? value })
          return (
            <div key={f.key} className="stepper">
              <span className="stepper__label">{f.label}</span>
              <div className="stepper__control">
                <IconButton
                  label={`Less ${f.label.toLowerCase()}`}
                  size="sm"
                  variant="secondary"
                  onClick={() => commit(value - f.step)}
                  disabled={value <= min}
                >
                  <Minus size={14} />
                </IconButton>
                <input
                  className="stepper__input num"
                  type="number"
                  inputMode="numeric"
                  min={min}
                  max={max}
                  value={value}
                  aria-label={`${f.label} (${f.unit})`}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (e.target.value !== '' && n >= min && n <= max)
                      commit(Math.round(n))
                  }}
                />
                <IconButton
                  label={`More ${f.label.toLowerCase()}`}
                  size="sm"
                  variant="secondary"
                  onClick={() => commit(value + f.step)}
                  disabled={value >= max}
                >
                  <Plus size={14} />
                </IconButton>
              </div>
              <span className="stepper__unit">{f.unit}</span>
            </div>
          )
        })}
      </div>

      <div
        className="cycle-preview"
        aria-label={`One cycle takes ${total} minutes`}
      >
        <div className="cycle-preview__bar">
          {cycle.map((p) => (
            <motion.span
              key={p.key}
              layout
              className={`cycle-preview__seg cycle-preview__seg--${p.kind}`}
              style={{ flexGrow: p.min }}
              title={`${p.kind === 'focus' ? 'Focus' : p.kind === 'long' ? 'Long break' : 'Short break'} · ${p.min} min`}
              transition={{ type: 'spring', stiffness: 400, damping: 36 }}
            />
          ))}
        </div>
        <p className="subtle">
          One cycle:{' '}
          {Math.floor(total / 60) ? `${Math.floor(total / 60)}h ` : ''}
          {total % 60}m · {config.longEvery * config.focusMin} min of focus
        </p>
      </div>

      <Switch
        id="setting-pomodoro-auto"
        label="Start the next phase automatically"
        checked={config.autoStart}
        onChange={(autoStart) => set({ autoStart })}
      />
      <Switch
        id="setting-pomodoro-sound"
        label="Play a sound when a phase ends"
        checked={config.sound}
        onChange={(sound) => set({ sound })}
      />
    </Card>
  )
}
