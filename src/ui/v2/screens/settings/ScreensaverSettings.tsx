import { Image as ImageIcon, Play } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Button } from '../../components/Button.tsx'
import { Card } from '../../components/Card.tsx'
import { Switch } from '../../components/Switch.tsx'
import { useAppSettings } from '../../state/appContext.ts'
import { useScreensaver } from '../../state/screensaver.ts'

const PosterPicker = lazy(() => import('../../screensaver/PosterPicker.tsx'))

const IDLE = [0, 1, 2, 5, 10, 15, 30]
const INTERVALS = [
  { sec: 15, label: '15 seconds' },
  { sec: 30, label: '30 seconds' },
  { sec: 60, label: '1 minute' },
  { sec: 120, label: '2 minutes' },
  { sec: 300, label: '5 minutes' },
]

/** When the framed-picture screensaver starts, which pictures it shows, and extras. */
export function ScreensaverSettings({ id }: { id: string }) {
  const { settings, update } = useAppSettings()
  const { start } = useScreensaver()

  return (
    <Card
      id={id}
      icon={<ImageIcon size={16} />}
      title="Screensaver"
      subtitle="A framed picture of your day on a sunlit wall"
      action={
        <Button
          variant="soft"
          size="sm"
          icon={<Play size={14} />}
          onClick={start}
        >
          Preview
        </Button>
      }
    >
      <div className="field-row">
        <div>
          <p className="field-row__label">Start after</p>
          <p className="field-row__hint">
            Without mouse or keyboard input. Never while a video plays.
          </p>
        </div>
        <select
          className="select"
          aria-label="Start the screensaver after"
          value={settings.screensaverIdleMin}
          onChange={(e) =>
            update({ screensaverIdleMin: Number(e.target.value) })
          }
        >
          {IDLE.map((m) => (
            <option key={m} value={m}>
              {m === 0
                ? 'Never (only by hand)'
                : `${m} ${m === 1 ? 'minute' : 'minutes'}`}
            </option>
          ))}
        </select>
      </div>
      <div className="field-row">
        <p className="field-row__label">Change picture every</p>
        <select
          className="select"
          aria-label="Change picture every"
          value={settings.screensaverIntervalSec}
          onChange={(e) =>
            update({ screensaverIntervalSec: Number(e.target.value) })
          }
        >
          {INTERVALS.map(({ sec, label }) => (
            <option key={sec} value={sec}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="field-row field-row--stack">
        <div>
          <p className="field-row__label">Pictures</p>
          <p className="field-row__hint">
            Built from your tasks, focus time, weight and quotes.
          </p>
        </div>
        <Suspense
          fallback={<div className="poster-picker poster-picker--loading" />}
        >
          <PosterPicker
            selected={settings.screensaverPosters}
            onChange={(screensaverPosters) => update({ screensaverPosters })}
          />
        </Suspense>
      </div>
      <Switch
        id="setting-saver-clock"
        label="Wall clock"
        checked={settings.screensaverClock}
        onChange={(screensaverClock) => update({ screensaverClock })}
      />
      <Switch
        id="setting-saver-wake"
        label="Keep the screen awake"
        hint={
          'wakeLock' in navigator
            ? 'Stops the display from sleeping while the screensaver shows.'
            : 'Not supported in this browser.'
        }
        checked={settings.screensaverWakeLock}
        disabled={!('wakeLock' in navigator)}
        onChange={(screensaverWakeLock) => update({ screensaverWakeLock })}
      />
    </Card>
  )
}
